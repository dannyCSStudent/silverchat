from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


InteractionType = Literal["call", "email", "meeting", "note", "follow_up"]


class ClientActivityBase(BaseModel):
    interaction_type: InteractionType
    notes: str | None = None
    timestamp: datetime | None = None
    created_by: str | None = None


class ClientActivityCreate(ClientActivityBase):
    client_id: str
    
class ClientActivityCreate(BaseModel):
    client_id: str
    interaction_type: str
    notes: str
    timestamp: datetime | None = None

class ClientActivityUpdate(BaseModel):
    interaction_type: InteractionType | None = None
    notes: str | None = None
    timestamp: datetime | None = None


class ClientActivityRecord(ClientActivityBase):
    id: str
    client_id: str

    model_config = ConfigDict(extra="ignore")
