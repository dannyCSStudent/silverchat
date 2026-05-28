from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.repositories.interests import InterestRepository
from app.repositories.matchmaking import MatchQueueRepository
from app.repositories.moderation import BlockRepository
from app.repositories.profiles import ProfileRepository
from app.schemas.matchmaking import MatchContext, MatchJoinRequest, MatchJoinResponse, MatchedProfile

router = APIRouter(prefix="/match", tags=["Matchmaking"])
queue = MatchQueueRepository()
blocks = BlockRepository()
interests = InterestRepository()
profiles = ProfileRepository()


def _is_queue_eligible(user_id: str):
    profile = profiles.get_by_user_id(user_id)
    if not profile:
        return False

    has_profile_basics = bool(
        profile.get("display_name")
        and profile.get("date_of_birth")
        and profile.get("country_code")
    )
    has_interests = len(interests.list_user_interests(user_id)) > 0
    onboarding_complete = bool(profile.get("onboarding_completed_at"))

    return (
        has_profile_basics
        and has_interests
        and onboarding_complete
        and profile.get("profile_status") == "active"
    )


def _build_match_context(
    current_user_id: str,
    candidate_user_id: str,
    preferred_pool: bool,
    country_matched: bool,
) -> MatchContext:
    interest_name_by_id = {
        interest["id"]: interest["name"] for interest in interests.list_interests() if interest.get("id")
    }
    current_interest_ids = {
        item["interest_id"]
        for item in interests.list_user_interests(current_user_id)
        if item.get("interest_id")
    }
    candidate_interest_ids = {
        item["interest_id"]
        for item in interests.list_user_interests(candidate_user_id)
        if item.get("interest_id")
    }
    shared_interest_names = [
        interest_name_by_id.get(interest_id, interest_id)
        for interest_id in sorted(current_interest_ids.intersection(candidate_interest_ids))
    ]
    reason_parts = []
    if country_matched:
        reason_parts.append("same country")
    if shared_interest_names:
        reason_parts.append(
            f"{len(shared_interest_names)} shared interest{'' if len(shared_interest_names) == 1 else 's'}"
        )
    if not reason_parts:
        reason_parts.append("best available fallback")

    return MatchContext(
        reason=f"Matched because of {', '.join(reason_parts)}.",
        shared_interests=shared_interest_names,
        pool="preferred" if preferred_pool else "fallback",
    )


@router.post("/join", response_model=MatchJoinResponse)
def join_matchmaking(payload: MatchJoinRequest, user=Depends(get_current_user)):
    if not _is_queue_eligible(user.id):
        raise HTTPException(
            status_code=400,
            detail="Finish onboarding and activate the profile before joining matchmaking.",
        )

    blocked_user_ids = blocks.list_related_user_ids(user.id)
    current_profile = profiles.get_by_user_id(user.id)
    candidates = queue.list_available_candidates(user.id)

    preferred_candidates = []
    fallback_candidates = []

    for candidate in candidates:
        candidate_user_id = candidate["user_id"]
        if candidate_user_id in blocked_user_ids:
            continue

        candidate_profile = profiles.get_by_user_id(candidate_user_id)
        if not candidate_profile:
            continue

        if candidate_profile.get("profile_status") != "active":
            continue

        if not candidate_profile.get("onboarding_completed_at"):
            continue

        if payload.country_code and candidate.get("country_code") == payload.country_code:
            preferred_candidates.append((candidate, candidate_profile))
            continue

        if (
            not payload.country_code
            and current_profile
            and current_profile.get("country_code")
            and candidate.get("country_code") == current_profile.get("country_code")
        ):
            preferred_candidates.append((candidate, candidate_profile))
            continue

        fallback_candidates.append((candidate, candidate_profile))

    selected = (
        preferred_candidates[0]
        if preferred_candidates
        else (fallback_candidates[0] if fallback_candidates else None)
    )

    if not selected:
        queue_entry = queue.upsert_queue_entry(
            {
                "user_id": user.id,
                "country_code": payload.country_code or current_profile.get("country_code") if current_profile else None,
                "preferred_language": payload.preferred_language,
                "is_available": True,
                "last_active_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return MatchJoinResponse(status="queued", queue_entry=queue_entry)

    candidate, candidate_profile = selected
    session = queue.create_session(user.id, candidate["user_id"])
    queue.remove_from_queue(user.id)
    queue.remove_from_queue(candidate["user_id"])

    country_matched = bool(
        (
            payload.country_code
            and candidate.get("country_code") == payload.country_code
        )
        or (
            not payload.country_code
            and current_profile
            and current_profile.get("country_code")
            and candidate.get("country_code") == current_profile.get("country_code")
        )
    )
    preferred_pool = bool(preferred_candidates and candidate["user_id"] == preferred_candidates[0][0]["user_id"])

    return MatchJoinResponse(
        status="matched",
        session_id=session["id"] if session else None,
        matched_profile=MatchedProfile(
            user_id=candidate_profile["user_id"],
            display_name=candidate_profile["display_name"],
            avatar_url=candidate_profile.get("avatar_url"),
            country_code=candidate_profile.get("country_code"),
        ),
        match_context=_build_match_context(
            current_user_id=user.id,
            candidate_user_id=candidate["user_id"],
            preferred_pool=preferred_pool,
            country_matched=country_matched,
        ),
    )
