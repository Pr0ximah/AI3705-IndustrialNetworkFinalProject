from fastapi import FastAPI
from inputs import input_router
from outputs import output_router
import uvicorn
from fastapi.middleware.cors import CORSMiddleware


def main():
    origins = ["http://localhost:17990", "app://."]

    app = FastAPI()
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
