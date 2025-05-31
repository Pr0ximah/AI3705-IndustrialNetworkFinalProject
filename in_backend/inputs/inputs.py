from fastapi import APIRouter
from pydantic import BaseModel

input_router = APIRouter(prefix="/inputs", tags=["输入相关接口"])


class ProjectConfig(BaseModel):
    """
    项目配置模型
    """

    conf: str


@input_router.post("/create_project")
async def create_project(project_conf: ProjectConfig):
    """
    创建新项目
    """
    print("接收到的项目配置:", project_conf.conf)
    # 只读取并返回接收到的JSON数据
    return {
        "status": "success",
        "message": "成功接收项目配置",
        "project_conf": project_conf,
    }
