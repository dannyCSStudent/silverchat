from secrets import compare_digest

from fastapi import Header, HTTPException

from app.core.config import ADMIN_API_TOKEN
from app.db.supabase_client import supabase
from app.repositories.admin_users import AdminUserRepository

admin_users = AdminUserRepository()
ADMIN_ROLE_ORDER = {
    "moderator": 1,
    "lead": 2,
    "admin": 3,
}


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Expected Bearer token")

    return get_user_from_access_token(token)


def get_user_from_access_token(token: str):
    response = supabase.auth.get_user(token)
    user = getattr(response, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


def require_admin(
    x_admin_token: str | None = Header(default=None),
    x_admin_username: str | None = Header(default=None),
):
    if not ADMIN_API_TOKEN:
        raise HTTPException(status_code=503, detail="ADMIN_API_TOKEN is not configured")

    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Token header")

    if not compare_digest(x_admin_token, ADMIN_API_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid admin token")

    if not x_admin_username:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Username header")

    admin_user = admin_users.get_by_username(x_admin_username)
    if not admin_user or not admin_user.get("is_active", False):
        raise HTTPException(status_code=403, detail="Admin user is not active")

    return admin_user


def ensure_admin_role(admin: dict, minimum_role: str):
    current_role = str(admin.get("role") or "")
    if ADMIN_ROLE_ORDER.get(current_role, 0) < ADMIN_ROLE_ORDER.get(minimum_role, 0):
        raise HTTPException(
            status_code=403,
            detail=f"{minimum_role.title()} role required for this moderation action",
        )
