from ..sys_config.config import get_config

class ConfigManager:
    """配置管理器，用于加载和保存配置"""

    def __init__(self):
        # 系统配置
        self.config = get_config()
        # 用户配置
        self.yaml_config = {}

    def get_LLM_config(self):
        """获取LLM相关配置"""
        llm_config = self.get("LLM_API")
        if not llm_config:
            raise ValueError("LLM configuration not found in config.")
        return llm_config

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
