from app.db.supabase_client import supabase


class InterestRepository:
    def list_interests(self):
        return supabase.table("interests").select("*").order("name").execute().data

    def list_user_interests(self, user_id: str):
        return (
            supabase.table("user_interests")
            .select("*")
            .eq("user_id", user_id)
            .execute()
            .data
        )

    def replace_user_interests(self, user_id: str, interest_ids: list[str]):
        supabase.table("user_interests").delete().eq("user_id", user_id).execute()
        if not interest_ids:
            return []

        payload = [{"user_id": user_id, "interest_id": interest_id} for interest_id in interest_ids]
        return supabase.table("user_interests").insert(payload).execute().data
