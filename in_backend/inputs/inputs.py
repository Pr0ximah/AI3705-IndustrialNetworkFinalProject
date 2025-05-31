from fastapi import APIRouter
from pydantic import BaseModel
import json
from pathlib import Path

input_router = APIRouter(prefix="/inputs", tags=["输入相关接口"])


class ProjectConfig(BaseModel):
    """
    项目配置模型
    """

    conf: str


@input_router.get("/categories")
async def get_categories():
    """
    获取可用的功能块类别配置
    """
    categories_file = Path(__file__).parent / "categories.json"
    if not categories_file.exists():
        return {"error": "Categories file not found."}

    with open(categories_file, "r", encoding="utf-8") as f:
        categories = json.load(f)

    return {"categories": categories}


@input_router.post("/create_project")
async def create_project(project_conf: ProjectConfig):
    """
    创建新项目
    """
    # 只读取并返回接收到的JSON数据
    return {
        "status": "success",
        "message": "成功接收项目配置",
        "project_conf": project_conf,
    }
