from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InterestRecord(BaseModel):
    id: str
    name: str
    category: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class UserInterestsUpdate(BaseModel):
    interest_ids: list[str] = Field(default_factory=list, max_length=12)


class UserInterestRecord(BaseModel):
    user_id: str
    interest_id: str
    created_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")
