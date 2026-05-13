from fastapi import APIRouter
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.db.supabase_client import supabase

router = APIRouter(prefix="/health", tags=["Health"])

REQUIRED_TABLES = [
    "profiles",
    "admin_users",
    "interests",
    "user_interests",
    "match_queue",
    "chat_sessions",
    "reports",
    "blocks",
    "verification_checks",
    "device_push_tokens",
    "user_presence",
    "moderation_events",
]


@router.get("")
def health_check():
    return {"status": "ok", "service": "silverchat-api"}


@router.get("/db")
def db_test():
    tables: dict[str, str] = {}
    missing_tables: list[str] = []

    for table in REQUIRED_TABLES:
        try:
            supabase.table(table).select("*").limit(1).execute()
            tables[table] = "ok"
        except APIError as exc:
            if getattr(exc, "code", None) == "PGRST205":
                tables[table] = "missing"
                missing_tables.append(table)
                continue
            raise

    if missing_tables:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "silverchat-api",
                "ready": False,
                "missing_tables": missing_tables,
                "tables": tables,
                "detail": "Apply apps/api/schema.sql to the connected Supabase project.",
            },
        )

    interests_response = supabase.table("interests").select("*").limit(1).execute()
    return {
        "status": "ok",
        "service": "silverchat-api",
        "ready": True,
        "missing_tables": [],
        "tables": tables,
        "sample_count": len(interests_response.data or []),
    }
