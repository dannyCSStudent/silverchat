from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.repositories.interests import InterestRepository
from app.repositories.matchmaking import MatchQueueRepository
from app.repositories.moderation import BlockRepository
from app.repositories.profiles import ProfileRepository
from app.schemas.matchmaking import (
    MatchContext,
    MatchJoinRequest,
    MatchJoinResponse,
    MatchSessionSummary,
    MatchSessionsResponse,
    MatchPreviewResponse,
    MatchedProfile,
    QueueStatusResponse,
)

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
    shared_interest_names: list[str],
    preferred_pool: bool,
    country_matched: bool,
) -> MatchContext:
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


def _rank_candidates(user_id: str, payload_country_code: str | None):
    current_profile = profiles.get_by_user_id(user_id)
    blocked_user_ids = blocks.list_related_user_ids(user_id)
    interests_by_id = {
        interest["id"]: {
            "category": interest.get("category"),
            "name": interest["name"],
        }
        for interest in interests.list_interests()
        if interest.get("id")
    }
    current_interest_ids = {
        item["interest_id"]
        for item in interests.list_user_interests(user_id)
        if item.get("interest_id")
    }
    ranked_candidates = []

    for index, candidate in enumerate(queue.list_available_candidates(user_id)):
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

        candidate_interest_ids = {
            item["interest_id"]
            for item in interests.list_user_interests(candidate_user_id)
            if item.get("interest_id")
        }
        shared_interest_records = [
            {
                "category": interests_by_id.get(interest_id, {}).get("category"),
                "name": interests_by_id.get(interest_id, {}).get("name", interest_id),
            }
            for interest_id in sorted(current_interest_ids.intersection(candidate_interest_ids))
        ]
        shared_interest_names = [item["name"] for item in shared_interest_records]
        shared_interest_categories = sorted(
            {
                item["category"]
                for item in shared_interest_records
                if item.get("category")
            }
        )
        category_counts = {
            category: sum(1 for item in shared_interest_records if item.get("category") == category)
            for category in shared_interest_categories
        }
        top_shared_category_count = max(category_counts.values(), default=0)
        country_matched = bool(
            (
                payload_country_code
                and candidate.get("country_code") == payload_country_code
            )
            or (
                not payload_country_code
                and current_profile
                and current_profile.get("country_code")
                and candidate.get("country_code") == current_profile.get("country_code")
            )
        )

        ranked_candidates.append(
            {
                "candidate": candidate,
                "candidate_profile": candidate_profile,
                "country_matched": country_matched,
                "score": (
                    1 if country_matched else 0,
                    top_shared_category_count,
                    len(shared_interest_names),
                    -index,
                ),
                "shared_interest_names": shared_interest_names,
                "shared_interest_records": shared_interest_records,
                "shared_interest_categories": shared_interest_categories,
            }
        )

    ranked_candidates.sort(key=lambda item: item["score"], reverse=True)
    return current_profile, ranked_candidates


@router.post("/join", response_model=MatchJoinResponse)
def join_matchmaking(payload: MatchJoinRequest, user=Depends(get_current_user)):
    if not _is_queue_eligible(user.id):
        raise HTTPException(
            status_code=400,
            detail="Finish onboarding and activate the profile before joining matchmaking.",
        )

    current_profile, ranked_candidates = _rank_candidates(user.id, payload.country_code)
    selected = ranked_candidates[0] if ranked_candidates else None

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

    candidate = selected["candidate"]
    candidate_profile = selected["candidate_profile"]
    shared_interest_names = selected["shared_interest_names"]
    session = queue.create_session(user.id, candidate["user_id"])
    queue.remove_from_queue(user.id)
    queue.remove_from_queue(candidate["user_id"])
    country_matched = bool(selected["country_matched"])
    preferred_pool = country_matched

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
            shared_interest_names=shared_interest_names,
            preferred_pool=preferred_pool,
            country_matched=country_matched,
        ),
    )


