import aiohttp
import asyncio
import json
import os
import re
import time
from typing import Optional, Dict, Any, List
import logging
from dataclasses import dataclass, asdict


@dataclass
class ConversationMessage:
    """对话消息结构"""

    role: str  # "user", "assistant", "system"
    content: str
    timestamp: float = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class DeepSeekWithMemory:
    """
    带记忆功能的DeepSeek客户端
    通过维护对话历史来实现上下文记忆
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.deepseek.com/v1",
        default_model: str = "deepseek-chat",
        max_history_length: int = 10,  # 最大保留的对话轮数
        max_context_tokens: int = 6000,  # 估算的最大上下文token数
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model
        self.max_history_length = max_history_length
        self.max_context_tokens = max_context_tokens

        # 对话历史
        self.conversation_history: List[ConversationMessage] = []
        self.session = None

        # 设置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def add_system_message(self, content: str):
        """添加系统消息（用于设置角色和规则）"""
        message = ConversationMessage(role="system", content=content)
        self.conversation_history.append(message)
        self.logger.info("已添加系统消息")

    def clear_history(self):
        """清空对话历史"""
        self.conversation_history = []
        self.logger.info("对话历史已清空")

    def get_history_summary(self) -> str:
        """获取对话历史摘要"""
        if not self.conversation_history:
            return "暂无对话历史"

        summary = f"共有 {len(self.conversation_history)} 条消息:\n"
        for i, msg in enumerate(self.conversation_history):
            role_name = {"user": "用户", "assistant": "助手", "system": "系统"}
            summary += (
                f"{i+1}. [{role_name.get(msg.role, msg.role)}]: {msg.content[:50]}...\n"
            )
        return summary

    def _trim_history(self):
        """修剪历史记录，保持在限制范围内"""
        # 估算token数（粗略估算：1个中文字符约等于2个token）
        total_tokens = sum(len(msg.content) * 2 for msg in self.conversation_history)

        # 如果超出限制，从最早的消息开始删除（但保留系统消息）
        while (
            len(self.conversation_history) > self.max_history_length
            or total_tokens > self.max_context_tokens
        ) and len(self.conversation_history) > 1:

            # 找到第一个非系统消息并删除
            for i, msg in enumerate(self.conversation_history):
                if msg.role != "system":
                    removed_msg = self.conversation_history.pop(i)
                    total_tokens -= len(removed_msg.content) * 2
                    break
            else:
                # 如果只剩系统消息，删除最早的一条
                if len(self.conversation_history) > 1:
                    removed_msg = self.conversation_history.pop(0)
                    total_tokens -= len(removed_msg.content) * 2
                break

    def _build_messages_for_api(self, new_user_message: str) -> List[Dict]:
        """构建发送给API的消息列表"""
        # 先修剪历史
        self._trim_history()

        # 构建消息列表
        messages = []
        for msg in self.conversation_history:
            messages.append({"role": msg.role, "content": msg.content})

        # 添加新的用户消息
        messages.append({"role": "user", "content": new_user_message})

        return messages

    async def chat_with_memory(
        self,
        user_message: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs,
    ) -> str:
        """
        带记忆的对话功能
        """
        try:
            # 构建包含历史的消息列表
            messages = self._build_messages_for_api(user_message)

            # 调用API
            response = await self._call_api(messages, temperature, max_tokens, **kwargs)

            # 保存用户消息和助手回复到历史
            self.conversation_history.append(
                ConversationMessage(role="user", content=user_message)
            )
            self.conversation_history.append(
                ConversationMessage(role="assistant", content=response)
            )

            self.logger.info(
                f"对话完成，当前历史记录数: {len(self.conversation_history)}"
            )
            return response

        except Exception as e:
            self.logger.error(f"对话失败: {e}")
            raise e

    async def _call_api(
        self,
        messages: List[Dict],
        temperature: float,
        max_tokens: int,
        max_retries: int = 3,
        **kwargs,
    ) -> str:
        """调用DeepSeek API"""
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        data = {
            "model": self.default_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }

        if not self.session:
            self.session = aiohttp.ClientSession()

        for attempt in range(max_retries):
            try:
                async with self.session.post(
                    url, headers=headers, json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"].strip()
                        self.logger.info(
                            f"API调用成功 (尝试 {attempt + 1}/{max_retries})"
                        )
                        return content

                    elif response.status == 429:  # 频率限制
                        error_text = await response.text()
                        self.logger.warning(
                            f"频率限制 (尝试 {attempt + 1}/{max_retries})"
                        )
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2**attempt)
                            continue
                        else:
                            raise Exception(f"频率限制: {error_text}")

                    else:
                        error_text = await response.text()
                        raise Exception(
                            f"API调用失败 (状态码: {response.status}): {error_text}"
                        )

            except aiohttp.ClientError as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                else:
                    raise Exception(f"网络请求失败: {str(e)}")

    def save_conversation(self, filepath: str):
        """保存对话历史到文件"""
        try:
            conversation_data = {
                "timestamp": time.time(),
                "messages": [asdict(msg) for msg in self.conversation_history],
            }

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(conversation_data, f, ensure_ascii=False, indent=2)

            self.logger.info(f"对话历史已保存到: {filepath}")

        except Exception as e:
            self.logger.error(f"保存对话历史失败: {e}")
            raise e

    def load_conversation(self, filepath: str):
        """从文件加载对话历史"""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                conversation_data = json.load(f)

            self.conversation_history = []
            for msg_dict in conversation_data.get("messages", []):
                message = ConversationMessage(**msg_dict)
                self.conversation_history.append(message)

            self.logger.info(
                f"对话历史已从 {filepath} 加载，共 {len(self.conversation_history)} 条消息"
            )

        except Exception as e:
            self.logger.error(f"加载对话历史失败: {e}")
            raise e


# 专门用于你的设备配置任务的类
class DeviceConfigurationAssistant:
    """设备配置生成助手"""

    def __init__(self, api_key: str):
        self.client = DeepSeekWithMemory(api_key, max_history_length=15)

        # 设置系统提示
        system_prompt = """
