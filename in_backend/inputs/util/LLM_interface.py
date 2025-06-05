import asyncio
import json
import os
import re
import time
from typing import Dict, List
import logging
import openai
from openai import AsyncOpenAI
from dataclasses import dataclass, asdict
from .config_manager import ConfigManager

config_manager = ConfigManager()


def LLM_set_user_config(user_config):
    global config_manager
    config_manager.yaml_config = user_config


def check_API_config():
    """
    检查API配置是否正确
    """
    global config_manager
    return config_manager.check_user_config()


def LLM_get_available_models():
    """
    获取可用的LLM模型列表
    """
    global config_manager
    return config_manager.get_LLM_list()


@dataclass
class ConversationMessage:
    """对话消息结构"""

    role: str  # "user", "assistant", "system"
    content: str
    timestamp: float = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class LLMWithMemory:
    """
    带记忆功能的LLM客户端
    通过维护对话历史来实现上下文记忆
    """

    def __init__(self):
        global config_manager
        self.config_manager = config_manager

        self.api_key = self.config_manager.get_model_config().get("API_KEY")
        self.base_url = self.config_manager.get_model_config().get("base_url")
        self.default_model = self.config_manager.get_model_config().get("default_model")
        self.max_history_length = self.config_manager.get(
            "LLM_API.max_history_length", 15
        )
        self.max_context_tokens = self.config_manager.get(
            "LLM_API.max_context_tokens", 6000
        )

        # 对话历史
        self.conversation_history: List[ConversationMessage] = []
        self.session = None

        # 设置OpenAI API密钥
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )
        self.client_extra_headers = self.config_manager.get_model_config().get(
            "extra_headers", {}
        )
        self.client_extra_body = self.config_manager.get_model_config().get(
            "extra_body", {}
        )
        self.client_extra_query = self.config_manager.get_model_config().get(
            "extra_query", {}
        )

        # 设置日志
        log_config = self.config_manager.get("logging", {})
        logging.basicConfig(
            level=getattr(logging, log_config.get("level", "INFO")),
            format=log_config.get(
                "format", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            ),
        )
        self.logger = logging.getLogger(__name__)

        self.logger.info(
            f"LLM客户端初始化完成 - 模型: {self.default_model}, 基础URL: {self.base_url}"
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if hasattr(self.client, "close"):
            await self.client.close()

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
        temperature: float = None,
        max_tokens: int = None,
    ) -> str:
        """
        带记忆的对话功能
        """
        try:
            # 设置默认参数
            temperature = temperature or self.config_manager.get(
                "LLM_API.default_temperature", 0.7
            )
            max_tokens = max_tokens or self.config_manager.get(
                "LLM_API.default_max_tokens", 2000
            )

            # 构建包含历史的消息列表
            messages = self._build_messages_for_api(user_message)

            # 调用API
            response = await self._call_api(messages, temperature, max_tokens)

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
        max_retries: int = None,
    ) -> str:
        """调用LLM API"""
        max_retries = max_retries or self.config_manager.get("LLM_API.max_retries", 3)

        for attempt in range(max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=self.default_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    extra_headers=self.client_extra_headers,
                    extra_body=self.client_extra_body,
                    extra_query=self.client_extra_query,
                )

                content = response.choices[0].message.content.strip()
                self.logger.info(f"API调用成功，响应内容长度: {len(content)} 字符")
                return content

            except openai.RateLimitError as e:
                self.logger.warning(
                    f"频率限制 (尝试 {attempt + 1}/{max_retries}): {str(e)}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(2**attempt)
                    continue
                else:
                    raise Exception(f"频率限制: {str(e)}")

            except openai.APIError as e:
                self.logger.error(
                    f"API错误 (尝试 {attempt + 1}/{max_retries}): {str(e)}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                else:
                    raise Exception(f"API调用失败: {str(e)}")

            except Exception as e:
                self.logger.error(
                    f"未知错误 (尝试 {attempt + 1}/{max_retries}): {str(e)}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                else:
                    raise Exception(f"API调用失败: {str(e)}")

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

    def __init__(self, model: str = None):
        global config_manager
        self.config_manager = config_manager
        config_manager.set_LLM(model)

        self.client = LLMWithMemory()

        # 设置系统提示
        system_prompt = self.config_manager.get("prompts.system_prompt")
        self.client.add_system_message(system_prompt)

    async def __aenter__(self):
        await self.client.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.__aexit__(exc_type, exc_val, exc_tb)

    async def generate_device_list(self, prompt_1: str) -> str:
        """第一步：生成设备配置列表"""
        temperature = self.config_manager.get(
            "device_assistant.temperature.device_list"
        )
        max_tokens = self.config_manager.get("device_assistant.max_tokens.device_list")

        response = await self.client.chat_with_memory(
            user_message=prompt_1, temperature=temperature, max_tokens=max_tokens
        )
        return response

    async def generate_device_detail(
        self, device_name: str, prompt_2_template: str
    ) -> str:
        """第二步：为单个设备生成详细配置"""
        temperature = self.config_manager.get(
            "device_assistant.temperature.device_detail"
        )
        max_tokens = self.config_manager.get(
            "device_assistant.max_tokens.device_detail"
        )

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
            user_message=detail_prompt, temperature=temperature, max_tokens=max_tokens
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


async def LLM_generate_block_categories(config_manager, user_input, model):
    user_input = json.loads(user_input)

    prompt_parts = [
        f"系统名称：{user_input['name']}",
        f"系统描述：{user_input['description']}",
    ]

    for block in user_input.get("blocks", []):
        block_name = block.get("name", "未命名模块")
        block_desc = block.get("description", "无描述")
        prompt_parts.append(f"模块：{block_name}，功能：{block_desc}")

    user_prompt = "\n".join(prompt_parts)

    # 生成设备配置列表的提示词
    device_list_template = config_manager.get("prompts.device_list_template")
    device_detail_template = config_manager.get("prompts.device_detail_template")

    # 你的提示词
    PROMPT_1 = device_list_template.format(prompt=user_prompt)

    async with DeviceConfigurationAssistant(model) as assistant:
        final_result = []
        try:
            # 第一步：生成设备列表
            progress_config = config_manager.get("progress.device_list")
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "开始生成设备配置列表...",
                        "progress": progress_config["start"],
                        "next_progress": progress_config["end"],
                        "estimate_time": progress_config["estimate_time"],
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
                        "message": "设备列表生成完成 ✅",
                        "progress": progress_config["end"],
                        "replace": True,
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

                parsing_progress = progress_config.get(
                    "progress.device_parsing.progress"
                )  # 解析进度增加10%
                print("send:解析到的设备列表:", devices)
                yield {
                    "event": "status",
                    "data": json.dumps(
                        {
                            "message": f"解析到设备: {', '.join(devices)} ✅",
                            "progress": parsing_progress,
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
            detail_progress = config_manager.get("progress.device_detail")
            total_devices = len(devices)
            for idx, device in enumerate(devices):
                progress = detail_progress["start"] + int(
                    (idx / total_devices)
                    * (detail_progress["end"] - detail_progress["start"])
                )
                next_progress = detail_progress["start"] + int(
                    ((idx + 1) / total_devices)
                    * (detail_progress["end"] - detail_progress["start"])
                )

                yield {
                    "event": "status",
                    "data": json.dumps(
                        {
                            "message": f"({idx+1}/{total_devices})  正在生成 {device} 的配置...",
                            "progress": progress,
                            "next_progress": next_progress,
                            "estimate_time": detail_progress["estimate_time"],
                        },
                        ensure_ascii=False,
                    ),
                }

                detail_response = await assistant.generate_device_detail(
                    device, device_detail_template
                )
                device_config = extract_and_parse_json(detail_response)
                device_config["id"] = idx

                final_result.append(device_config)
                print(f"send:设备 {device} 的配置生成完成✅:", device_config)
                yield {
                    "event": "status",
                    "data": json.dumps(
                        {
                            "message": f"({idx+1}/{total_devices})  {device} 配置生成完成 ✅",
                            # "progress": progress,
                            "progress": next_progress,
                            "replace": True,
                        },
                        ensure_ascii=False,
                    ),
                }

            # 完成所有设备配置生成
            completion_progress = config_manager.get("progress.completion.progress")
            print("send:所有设备配置生成完成")
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "所有设备配置生成完成 ✅",
                        "progress": completion_progress,
                    },
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
            raise Exception(error_msg)


async def LLM_generate_AI_recommend(config_manager, user_input):
    user_input = json.loads(user_input)

    # 构建AI推荐的提示词
    prompt_parts = [
        f"系统名称：{user_input['name']}",
        f"系统描述：{user_input['description']}",
    ]

    # 添加已有的模块信息
    for block in user_input.get("blocks", []):
        block_name = block.get("name", "未命名模块")
        block_desc = block.get("description", "无描述")
        prompt_parts.append(f"现有模块：{block_name}，功能：{block_desc}")

    # 添加用户的具体需求或问题
    if user_input.get("requirements"):
        prompt_parts.append(f"用户需求：{user_input['requirements']}")

    user_prompt = "\n".join(prompt_parts)

    # 获取AI推荐的提示词模板
    ai_recommend_template = config_manager.get("prompts.ai_recommend_template", 
        "基于以下系统信息，请提供AI驱动的优化建议和推荐方案：\n{prompt}\n\n请提供具体的改进建议、技术推荐和实施方案。")

    # 构建完整的提示词
    PROMPT_AI_RECOMMEND = ai_recommend_template.format(prompt=user_prompt)

    async with DeviceConfigurationAssistant() as assistant:
        try:
            # 开始生成AI推荐
            progress_config = config_manager.get("progress.ai_recommend", {
                "start": 70,
                "end": 90,
                "estimate_time": 15
            })
            
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "开始生成AI智能推荐...",
                        "progress": progress_config["start"],
                        "next_progress": progress_config["end"],
                        "estimate_time": progress_config["estimate_time"],
                    },
                    ensure_ascii=False,
                ),
            }

            # 生成AI推荐
            ai_recommend_response = await assistant.client.chat_with_memory(
                user_message=PROMPT_AI_RECOMMEND,
                temperature=config_manager.get("device_assistant.temperature.ai_recommend", 0.8),
                max_tokens=config_manager.get("device_assistant.max_tokens.ai_recommend", 3000)
            )

            print("send:AI推荐响应内容:", ai_recommend_response)
            
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "AI推荐生成完成 ✅",
                        "progress": progress_config["end"],
                        "replace": True,
                    },
                    ensure_ascii=False,
                ),
            }

            # 尝试解析结构化的推荐内容
            try:
                # 尝试提取JSON格式的推荐（如果AI返回的是结构化数据）
                recommendation_data = extract_and_parse_json(ai_recommend_response)
                final_result = {
                    "type": "structured",
                    "recommendations": recommendation_data
                }
            except:
                # 如果不是JSON格式，则作为文本推荐处理
                final_result = {
                    "type": "text",
                    "content": ai_recommend_response,
                    "recommendations": []
                }

            # 完成推荐生成
            completion_progress = config_manager.get("progress.ai_recommend_completion", {
                "progress": 95
            })
            
            print("send:AI推荐生成完成")
            yield {
                "event": "status",
                "data": json.dumps(
                    {
                        "message": "AI智能推荐完成 ✅",
                        "progress": completion_progress.get("progress", 95),
                    },
                    ensure_ascii=False,
                ),
            }

            # 发送最终结果
            print("send:AI推荐结果:", final_result)
            yield {
                "event": "complete",
                "data": json.dumps({"result": final_result}, ensure_ascii=False),
            }

        except Exception as e:
            print(f"send:AI推荐生成过程中发生错误: {e}")
            error_msg = f"AI推荐生成过程中发生错误: {str(e)}"
            raise Exception(error_msg)


