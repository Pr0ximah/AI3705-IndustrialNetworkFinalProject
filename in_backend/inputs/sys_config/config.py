# 配置字典
CONFIG = {
    # 设备配置助手参数
    "device_assistant": {
        "max_history_length": 15,
        "temperature": {"device_list": 0.3, "device_detail": 0.2},
        "max_tokens": {"device_list": 1500, "device_detail": 3000},
    },
    # 进度配置
    "progress": {
        "device_list": {"start": 5, "end": 39, "estimate_time": 15},
        "device_parsing": {"progress": 40},
        "device_detail": {"start": 40, "end": 99, "estimate_time": 60},
        "completion": {"progress": 100},
        "start_ai_recommend": {"start": 0, "end": 100, "estimate_time": 20},
    },
    # 提示词模板
    "prompts": {
        "system_prompt": """
            你是一个专业的工业自动化设备配置专家。你的任务是帮助用户设计和生成设备配置。

            工作流程：
            1. 首先从自然语言中提取设备配置列表
            2. 然后为每个设备生成详细的技术配置

            请始终保持专业性，输出格式化的JSON配置，并确保配置的技术准确性。
            在整个对话过程中，请记住之前讨论的所有设备信息。
            """,
        "ai_recommend_template": """
            根据用户的需求，生成一个系统配置的JSON格式需求表，请注意，系统配置应包含系统名称、描述以及设备列表，每个设备应包含名称和功能描述；你的输出需要严格遵循以下定义的格式：

            **输出格式要求：**
            - 直接输出JSON，不要包含```json```代码块标记
            - 确保JSON语法完全正确，可直接被Python json.loads()解析

            {{
                "name": "系统名",
                "description": "这是系统的功能简述",
                "blocks": [
                    {{
                        "name": "设备名",
                        "description": "设备功能描述"
                    }},
                    ...
                ]
            }}

            用户的需求是：
            {prompt}
            """,
        "device_list_template": """
            从自然语言中提取设备配置列表，我的需求如下：
            {prompt}
            
            请根据需求生成设备配置列表。请注意，设备配置列表应包含每个设备的输入信号和输出信号，并且每个设备的输入信号应与其功能相关联，输出信号应表示设备执行的动作。

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
                    "device": "xxx", ### 语言要根据用户的输入决定，与用户的输入保持一致。例如：若输入为中文则你的输出也应为中文。 ###
                    "input_signal": "xxx",
                    "output_signal": "xxx",
                    "description": "xxx"
                }},
                ...
            ]
            """,
        "device_detail_template": """
            根据设备"{device}"生成详细的功能块配置。

            **重要约束条件：**
            1. 严格按照JSON格式输出，不允许添加任何格式化字符
            2. Code字段中的代码必须使用\\n表示换行，不允许使用实际换行符
            3. 所有字符串必须使用双引号，避免特殊字符
            4. type字段只能是: ["int", "float", "bool", "string", "time"]
            5. 除设备名称外，所有字段使用中文描述

            **输出格式要求：**
            - 直接输出JSON，不要包含```json```代码块标记
            - Code字段示例："IF condition THEN\\n    action := TRUE;\\nEND_IF;"
            - 确保JSON语法完全正确，可直接被Python json.loads()解析

            请为设备"{device}"生成如下格式的配置：

            {{
                "name": "{device}",
                "var_input": [
                    {{
                        "name": "输入变量名",
                        "type": "bool|int|float|string|time",
                        "description": "变量描述"
                    }}
                ],
                "var_output": [
                    {{
                        "name": "输出变量名", 
                        "type": "bool|int|float|string|time",
                        "description": "变量描述"
                    }}
                ],
                "signal_input": [
                    {{
                        "name": "输入信号名",
                        "description": "信号描述"
                    }}
                ],
                "signal_output": [
                    {{
                        "name": "输出信号名",
                        "description": "信号描述" 
                    }}
                ],
                "InternalVars": [
                    {{
                        "name": "内部变量名",
                        "type": "bool|int|float|string|time",
                        "InitalVaule": "初始值",
                        "description": "变量描述"
                    }}
                ],
                "ECC": {{
                    "ECStates": [
                        {{
                            "name": "状态名",
                            "comment": "状态描述",
                            "x": 50,
                            "y": 50,
                            "ecAction": {{
                                "algorithm": "算法名",
                                "output": "输出信号名"
                            }}
                        }}
                    ],
                    "ECTransitions": [
                        {{
                            "source": "源状态",
                            "destination": "目标状态", 
                            "condition": "转换条件",
                            "comment": "转换描述",
                            "x": 100,
                            "y": 100
                        }}
                    ]
                }},
                "Algorithms": [
                    {{
                        "Name": "算法名",
                        "Comment": "算法描述",
                        "Input": "输入参数",
                        "Output": "输出参数",
                        "Code": "算法代码使用\\\\n表示换行"
                    }}
                ]
            }}

            设备描述：{device}是一个工业设备，请根据其功能特点生成合理的配置。
            """,
    },
    # 数据类型约束
    "data_types": {"allowed_types": ["int", "float", "bool", "string", "time"]},
    # 日志配置
    "logging": {
        "level": "INFO",
        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    },
}


def get_config():
    """获取配置字典"""
    return CONFIG
