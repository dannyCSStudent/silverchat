from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


MatchStatus = Literal["queued", "matched"]
MatchPool = Literal["preferred", "fallback", "queue"]


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


class MatchContext(BaseModel):
    reason: str
    shared_interests: list[str] = Field(default_factory=list)
    pool: Literal["preferred", "fallback"]
    top_shared_category: str | None = None
    top_shared_category_count: int | None = None
    top_shared_interest: str | None = None

    model_config = ConfigDict(extra="ignore")


class MatchJoinResponse(BaseModel):
    status: MatchStatus
    queue_entry: QueueEntryRecord | None = None
    session_id: str | None = None
    matched_profile: MatchedProfile | None = None
    match_context: MatchContext | None = None


class MatchSessionSummary(BaseModel):
    id: str
    status: str | None = None
    current_user_role: Literal["initiator", "recipient"] | None = None
    created_at: datetime | None = None
    ended_at: datetime | None = None
    other_profile: MatchedProfile | None = None

    model_config = ConfigDict(extra="ignore")


class MatchSessionDetailResponse(BaseModel):
    session: MatchSessionSummary
    current_user_role: Literal["initiator", "recipient"]


class MatchSessionActivityBucket(BaseModel):
    date: str
    count: int

    model_config = ConfigDict(extra="ignore")


class MatchSessionAnalyticsResponse(BaseModel):
    generated_at: datetime
    total_sessions: int
    initiated_count: int
    received_count: int
    matched_count: int
    ended_count: int
    average_length_minutes: int | None = None
    longest_length_minutes: int | None = None
    recent_activity: list[MatchSessionActivityBucket] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class MatchSessionAnalyticsExportResponse(BaseModel):
    generated_at: datetime
    filename: str
    csv: str

    model_config = ConfigDict(extra="ignore")


class QueueStatusResponse(BaseModel):
    queue_entry: QueueEntryRecord | None = None
    queue_position: int | None = None
    queue_size: int = 0
    members_ahead: int | None = None


class MatchPreviewResponse(BaseModel):
    generated_at: datetime
    available_candidates: int
    fallback_candidates: int
    preferred_candidates: int
    recommendation: str
    recommendation_reason: str
    recommended_pool: MatchPool
    top_shared_category: str | None = None
    top_shared_category_count: int | None = None
    top_shared_interest: str | None = None
    shared_interests: list[str] = Field(default_factory=list)


class MatchSessionsResponse(BaseModel):
    sessions: list[MatchSessionSummary] = Field(default_factory=list)
