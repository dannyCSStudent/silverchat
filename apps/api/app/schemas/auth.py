from datetime import datetime
from pydantic import BaseModel


class AuthenticatedUser(BaseModel):
    id: str
    email: str | None = None
    phone: str | None = None
    email_confirmed_at: datetime | None = None


class SessionResponse(BaseModel):
    user: AuthenticatedUser
    profile_exists: bool
    onboarding_complete: bool
