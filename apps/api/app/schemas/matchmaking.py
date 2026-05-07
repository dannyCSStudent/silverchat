from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


MatchStatus = Literal["queued", "matched"]


class MatchJoinRequest(BaseModel):
    preferred_language: str | None = None
    country_code: str | None = None


class QueueEntryRecord(BaseModel):
    user_id: str
    queued_at: datetime | None = None
    last_active_at: datetime | None = None
    preferred_language: str | None = None
    country_code: str | None = None
    is_available: bool = True

    model_config = ConfigDict(extra="ignore")


class MatchedProfile(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None
    country_code: str | None = None

    model_config = ConfigDict(extra="ignore")


class MatchJoinResponse(BaseModel):
    status: MatchStatus
    queue_entry: QueueEntryRecord | None = None
    session_id: str | None = None
    matched_profile: MatchedProfile | None = None
