from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid
from typing import Dict, Any
import asyncio
import yaml
from datetime import datetime, timedelta

from .util.LLM_interface import sse_generator, LLM_set_user_config, check_API_config

input_router = APIRouter(prefix="/inputs", tags=["输入相关接口"])

# 存储进行中的任务和SSE连接
active_connections = {}

# 定期清理过期连接的时间间隔（秒）
CLEANUP_INTERVAL = 1800  # 0.5小时
# 连接过期时间（秒）
CONNECTION_TIMEOUT = 600  # 10分钟

CONFIG_PATH = None


def set_config_path(config_path):
    global CONFIG_PATH
    CONFIG_PATH = config_path


def set_user_config():
    global CONFIG_PATH
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
        if not config:
            raise ValueError("找不到config.yaml文件或内容为空")
        LLM_set_user_config(config)


class ProjectConfig(BaseModel):
    """
    项目配置模型
    """

    conf: str


async def cleanup_expired_connections():
    """定期清理过期的连接"""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL)
        now = datetime.now()
        expired_ids = []

        for conn_id, conn_data in active_connections.items():
            if now - conn_data["created_at"] > timedelta(seconds=CONNECTION_TIMEOUT):
                expired_ids.append(conn_id)

        for conn_id in expired_ids:
            if conn_id in active_connections:
                del active_connections[conn_id]
                print(f"已清理过期连接: {conn_id}")


@input_router.get("/check_api_config")
async def check_api_config():
    """
    检查API配置是否正确
    """
    # 获取当前的API配置
    if not check_API_config():
        return {
            "status": "error",
            "message": "API配置不正确，请确保配置文件中包含所有需要设置的项",
        }
    return {"status": "success", "message": "API配置正确"}


@input_router.get("/refresh_api_config")
async def refresh_api_config():
    """
    刷新API配置
    """
    try:
        set_user_config()
        return {"status": "success", "message": "API配置已刷新"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"刷新API配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"刷新API配置失败: {e}")


@input_router.post("/create_project")
async def create_project(
    project_conf: Dict[str, Any] = Body(
        ...,
        example={
            "name": "transport0531",
            "description": "这是运输系统功能简述",
            "blocks": [{"name": "传送带", "description": "传送货物"}],
        },
    )
):
    """
    创建新项目 - 返回一个连接ID用于SSE监控
    """
    # 生成唯一连接ID
    connection_id = str(uuid.uuid4())

    active_connections[connection_id] = {
        "project_conf": project_conf["conf"],  # 使用实际提交的配置
        "connection_type": "project_creation",
    }

    # 返回连接ID
    return {
        "status": "success",
        "message": "项目创建成功，可以通过SSE连接监控进度",
        "connection_id": connection_id,
    }


@input_router.post("/get_ai_recommend")
async def get_ai_recommend(
    user_demand: Dict[str, Any] = Body(
        ...,
        example={
            "userInput": "我想创建一个运输系统，包含传送带、叉车等设备",
        },
    )
):
    """
    获取AI推荐的项目配置
    """
    # 生成唯一连接ID
    connection_id = str(uuid.uuid4())

    active_connections[connection_id] = {
        "user_demand": user_demand["userInput"],  # 使用实际提交的配置
        "connection_type": "AI_recommend",
    }

    # 返回连接ID
    return {
        "status": "success",
        "message": "AI推荐获取成功，可以通过SSE连接监控进度",
        "connection_id": connection_id,
    }


@input_router.get("/sse/{connection_id}")
async def sse_connection(connection_id: str):
    """
    通过连接ID建立SSE连接，监控项目创建进度
    """
    if connection_id not in active_connections:
        raise HTTPException(status_code=404, detail="连接ID无效或已过期")

    conn = active_connections[connection_id]
    try:
        if conn["connection_type"] == "project_creation":
            # 获取项目配置
            project_conf = conn["project_conf"]
            print(
                f"建立项目SSE连接成功，连接ID: {connection_id}, 项目配置: {project_conf}"
            )
            # 创建SSE流
            return StreamingResponse(
                sse_generator(project_conf, "LLM_generate_block_categories"),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream",
                    "X-Accel-Buffering": "no",
                },
            )
        if conn["connection_type"] == "AI_recommend":
            # 获取用户需求
            user_demand = conn["user_demand"]
            print(
                f"建立AI推荐SSE连接成功，连接ID: {connection_id}, 用户需求: {user_demand}"
            )
            # 创建SSE流
            return StreamingResponse(
                sse_generator(user_demand, "LLM_generate_AI_recommend"),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream",
                    "X-Accel-Buffering": "no",
                },
            )
    except Exception as e:
        return StreamingResponse(
            sse_generator(f"SSE连接创建错误: {e}", "send_single_message"),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
                "X-Accel-Buffering": "no",  # 对于Nginx
            },
        )


# 移除已弃用的on_event装饰器
# 定义清理过期连接的函数，将在主应用中调用
async def start_cleanup_task():
    """启动清理过期连接的任务"""
    asyncio.create_task(cleanup_expired_connections())
