from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.repositories.profiles import ProfileRepository
from app.schemas.profiles import ProfileCreate, ProfileRecord, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["Profiles"])
profiles = ProfileRepository()


def is_eligible_age(date_of_birth: date) -> bool:
    today = date.today()
    years = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    return years >= 40


@router.get("/", response_model=list[ProfileRecord])
def list_profiles():
    return profiles.list()


@router.get("/me", response_model=ProfileRecord | None)
def get_my_profile(user=Depends(get_current_user)):
    return profiles.get_by_user_id(user.id)


@router.put("/me", response_model=ProfileRecord)
def create_my_profile(payload: ProfileCreate, user=Depends(get_current_user)):
    if not is_eligible_age(payload.date_of_birth):
        raise HTTPException(status_code=400, detail="SilverChat is currently for adults 40+.")

    return profiles.upsert({**payload.model_dump(), "user_id": user.id})


@router.patch("/me", response_model=ProfileRecord)
def update_my_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    existing = profiles.get_by_user_id(user.id)
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")

    merged = {**existing, **payload.model_dump(exclude_none=True), "user_id": user.id}
    if "date_of_birth" in merged and not is_eligible_age(date.fromisoformat(str(merged["date_of_birth"]))):
        raise HTTPException(status_code=400, detail="SilverChat is currently for adults 40+.")

    return profiles.upsert(merged)
