from collections.abc import Sequence

from app.db.supabase_client import supabase
from app.repositories._supabase import execute_with_retry


class ProfileRepository:
    table = "profiles"

    def list(self):
        return execute_with_retry(
            supabase.table(self.table).select("*").order("created_at", desc=True)
        ).data

    def get_by_user_id(self, user_id: str):
        result = execute_with_retry(
            supabase.table(self.table).select("*").eq("user_id", user_id).limit(1)
        ).data
        return result[0] if result else None

    def get_by_user_ids(self, user_ids: Sequence[str]):
        if not user_ids:
            return []

        return execute_with_retry(
            supabase.table(self.table).select("*").in_("user_id", user_ids)
        ).data

    def upsert(self, payload: dict):
        result = execute_with_retry(
            supabase.table(self.table).upsert(payload, on_conflict="user_id")
        ).data
        return result[0] if result else None
