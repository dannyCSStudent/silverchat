from collections.abc import Sequence

from app.db.supabase_client import supabase


class AdminUserRepository:
    table = "admin_users"

    def list(self):
        return (
            supabase.table(self.table)
            .select("*")
            .order("username")
            .execute()
            .data
        )

    def list_active(self):
        return (
            supabase.table(self.table)
            .select("*")
            .eq("is_active", True)
            .order("username")
            .execute()
            .data
        )

    def get(self, admin_user_id: str):
        result = (
            supabase.table(self.table)
            .select("*")
            .eq("id", admin_user_id)
            .limit(1)
            .execute()
            .data
        )
        return result[0] if result else None

    def list_by_ids(self, admin_user_ids: Sequence[str]):
        if not admin_user_ids:
            return []

        return (
            supabase.table(self.table)
            .select("*")
            .in_("id", admin_user_ids)
            .execute()
            .data
        )

    def get_by_username(self, username: str):
        result = (
            supabase.table(self.table)
            .select("*")
            .eq("username", username)
            .limit(1)
            .execute()
            .data
        )
        return result[0] if result else None