你是一个专业的工业自动化设备配置专家。你的任务是帮助用户设计和生成设备配置。

工作流程：
1. 首先从自然语言中提取设备配置列表
2. 然后为每个设备生成详细的技术配置

请始终保持专业性，输出格式化的JSON配置，并确保配置的技术准确性。
在整个对话过程中，请记住之前讨论的所有设备信息。
"""
        self.client.add_system_message(system_prompt)

    async def __aenter__(self):
        await self.client.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.__aexit__(exc_type, exc_val, exc_tb)

    async def generate_device_list(self, prompt_1: str) -> str:
        """第一步：生成设备配置列表"""
        response = await self.client.chat_with_memory(
            user_message=prompt_1, temperature=0.3, max_tokens=1500
        )
        return response

    async def generate_device_detail(
        self, device_name: str, prompt_2_template: str
    ) -> str:
        """第二步：为单个设备生成详细配置"""
        detail_prompt = f"""
现在请为设备"{device_name}"生成详细配置。

{prompt_2_template}

重要：
1. 请基于我们之前讨论的设备列表中关于"{device_name}"的信息
2. 生成完整的JSON配置，包含所有必要字段
3. 确保配置与该设备的功能特性匹配
4. 只返回这一个设备的配置，不要包含其他设备

请直接返回JSON格式的配置：
"""

        response = await self.client.chat_with_memory(
            user_message=detail_prompt, temperature=0.2, max_tokens=3000
        )
        return response

    def get_conversation_summary(self) -> str:
        """获取对话摘要"""
        return self.client.get_history_summary()

    def save_session(self, filepath: str):
        """保存会话"""
        self.client.save_conversation(filepath)

    def load_session(self, filepath: str):
        """加载会话"""
        self.client.load_conversation(filepath)


def extract_and_parse_json(content: str) -> Dict | List:
    """
    从AI响应中提取并解析JSON内容
    """
    # 去除前后空白字符
    content = content.strip()

    # 方法1: 直接尝试解析（如果内容就是纯JSON）
    try:
        data = json.loads(content)
        print("✅ 直接解析成功")
        return data
    except json.JSONDecodeError:
        print("❌ 直接解析失败，尝试提取JSON内容...")

    # 方法2: 提取```json代码块中的内容
    json_match = re.search(r"```json\s*\n(.*?)\n```", content, re.DOTALL)
    if json_match:
        json_content = json_match.group(1).strip()
        try:
            data = json.loads(json_content)
            print("✅ 从代码块中提取JSON成功")
            return data
        except json.JSONDecodeError:
            print("❌ 代码块中的JSON格式有误")

    # 方法3: 查找数组或对象的JSON内容
    # 寻找以 [ 或 { 开始的内容
    start_idx = -1
    for i, char in enumerate(content):
        if char in ["{", "["]:
            start_idx = i
            break

    if start_idx == -1:
        raise ValueError("未找到有效的JSON内容")

    # 找到对应的结束位置
    bracket_count = 0
    start_bracket = content[start_idx]
    end_bracket = "}" if start_bracket == "{" else "]"
    end_idx = -1

    for i in range(start_idx, len(content)):
        char = content[i]
        if char == start_bracket:
            bracket_count += 1
        elif char == end_bracket:
            bracket_count -= 1
            if bracket_count == 0:
                end_idx = i
                break

    if end_idx == -1:
        raise ValueError("JSON格式不完整")

    json_content = content[start_idx : end_idx + 1]
    data = json.loads(json_content)
    print("✅ 提取JSON内容成功")
    return data


def save_response_as_json(response_content: str, json_file_path: str) -> bool:
    """
    直接将AI响应转换并保存为JSON文件
    """
    try:
        print(f"开始处理响应内容，长度: {len(response_content)} 字符")

        # 提取并解析JSON
        data = extract_and_parse_json(response_content)

        # 确保输出目录存在
        os.makedirs(
            os.path.dirname(json_file_path) if os.path.dirname(json_file_path) else ".",
            exist_ok=True,
        )

        # 保存为JSON文件
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✅ 成功保存到: {json_file_path}")

        # 显示转换结果统计
        if isinstance(data, list):
            print(f"📊 保存了 {len(data)} 个项目")
        elif isinstance(data, dict):
            print(f"📊 保存了包含 {len(data)} 个键的对象")

        return True

    except ValueError as e:
        print(f"❌ 内容提取错误: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ JSON解析错误: {e}")
        # 保存原始内容以便调试
        debug_file = json_file_path.replace(".json", "_debug.txt")
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(response_content)
        print(f"🔍 原始内容已保存到 {debug_file} 以便调试")
        return False
    except Exception as e:
        print(f"❌ 保存过程中发生错误: {e}")
        return False


def read_user_input(data) -> str:
    """
    从 input.json 中读取用户输入，格式化为 prompt 可读字符串。
    """
    prompt_parts = [f"系统名称：{data['name']}", f"系统描述：{data['description']}"]

    for block in data.get("blocks", []):
        block_name = block.get("name", "未命名模块")
        block_desc = block.get("description", "无描述")
        prompt_parts.append(f"模块：{block_name}，功能：{block_desc}")

    return "\n".join(prompt_parts)


# 使用示例
async def process_user_input(user_input, API_KEY):
    prompt = read_user_input(json.loads(user_input))

    # 你的提示词
    PROMPT_1 = """从自然语言中提取设备配置列表，我的需求如下：
    {prompt}；请根据需求生成设备配置列表。请注意，设备配置列表应包含每个设备的输入信号和输出信号，并且每个设备的输入信号应与其功能相关联，输出信号应表示设备执行的动作。
    
    我将给你一个示例，你的输出在格式上应当如下：
    #### 以下是示例 ####
