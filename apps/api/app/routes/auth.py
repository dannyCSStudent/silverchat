from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.repositories.profiles import ProfileRepository
from app.schemas.auth import AuthenticatedUser, SessionResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
profiles = ProfileRepository()


@router.get("/session", response_model=SessionResponse)
def get_session(user=Depends(get_current_user)):
    profile = profiles.get_by_user_id(user.id)
    return SessionResponse(
        user=AuthenticatedUser(
            id=user.id,
            email=getattr(user, "email", None),
            phone=getattr(user, "phone", None),
            email_confirmed_at=getattr(user, "email_confirmed_at", None),
        ),
        profile_exists=profile is not None,
        onboarding_complete=bool(profile and profile.get("onboarding_completed_at")),
    )
