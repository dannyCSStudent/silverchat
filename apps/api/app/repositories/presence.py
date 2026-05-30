from app.db.supabase_client import supabase


class PresenceRepository:
    table = "user_presence"

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

    def upsert(self, payload: dict):
        result = (
            supabase.table(self.table)
            .upsert(payload, on_conflict="user_id")
            .execute()
            .data
        )
        return result[0] if result else None