根据下表列出已知的三个设备（输送机、移栽机和提升机），设计并实现一个设备组态，以完成物料传递流程。其中，每个设备都有相应驱动器驱动设备执行（输出信号）及传感器反馈物料运输状态（输入信号）。

设备               功能 
输送机     用于水平运输物料，负责将物料从一个工作站传送到另一个工作站 
移栽机     负责在生产线上转换物料方向，确保物料能够顺利进入下一道工序 
提升机     用于垂直运输，将物料从低处提升到高处，适应不同工作站的高度要求

请总结以上信息，为我生成一个如下的设备配置列表，包含每个设备的输入信号和输出信号。每个设备的输入信号应与其功能相关联，输出信号应表示设备执行的动作。

[
{{
    "device": "xxx", ### 设备名称要用英文，其他的用中文 ###
    "input_signal": "xxx",
    "output_signal": "xxx",
    "description": "xxx"
}},
...
]""".format(
        prompt=prompt
    )

    PROMPT_2_TEMPLATE = """利用之前生成的设备配置列表，进一步得到该设备的详细配置
请根据设备列表生成该设备的详细配置，包括输入输出信号、状态机、算法等。请使用JSON格式，确保设备的配置都包含必要的字段。
注意："type"只能是["int", "float", "bool", "string", "time"]中的一种，"description"字段应简洁明了。

