from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


AdminRole = Literal["moderator", "lead", "admin"]


class AdminUserRecord(BaseModel):
    id: str
    username: str
    display_name: str | None = None
    role: AdminRole
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class AdminUserSummary(BaseModel):
    id: str
    username: str
    display_name: str | None = None
    role: AdminRole

    model_config = ConfigDict(extra="ignore")
