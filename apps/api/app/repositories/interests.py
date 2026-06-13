from app.db.supabase_client import supabase
from app.repositories._supabase import execute_with_retry


class InterestRepository:
    def list_interests(self):
        return execute_with_retry(supabase.table("interests").select("*").order("name")).data

    def list_user_interests(self, user_id: str):
        return execute_with_retry(
            supabase.table("user_interests").select("*").eq("user_id", user_id)
        ).data

    def replace_user_interests(self, user_id: str, interest_ids: list[str]):
        execute_with_retry(supabase.table("user_interests").delete().eq("user_id", user_id))
        if not interest_ids:
            return []

        payload = [{"user_id": user_id, "interest_id": interest_id} for interest_id in interest_ids]
        return execute_with_retry(supabase.table("user_interests").insert(payload)).data