async def send_single_message(_, data, *args, **kwargs):
    yield {
        "event": "error",
        "data": json.dumps({"message": f"{data}"}, ensure_ascii=False),
    }


async def process_user_input(data, function_name, model):
    global config_manager
    try:
        async for event in eval(function_name)(config_manager, data, model):
            yield event
    except TypeError as e:
        print(f"send:处理函数 {function_name} 时发生错误: {e}")
        yield {
            "event": "error",
            "data": json.dumps(
                {"message": f"处理函数 {function_name} 时发生错误 {e}"},
                ensure_ascii=False,
            ),
        }


# 为FastAPI提供的格式化生成器函数p
async def sse_generator(data, function_name, model=None):
    """
    将处理的结果转换为SSE格式的生成器
    """
    try:
        async for event in process_user_input(data, function_name, model):
            if isinstance(event, dict):
                event_name = event.get("event", "message")
                event_data = event.get("data", "")
                yield f"event: {event_name}\ndata: {event_data}\n\n"
            else:
                # 如果event是字符串，将其作为message事件发送
                yield f"event: message\ndata: {json.dumps({'message': event}, ensure_ascii=False)}\n\n"

        # 发送结束信号，让客户端主动断开连接
        yield f"event: close\ndata: {json.dumps({'message': 'SSE连接结束'}, ensure_ascii=False)}\n\n"

    except Exception as e:
        # 发生错误时也发送结束信号
        yield f"event: error\ndata: {json.dumps({'message': f'SSE连接错误: {str(e)}'}, ensure_ascii=False)}\n\n"
        yield f"event: close\ndata: {json.dumps({'message': 'SSE连接终止'}, ensure_ascii=False)}\n\n"
