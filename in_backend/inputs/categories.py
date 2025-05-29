from fastapi import APIRouter
import json
from pathlib import Path

input_router = APIRouter(prefix="/inputs", tags=["输入相关接口"])


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
