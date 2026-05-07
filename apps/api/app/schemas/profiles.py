from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


AgeVerifiedStatus = Literal["pending", "self_attested", "verified", "rejected"]
ProfileStatus = Literal["pending", "active", "paused", "banned"]


class ProfileBase(BaseModel):
    display_name: str
    date_of_birth: date
    bio: str | None = None
    avatar_url: str | None = None
    country_code: str | None = None
    age_verified_status: AgeVerifiedStatus = "pending"
    profile_status: ProfileStatus = "pending"
    safety_notes: str | None = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    date_of_birth: date | None = None
    bio: str | None = None
    avatar_url: str | None = None
    country_code: str | None = None
    age_verified_status: AgeVerifiedStatus | None = None
    profile_status: ProfileStatus | None = None
    safety_notes: str | None = None
    onboarding_completed_at: datetime | None = None


class ProfileRecord(ProfileBase):
    user_id: str
    onboarding_completed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(extra="ignore")
