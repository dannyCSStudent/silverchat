import os

from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.routes.auth import router as auth_router
from app.routes.admin_users import router as admin_users_router
from app.routes.blocks import router as blocks_router
from app.routes.health import router as health_router
from app.routes.interests import router as interests_router
from app.routes.matchmaking import router as matchmaking_router
from app.routes.presence import router as presence_router
from app.routes.profiles import router as profiles_router
from app.routes.reports import router as reports_router

app = FastAPI(title="SilverChat API")

default_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
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


@app.exception_handler(APIError)
async def handle_supabase_api_error(_request: Request, exc: APIError):
    code = getattr(exc, "code", None)
    message = getattr(exc, "message", str(exc))

    if code == "PGRST205":
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Supabase schema is not ready. Apply apps/api/schema.sql to the connected "
                    "database, then retry."
                )
            },
        )

    return JSONResponse(status_code=502, content={"detail": message})

app.include_router(auth_router)
app.include_router(admin_users_router)
app.include_router(blocks_router)
app.include_router(health_router)
app.include_router(interests_router)
app.include_router(matchmaking_router)
app.include_router(presence_router)
app.include_router(profiles_router)
app.include_router(reports_router)
