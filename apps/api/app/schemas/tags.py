from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TagBase(BaseModel):
    name: str
    color: str


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class TagRecord(TagBase):
    id: str
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class ClientTagAssignmentCreate(BaseModel):
    client_id: str
    tag_id: str


class ClientTagAssignmentRecord(ClientTagAssignmentCreate):
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")
