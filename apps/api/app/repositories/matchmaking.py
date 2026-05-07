from app.db.supabase_client import supabase


class MatchQueueRepository:
    queue_table = "match_queue"
    sessions_table = "chat_sessions"

    def get_queue_entry(self, user_id: str):
        result = (
            supabase.table(self.queue_table)
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        return result[0] if result else None

    def list_available_candidates(self, user_id: str):
        return (
            supabase.table(self.queue_table)
            .select("*")
            .eq("is_available", True)
            .neq("user_id", user_id)
            .order("queued_at")
            .execute()
            .data
        )

    def upsert_queue_entry(self, payload: dict):
        result = (
            supabase.table(self.queue_table)
            .upsert(payload, on_conflict="user_id")
            .execute()
            .data
        )
        return result[0] if result else None

    def remove_from_queue(self, user_id: str):
        return (
            supabase.table(self.queue_table)
            .delete()
            .eq("user_id", user_id)
            .execute()
            .data
        )

    def create_session(self, initiator_user_id: str, recipient_user_id: str):
        result = (
            supabase.table(self.sessions_table)
            .insert(
                {
                    "initiator_user_id": initiator_user_id,
                    "recipient_user_id": recipient_user_id,
                    "status": "matched",
                }
            )
            .execute()
            .data
        )
        return result[0] if result else None

    def get_sessions(self, session_ids: list[str]):
        if not session_ids:
            return []

        return (
            supabase.table(self.sessions_table)
            .select("*")
            .in_("id", session_ids)
            .execute()
            .data
        )
