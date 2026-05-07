from secrets import compare_digest

from fastapi import Header, HTTPException

from app.core.config import ADMIN_API_TOKEN
from app.db.supabase_client import supabase


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Expected Bearer token")

    response = supabase.auth.get_user(token)
    user = getattr(response, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


def require_admin(x_admin_token: str | None = Header(default=None)):
    if not ADMIN_API_TOKEN:
        raise HTTPException(status_code=503, detail="ADMIN_API_TOKEN is not configured")

    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Token header")

    if not compare_digest(x_admin_token, ADMIN_API_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid admin token")

    return True
