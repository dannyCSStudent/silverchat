from fastapi import APIRouter, HTTPException
from postgrest.exceptions import APIError

from app.db.supabase_client import supabase
from app.schemas.tags import ClientTagAssignmentCreate, ClientTagAssignmentRecord

router = APIRouter(prefix="/client-tags", tags=["Client Tags"])


def is_missing_table_error(error: APIError) -> bool:
    return (
        getattr(error, "code", None) == "PGRST205"
        or "schema cache" in str(error).lower()
        or "client_tags" in str(error).lower()
    )


def raise_missing_table_http_error() -> None:
    raise HTTPException(
        status_code=503,
        detail="The Supabase table `client_tags` does not exist yet. Apply `apps/api/schema.sql` in Supabase first.",
    )


@router.get("/", response_model=list[ClientTagAssignmentRecord])
def get_client_tags():
    try:
        return supabase.table("client_tags").select("*").execute().data
    except APIError as error:
        if is_missing_table_error(error):
            raise_missing_table_http_error()
        raise


@router.post("/", response_model=list[ClientTagAssignmentRecord])
def create_client_tag(assignment: ClientTagAssignmentCreate):
    try:
        return supabase.table("client_tags").insert(assignment.model_dump()).execute().data
    except APIError as error:
        if is_missing_table_error(error):
            raise_missing_table_http_error()
        raise


@router.delete("/")
def delete_client_tag(client_id: str, tag_id: str):
    try:
        supabase.table("client_tags").delete().eq("client_id", client_id).eq("tag_id", tag_id).execute()
        return {"deleted": True, "client_id": client_id, "tag_id": tag_id}
    except APIError as error:
        if is_missing_table_error(error):
            raise_missing_table_http_error()
        raise
