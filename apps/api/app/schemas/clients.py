from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


ClientStatus = Literal["lead", "active", "completed"]


class ClientBase(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    profile_image_url: str | None = None
    banner_image_url: str | None = None
    status: ClientStatus
    notes: str | None = None
    last_contacted_at: datetime | None = None
    owner_user_id: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    profile_image_url: str | None = None
    banner_image_url: str | None = None
    status: ClientStatus | None = None
    notes: str | None = None
    last_contacted_at: datetime | None = None
    owner_user_id: str | None = None


class ClientRecord(ClientBase):
    id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")
