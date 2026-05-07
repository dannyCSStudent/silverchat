from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.repositories.interests import InterestRepository
from app.schemas.interests import InterestRecord, UserInterestRecord, UserInterestsUpdate

router = APIRouter(prefix="/interests", tags=["Interests"])
interests = InterestRepository()


@router.get("/", response_model=list[InterestRecord])
def list_interests():
    return interests.list_interests()


@router.get("/me", response_model=list[UserInterestRecord])
def list_my_interests(user=Depends(get_current_user)):
    return interests.list_user_interests(user.id)


@router.put("/me", response_model=list[UserInterestRecord])
def replace_my_interests(payload: UserInterestsUpdate, user=Depends(get_current_user)):
    return interests.replace_user_interests(user.id, payload.interest_ids)
