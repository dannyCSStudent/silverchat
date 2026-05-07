from collections.abc import Sequence

from app.db.supabase_client import supabase


class ProfileRepository:
    table = "profiles"

    def list(self):
        return supabase.table(self.table).select("*").order("created_at", desc=True).execute().data

    def get_by_user_id(self, user_id: str):
        result = (
            supabase.table(self.table)
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        return result[0] if result else None

    def get_by_user_ids(self, user_ids: Sequence[str]):
        if not user_ids:
            return []

        return (
            supabase.table(self.table)
            .select("*")
            .in_("user_id", user_ids)
            .execute()
            .data
        )

    def upsert(self, payload: dict):
        result = supabase.table(self.table).upsert(payload, on_conflict="user_id").execute().data
        return result[0] if result else None
