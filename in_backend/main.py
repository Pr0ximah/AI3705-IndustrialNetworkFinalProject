from contextlib import asynccontextmanager
from fastapi import FastAPI
from inputs import input_router
from outputs import output_router
from inputs.inputs import set_api_key, start_cleanup_task
import yaml
import sys
import os
import uvicorn
from fastapi.middleware.cors import CORSMiddleware


def resource_path(relative_path):
    """获取资源的绝对路径，适用于开发环境和PyInstaller打包后的环境"""
    if getattr(sys, "frozen", False):
        # 打包后的路径：使用可执行文件所在目录
        base_path = os.path.dirname(sys.executable)
    else:
        # 开发环境中的路径
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    await start_cleanup_task()
    yield
    # 关闭时执行
    # 可以添加清理资源的代码


def main():
    with open(resource_path("config.yaml"), "r", encoding="utf-8") as f:
        api_key = yaml.safe_load(f).get("API_KEY")
        if not api_key:
            raise ValueError("API_KEY not found in API_KEY.conf")
        set_api_key(api_key)

    origins = ["http://localhost:17990", "app://."]

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(input_router)
    app.include_router(output_router)

    uvicorn.run(app, host="127.0.0.1", port=17991, log_level="info")


if __name__ == "__main__":
    main()
