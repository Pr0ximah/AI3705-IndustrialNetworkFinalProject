from fastapi import APIRouter
from pydantic import BaseModel
from .util import process_fbt, process_sys

output_router = APIRouter(prefix="/outputs", tags=["输出相关接口"])


class WorkspaceConf(BaseModel):
    """
    工作区配置模型
    """

    conf: str
    output_path: str


@output_router.post("/convert")
async def get_categories(workspace_conf: WorkspaceConf):
    """
    保存工作区配置
    """
    try:
        process_fbt(workspace_conf.conf, workspace_conf.output_path)
        process_sys(workspace_conf.conf, workspace_conf.output_path)
    except Exception as e:
        return {
            "success": False,
            "message": f"处理工作区配置时出错: {str(e)}",
        }
    return {
        "success": True,
        "message": "工作区配置处理成功",
    }
