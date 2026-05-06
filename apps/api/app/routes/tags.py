from fastapi import APIRouter

from app.db.supabase_client import supabase
from app.schemas.tags import TagCreate, TagRecord, TagUpdate

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("/", response_model=list[TagRecord])
def get_tags():
    return supabase.table("tags").select("*").order("name").execute().data


@router.post("/", response_model=list[TagRecord])
def create_tag(tag: TagCreate):
    return supabase.table("tags").insert(tag.model_dump()).execute().data


@router.patch("/{tag_id}", response_model=list[TagRecord])
def update_tag(tag_id: str, updates: TagUpdate):
    return (
        supabase
        .table("tags")
        .update(updates.model_dump(exclude_none=True))
        .eq("id", tag_id)
        .execute()
        .data
    )


@router.delete("/{tag_id}")
def delete_tag(tag_id: str):
    supabase.table("tags").delete().eq("id", tag_id).execute()
    return {"deleted": True, "tag_id": tag_id}
