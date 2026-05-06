from fastapi import APIRouter
from app.db.supabase_client import supabase
from app.schemas.clients import ClientCreate, ClientRecord, ClientUpdate

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientRecord])
def get_clients():
    return supabase.table("clients").select("*").execute().data


@router.get("/{client_id}", response_model=ClientRecord | None)
def get_client(client_id: str):
    result = supabase.table("clients").select("*").eq("id", client_id).limit(1).execute().data
    return result[0] if result else None


@router.post("/", response_model=list[ClientRecord])
def create_client(client: ClientCreate):
    return supabase.table("clients").insert(client.model_dump()).execute().data


@router.patch("/{client_id}", response_model=list[ClientRecord])
def update_client(client_id: str, updates: ClientUpdate):
    return (
        supabase
        .table("clients")
        .update(updates.model_dump(exclude_none=True))
        .eq("id", client_id)
        .execute()
        .data
    )


@router.delete("/{client_id}")
def delete_client(client_id: str):
    supabase.table("clients").delete().eq("id", client_id).execute()
    return {"deleted": True, "client_id": client_id}
