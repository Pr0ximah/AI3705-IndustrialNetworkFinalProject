from contextlib import asynccontextmanager
from fastapi import FastAPI
from inputs import input_router
from outputs import output_router
from inputs.inputs import set_api_key, start_cleanup_task
from pathlib import Path
import yaml
import uvicorn
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    await start_cleanup_task()
    yield
    # 关闭时执行
    # 可以添加清理资源的代码


def main():
    with open(Path(__file__).parent / "config.yaml", "r", encoding="utf-8") as f:
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
