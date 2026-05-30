from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.repositories.presence import PresenceRepository

router = APIRouter(prefix="/presence", tags=["Presence"])
presence = PresenceRepository()


class PresenceRecord(BaseModel):
    user_id: str
    status: str
    last_seen_at: datetime
    updated_at: datetime | None = None


class PresenceUpdate(BaseModel):
    status: str


@router.get("/me", response_model=PresenceRecord | None)
def get_my_presence(user=Depends(get_current_user)):
    return presence.get_by_user_id(user.id)


@router.put("/me", response_model=PresenceRecord)
def update_my_presence(payload: PresenceUpdate, user=Depends(get_current_user)):
    return presence.upsert(
        {
            "user_id": user.id,
            "status": payload.status,
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
        }
    )
