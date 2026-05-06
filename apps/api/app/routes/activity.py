from uuid import UUID

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone


from app.db.supabase_client import supabase
from app.schemas.activity import (
    ClientActivityCreate,
    ClientActivityRecord,
    ClientActivityUpdate,
)

router = APIRouter(prefix="/activity", tags=["Activity"])


def is_valid_uuid(value: str) -> bool:
    try:
        UUID(value)
    except ValueError:
        return False

    return True


@router.get("/", response_model=list[ClientActivityRecord])
def get_activity():
    return (supabase
        .table("client_activity")
        .select("*")
        .order("timestamp", desc=True)
        .execute()
        .data
    )


@router.get("/client/{client_id}", response_model=list[ClientActivityRecord])
def get_client_activity(client_id: str):
    if not is_valid_uuid(client_id):
        raise HTTPException(status_code=400, detail="client_id must be a valid UUID")

    return (
        supabase
        .table("client_activity")
        .select("*")
        .eq("client_id", client_id)
        .order("timestamp", desc=True)
        .execute()
        .data
    )


@router.post("/", response_model=list[ClientActivityRecord])
def create_activity(activity: ClientActivityCreate):

    payload = activity.model_dump()

    if not payload.get("timestamp"):
        payload["timestamp"] = datetime.now(timezone.utc).isoformat()

    return (
        supabase
        .table("client_activity")
        .insert(payload)
        .execute()
        .data
    )

@router.patch("/{activity_id}", response_model=list[ClientActivityRecord])
def update_activity(activity_id: str, updates: ClientActivityUpdate):
    return (
        supabase
        .table("client_activity")
        .update(updates.model_dump(exclude_none=True))
        .eq("id", activity_id)
        .execute()
        .data
    )


@router.delete("/{activity_id}")
def delete_activity(activity_id: str):
    supabase.table("client_activity").delete().eq("id", activity_id).execute()
    return {"deleted": True, "activity_id": activity_id}
