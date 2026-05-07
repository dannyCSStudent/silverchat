from fastapi import APIRouter, Depends

from app.core.auth import get_current_user, require_admin
from app.repositories.profiles import ProfileRepository
from app.repositories.moderation import BlockRepository
from app.schemas.moderation import BlockCreate, BlockRecord, ModerationBlockRecord, ModerationProfileSummary

router = APIRouter(prefix="/blocks", tags=["Blocks"])
blocks = BlockRepository()
profiles = ProfileRepository()


def _build_moderation_blocks(records: list[dict]):
    user_ids = {
        record["blocker_user_id"]
        for record in records
        if record.get("blocker_user_id")
    } | {
        record["blocked_user_id"]
        for record in records
        if record.get("blocked_user_id")
    }
    profile_rows = profiles.get_by_user_ids(list(user_ids))
    profile_map = {
        row["user_id"]: ModerationProfileSummary.model_validate(row)
        for row in profile_rows
    }

    return [
        ModerationBlockRecord(
            **record,
            blocker_profile=profile_map.get(record["blocker_user_id"]),
            blocked_profile=profile_map.get(record["blocked_user_id"]),
        )
        for record in records
    ]


@router.get("/", response_model=list[ModerationBlockRecord])
def list_blocks(_admin=Depends(require_admin)):
    return _build_moderation_blocks(blocks.list())


@router.get("/me", response_model=list[BlockRecord])
def list_my_blocks(user=Depends(get_current_user)):
    return blocks.list_for_user(user.id)


@router.post("/", response_model=BlockRecord)
def create_block(payload: BlockCreate, user=Depends(get_current_user)):
    return blocks.create({**payload.model_dump(), "blocker_user_id": user.id})
