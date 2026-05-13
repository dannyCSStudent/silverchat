from fastapi import APIRouter, Depends

from app.core.auth import require_admin
from app.repositories.admin_users import AdminUserRepository
from app.schemas.admin_users import AdminUserRecord, AdminUserSummary

router = APIRouter(prefix="/admin-users", tags=["Admin Users"])
admin_users = AdminUserRepository()


@router.get("/", response_model=list[AdminUserSummary])
def list_admin_users(_admin=Depends(require_admin)):
    return [AdminUserSummary.model_validate(row) for row in admin_users.list_active()]


@router.get("/me", response_model=AdminUserRecord)
def get_my_admin_user(admin=Depends(require_admin)):
    return AdminUserRecord.model_validate(admin)
