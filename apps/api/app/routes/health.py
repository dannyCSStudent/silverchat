from fastapi import APIRouter
from app.db.supabase_client import supabase

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check():
    return {"status": "ok"}


@router.get("/db")
def db_test():
    response = supabase.table("clients").select("*").limit(1).execute()
    return {"status": "ok", "sample_count": len(response.data or [])}
