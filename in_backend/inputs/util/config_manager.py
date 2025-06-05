from ..sys_config.config import get_config


class ConfigManager:
    """配置管理器，用于加载和保存配置"""

    def __init__(self):
        # 系统配置
        self.config = get_config()
        # 用户配置
        self.yaml_config = {}
        # 设置模型
        self.model = None

    def set_LLM(self, model):
        """设置当前使用的LLM模型"""
        if not model:
            raise ValueError("模型名称不能为空。")
        if model not in self.get_LLM_list():
            raise ValueError(f"模型 '{model}' 在配置中不可用。")
        self.model = model

    def get_LLM_list(self):
        """获取可用的LLM列表"""
        llm_list = list(self.get("LLM_API.available_models", {}).keys())
        if not llm_list:
            raise ValueError("在配置中找不到可用的LLM模型。")
        return llm_list

    def get_LLM_config(self):
        """获取LLM相关配置"""
        llm_config = self.get("LLM_API")
        if not llm_config:
            raise ValueError("在配置中找不到LLM配置。")
        return llm_config

    def get_model_config(self):
        """获取指定模型的配置"""
        llm_config = self.get_LLM_config().get("available_models", {})
        if not self.model or self.model not in self.get_LLM_list():
            raise ValueError(f"模型 '{self.model}' 在配置中不可用。")

        model_config = llm_config.get(self.model, {})
        if not model_config:
            raise ValueError(f"找不到模型 '{self.model}' 的配置。")

        return model_config

    def get(self, key_path: str, default=None):
        """获取配置值，支持点分隔的路径"""
        keys = key_path.split(".")

        # 优先从yaml配置中查找
        value = self.yaml_config
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                value = None
                break

        # 如果yaml中没有找到，则从config.py中查找
        if value is None:
            value = self.config
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return default

        return value

    def check_user_config(self):
        required_keys = [
            "available_models",
            "default_temperature",
            "default_max_tokens",
            "max_retries",
            "max_context_tokens",
        ]
        model_config_keys = [
            "default_model",
            "base_url",
            "API_KEY",
        ]
        try:
            LLM_config = self.get_LLM_config()
            for key in required_keys:
                if key not in LLM_config:
                    raise ValueError(f"缺少必要的配置项: {key}")
            model_list = self.get_LLM_list()
            for model in model_list:
                for key in model_config_keys:
                    if key not in LLM_config.get("available_models", {}).get(model, {}):
                        raise ValueError(f"模型 '{model}' 缺少必要的配置项: {key}")
            return {"status": "success", "message": "用户配置检查通过"}
        except ValueError as e:
            print(f"用户配置检查出错: {e}")
            return {"status": "error", "message": f"用户配置检查出错: {e}"}
