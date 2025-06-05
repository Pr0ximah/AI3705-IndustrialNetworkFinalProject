from fastapi import APIRouter

status_router = APIRouter(prefix="/status", tags=["API状态相关接口"])


@status_router.get("/")
async def check():
    """
    检查API状态
    """
    return {"status": "ok", "message": "API is running smoothly."}
