from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid
from typing import Dict, Any
import asyncio
from datetime import datetime, timedelta

from .util.LLM_interface import sse_generator, LLM_set_user_config

input_router = APIRouter(prefix="/inputs", tags=["输入相关接口"])

# 存储进行中的任务和SSE连接
# {connection_id: {"project_conf": {...}, "generator": generator, "created_at": datetime}}
active_connections = {}

# 定期清理过期连接的时间间隔（秒）
CLEANUP_INTERVAL = 1800  # 0.5小时
# 连接过期时间（秒）
CONNECTION_TIMEOUT = 600  # 10分钟


def set_user_config(user_config):
    """
    设置API密钥
    """
    LLM_set_user_config(user_config)


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

    # 将项目配置和创建时间存储在active_connections字典中
    active_connections[connection_id] = {
        "project_conf": project_conf["conf"],  # 使用实际提交的配置
        # "project_conf": test_input,  # 使用测试数据
        "created_at": datetime.now(),
    }

    # 返回连接ID
    return {
        "status": "success",
        "message": "项目创建成功，可以通过SSE连接监控进度",
        "connection_id": connection_id,
    }


@input_router.get("/sse/{connection_id}")
async def sse_connection(connection_id: str):
    """
    通过连接ID建立SSE连接，监控项目创建进度
    """
    if connection_id not in active_connections:
        raise HTTPException(status_code=404, detail="连接ID无效或已过期")

    # 获取项目配置
    project_conf = active_connections[connection_id]["project_conf"]
    print(f"建立SSE连接，连接ID: {connection_id}, 项目配置: {project_conf}")

    # 创建SSE流
    return StreamingResponse(
        sse_generator(project_conf),
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
