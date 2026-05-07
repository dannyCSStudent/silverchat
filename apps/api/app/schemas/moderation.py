from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


ReportReason = Literal["nudity", "harassment", "scam", "underage", "spam", "other"]
ReportStatus = Literal["open", "reviewing", "resolved", "dismissed"]


class ReportCreate(BaseModel):
    reported_user_id: str
    reason: ReportReason
    details: str | None = None
    evidence_storage_path: str | None = None
    session_id: str | None = None


class ReportRecord(ReportCreate):
    id: str
    reporter_user_id: str
    status: ReportStatus | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class ReportStatusUpdate(BaseModel):
    status: ReportStatus


class ModerationNoteCreate(BaseModel):
    note: str


class ModerationAssignmentUpdate(BaseModel):
    assignee: str | None = None


class ModerationProfileSummary(BaseModel):
    user_id: str
    display_name: str | None = None
    avatar_url: str | None = None
    country_code: str | None = None
    profile_status: str | None = None
    age_verified_status: str | None = None
    date_of_birth: date | None = None

    model_config = ConfigDict(extra="ignore")


class ModerationSessionSummary(BaseModel):
    id: str
    initiator_user_id: str
    recipient_user_id: str
    status: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class ModerationEventRecord(BaseModel):
    id: str
    actor_user_id: str | None = None
    subject_user_id: str | None = None
    event_type: str
    payload: dict
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class ModerationReportRecord(ReportRecord):
    reporter_profile: ModerationProfileSummary | None = None
    reported_profile: ModerationProfileSummary | None = None
    session: ModerationSessionSummary | None = None
    events: list[ModerationEventRecord] = []
    current_assignee: str | None = None


class BlockCreate(BaseModel):
    blocked_user_id: str
    reason: str | None = None


class BlockRecord(BlockCreate):
    id: str
    blocker_user_id: str
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class ModerationBlockRecord(BlockRecord):
    blocker_profile: ModerationProfileSummary | None = None
    blocked_profile: ModerationProfileSummary | None = None