你的回答应该按照如下的配置格式示例：
```json
{
"name": "Example Category",
  "var_input": [
    {
      "name": "inputVar1",
      "type": "int",
      "description": "An integer input variable"
    },
    {
      "name": "inputVar2",
      "type": "float",
      "description": "A float input variable"
    }
  ],
  "var_output": [
    {
      "name": "outputVar1",
      "type": "float",
      "description": "A float output variable"
    },
    {
      "name": "outputVar2",
      "type": "bool",
      "description": "A boolean output variable"
    }
  ],
  "signal_input": [
    {
      "name": "inputSignal1",
      "description": "An input signal"
    },
    {
      "name": "inputSignal2",
      "description": "Another input signal"
    }
  ],
  "signal_output": [
    {
      "name": "outputSignal1",
      "description": "An output signal"
    },
    {
      "name": "outputSignal2",
      "description": "Another output signal"
    }
  ],
  "InternalVars": [
    {
      "name": "IsRunning",
      "type": "bool",
      "InitalVaule": "FALSE",
      "description": "记录输送机当前运行状态"
    }
  ],
  "ECC": {
    "ECStates": [
      {
        "name": "Idle",
        "comment": "初始等待状态",
        "x": 50,
        "y": 50
      },
      {
        "name": "Running",
        "comment": "系统正在运行",
        "x": 200,
        "y": 50,
        "ecAction": {
          "algorithm": "RunProcess",
          "output": "outputSignal1"
        }
      },
      {
        "name": "Stopped",
        "comment": "系统停止状态",
        "x": 200,
        "y": 150,
        "ecAction": {
          "algorithm": "StopProcess",
          "output": "outputSignal2"
        }
      }
    ],
    "ECTransitions": [
      {
        "source": "Idle",
        "destination": "Running",
        "condition": "inputSignal1",
        "comment": "收到启动信号",
        "x": 125,
        "y": 30
      },
      {
        "source": "Running",
        "destination": "Stopped",
        "condition": "inputSignal2",
        "comment": "收到停止信号",
        "x": 225,
        "y": 100
      },
      {
        "source": "Stopped",
        "destination": "Idle",
        "condition": "TRUE",
        "comment": "系统重置返回初始",
        "x": 125,
        "y": 200
      }
    ]
  },
  "Algorithms": [
    {
      "Name": "RunConveyor",
      "Comment": "驱动电机使输送带运行",
      "Input": "Start, Stop, MaterialDetected",
      "Output": "MoveMaterial",
      "Code": "IF Start AND NOT MaterialDetected THEN\n    MoveMaterial := TRUE;\nELSIF Stop OR MaterialDetected THEN\n    MoveMaterial := FALSE;\nEND_IF;"
    }
  ]
}
```

