from typing import Union
from fastapi import FastAPI
from inputs import input_router
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:17990",
]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(input_router)
