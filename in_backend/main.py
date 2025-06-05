from contextlib import asynccontextmanager
from fastapi import FastAPI
from inputs import input_router
from outputs import output_router
from status import status_router
from inputs.inputs import set_config_path, start_cleanup_task, set_user_config
import sys
from pathlib import Path
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import io


def set_UTF8():
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", line_buffering=True
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", line_buffering=True
    )
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")


def config_filepath():
    if getattr(sys, "frozen", False):
        # 打包后的路径：使用可执行文件所在目录
        config_path = Path(sys.executable).parent.parent / "config" / "config.yaml"
    else:
        # 开发环境中的路径
        config_path = Path.cwd() / "config.yaml"

    return config_path


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    await start_cleanup_task()
    yield
    # 关闭时执行
    # 可以添加清理资源的代码


def main():
    set_config_path(config_filepath())
    set_user_config()

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
    app.include_router(status_router)

    uvicorn.run(app, host="127.0.0.1", port=17991, log_level="info")


if __name__ == "__main__":
    set_UTF8()
    main()