@router.get("/queue", response_model=QueueStatusResponse)
def get_queue_status(user=Depends(get_current_user)):
    queue_entry = queue.get_queue_entry(user.id)
    waiting_entries = queue.list_waiting_entries()
    current_index = next(
        (index for index, entry in enumerate(waiting_entries) if entry.get("user_id") == user.id),
        None,
    )
    queue_size = len(waiting_entries)
    return QueueStatusResponse(
        queue_entry=queue_entry,
        queue_position=(current_index + 1) if current_index is not None else None,
        queue_size=queue_size,
        members_ahead=current_index,
        recommended_pool="queue",
    )


@router.get("/sessions", response_model=MatchSessionsResponse)
def list_match_sessions(user=Depends(get_current_user)):
    session_rows = queue.list_user_sessions(user.id)
    other_user_ids = [
        row["recipient_user_id"] if row.get("initiator_user_id") == user.id else row["initiator_user_id"]
        for row in session_rows
        if row.get("initiator_user_id") and row.get("recipient_user_id")
    ]
    profile_rows = profiles.get_by_user_ids(other_user_ids)
    profile_map = {
        row["user_id"]: row
        for row in profile_rows
        if row.get("user_id")
    }

    return MatchSessionsResponse(
        sessions=[
            MatchSessionSummary(
                id=row["id"],
                status=row.get("status"),
                created_at=row.get("created_at"),
                ended_at=row.get("ended_at"),
                other_profile=(
                    MatchedProfile.model_validate(profile_map.get(
                        row["recipient_user_id"]
                        if row.get("initiator_user_id") == user.id
                        else row["initiator_user_id"]
                    ))
                    if profile_map.get(
                        row["recipient_user_id"]
                        if row.get("initiator_user_id") == user.id
                        else row["initiator_user_id"]
                    )
                    else None
                ),
            )
            for row in session_rows
        ],
    )


@router.get("/preview", response_model=MatchPreviewResponse)
def preview_matchmaking(user=Depends(get_current_user)):
    if not _is_queue_eligible(user.id):
        raise HTTPException(
            status_code=400,
            detail="Finish onboarding and activate the profile before previewing matchmaking.",
        )

    current_profile, ranked_candidates = _rank_candidates(user.id, None)
    preferred_candidates = [candidate for candidate in ranked_candidates if candidate["country_matched"]]
    fallback_candidates = [candidate for candidate in ranked_candidates if not candidate["country_matched"]]
    shared_interests = []
    top_shared_category = None
    top_shared_category_count = None
    top_shared_interest = None
    if ranked_candidates:
        shared_interests = ranked_candidates[0]["shared_interest_names"]
        shared_interest_records = ranked_candidates[0]["shared_interest_records"]
        shared_interest_categories = ranked_candidates[0]["shared_interest_categories"]
        if shared_interest_categories:
            category_counts = {
                category: sum(
                    1 for item in shared_interest_records if item.get("category") == category
                )
                for category in shared_interest_categories
            }
            top_shared_category, top_shared_category_count = max(
                category_counts.items(),
                key=lambda item: item[1],
            )
        if shared_interest_records:
            if top_shared_category:
                top_shared_interest = next(
                    (
                        item["name"]
                        for item in shared_interest_records
                        if item.get("category") == top_shared_category
                    ),
                    shared_interest_records[0]["name"],
                )
            else:
                top_shared_interest = shared_interest_records[0]["name"]

    if preferred_candidates:
        recommendation = "We should match you with same-country members first."
        recommendation_reason = "Same-country candidates are available, so they stay ahead of fallback matches."
        recommended_pool = "preferred"
    elif fallback_candidates:
        recommendation = "No same-country candidates are available right now, so we will use the best fallback."
        recommendation_reason = "Fallback candidates still share the strongest available interest signals."
        recommended_pool = "fallback"
    else:
        recommendation = "You are ready for matchmaking, but nobody is available right now."
        recommendation_reason = "The queue is empty, so you will wait for the next eligible member."
        recommended_pool = "queue"

    return MatchPreviewResponse(
        generated_at=datetime.now(timezone.utc),
        available_candidates=len(ranked_candidates),
        fallback_candidates=len(fallback_candidates),
        preferred_candidates=len(preferred_candidates),
        recommendation=recommendation,
        recommendation_reason=recommendation_reason,
        recommended_pool=recommended_pool,
        top_shared_category=top_shared_category,
        top_shared_category_count=top_shared_category_count,
        top_shared_interest=top_shared_interest,
        shared_interests=shared_interests,
    )
