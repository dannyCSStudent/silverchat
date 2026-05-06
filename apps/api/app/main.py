from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.routes.activity import router as activity_router
from app.routes.client_tags import router as client_tags_router
from app.routes.health import router as health_router
from app.routes.clients import router as clients_router
from app.routes.tags import router as tags_router

app = FastAPI()

default_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
    "https://business-app-starter-template-web.vercel.app",
]

configured_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_allowed_origins or default_allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(activity_router)
app.include_router(client_tags_router)
app.include_router(clients_router)
app.include_router(health_router)
app.include_router(tags_router)