注意：除了设备名称外，其他的字段都需要根据实际情况进行补充。"""

    async with DeviceConfigurationAssistant(API_KEY) as assistant:
        final_result = []
        try:
            # 第一步：生成设备列表
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "开始生成设备配置列表",
                        "progress": 10,
                        "next_progress": 30,
                    },
                    ensure_ascii=False,
                ),
            }
            device_list_response = await assistant.generate_device_list(PROMPT_1)

            # 将结果包装为JSON格式的事件
            print("send:设备列表响应内容:", device_list_response)
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "设备列表生成完成",
                        "progress": 30,
                        "next_progress": 40,
                    },
                    ensure_ascii=False,
                ),
            }

            # 解析设备列表
            devices = []
            try:
                device_data = extract_and_parse_json(device_list_response)
                if isinstance(device_data, list):
                    devices = [device["device"] for device in device_data]
                elif isinstance(device_data, dict) and "device" in device_data:
                    devices = [device_data["device"]]
                else:
                    raise ValueError("设备列表格式不正确")

                print("send:解析到的设备列表:", devices)
                yield {
                    "event": "status",
                    "data": json.dumps(
                        {
                            "message": f"解析到设备: {', '.join(devices)}",
                            "progress": 40,
                        },
                        ensure_ascii=False,
                    ),
                }
            except Exception as e:
                print(f"send:解析设备列表失败: {e}")
                yield {
                    "event": "error",
                    "data": json.dumps(
                        {"message": f"解析设备列表失败: {str(e)}"}, ensure_ascii=False
                    ),
                }

            # 第二步：为每个设备生成详细配置
            total_devices = len(devices)
            for idx, device in enumerate(devices):
                progress = 40 + int((idx / total_devices) * 50)  # 40%-90%的进度
                yield {
                    "event": "status",
                    "data": json.dumps(
                        {
                            "message": f"正在生成 {device} 的配置 ({idx+1}/{total_devices})",
                            "progress": progress,
                            "next_progress": progress + 10,
                        },
                        ensure_ascii=False,
                    ),
                }

                detail_response = await assistant.generate_device_detail(
                    device, PROMPT_2_TEMPLATE
                )
                device_config = extract_and_parse_json(detail_response)
                device_config["id"] = idx

                final_result.append(device_config)
                print(f"send:设备 {device} 的配置生成完成:", device_config)
                yield {
                    "event": "device_config",
                    "data": json.dumps(
                        {
                            "device": device,
                            "config": device_config,
                            "next_progress": progress + 20,
                        },
                        ensure_ascii=False,
                    ),
                }

            # 完成所有设备配置生成
            print("send:所有设备配置生成完成")
            yield {
                "event": "status",
                "data": json.dumps(
                    {"message": "所有设备配置生成完成", "progress": 100},
                    ensure_ascii=False,
                ),
            }

            # 最后一个事件，发送完整结果
            print("send:最终结果:", final_result)
            yield {
                "event": "complete",
                "data": json.dumps({"result": final_result}, ensure_ascii=False),
            }

        except Exception as e:
            print(f"send:生成过程中发生错误: {e}")
            error_msg = f"生成过程中发生错误: {str(e)}"
            yield {
                "event": "error",
                "data": json.dumps({"message": error_msg}, ensure_ascii=False),
            }


# 为FastAPI提供的格式化生成器函数
async def sse_generator(user_input, api_key):
    """
    将process_user_input的结果转换为SSE格式的生成器
    """
    async for event in process_user_input(user_input, api_key):
        if isinstance(event, dict):
            event_name = event.get("event", "message")
            event_data = event.get("data", "")
            yield f"event: {event_name}\ndata: {event_data}\n\n"
        else:
            # 如果event是字符串，将其作为message事件发送
            yield f"event: message\ndata: {json.dumps({'message': event}, ensure_ascii=False)}\n\n"


    # try:
    #     async for event in process_user_input(user_input, api_key):
    #         if isinstance(event, dict):
    #             event_name = event.get("event", "message")
    #             event_data = event.get("data", "")
    #             yield f"event: {event_name}\ndata: {event_data}\n\n"
    #         else:
    #             # 如果event是字符串，将其作为message事件发送
    #             yield f"event: message\ndata: {json.dumps({'message': event}, ensure_ascii=False)}\n\n"

    # except Exception as e:
    #     # 发送错误事件
    #     error_message = {"error": str(e)}
    #     yield f"event: error\ndata: {json.dumps(error_message, ensure_ascii=False)}\n\n"

    # finally:
    #     # 确保最后发送一个结束事件，通知前端关闭连接
    #     yield f"event: close\ndata: {json.dumps({'completed': True}, ensure_ascii=False)}\n\n"
