from app.db.supabase_client import supabase
from app.repositories._supabase import execute_with_retry


class MatchQueueRepository:
    queue_table = "match_queue"
    sessions_table = "chat_sessions"

    def get_queue_entry(self, user_id: str):
        result = execute_with_retry(
            supabase.table(self.queue_table).select("*").eq("user_id", user_id).limit(1)
        ).data
        return result[0] if result else None

    def list_available_candidates(self, user_id: str):
        return execute_with_retry(
            supabase.table(self.queue_table)
            .select("*")
            .eq("is_available", True)
            .neq("user_id", user_id)
            .order("queued_at")
        ).data

    def list_waiting_entries(self):
        return execute_with_retry(
            supabase.table(self.queue_table)
            .select("*")
            .eq("is_available", True)
            .order("queued_at")
        ).data

    def upsert_queue_entry(self, payload: dict):
        result = execute_with_retry(
            supabase.table(self.queue_table).upsert(payload, on_conflict="user_id")
        ).data
        return result[0] if result else None

    def remove_from_queue(self, user_id: str):
        return execute_with_retry(
            supabase.table(self.queue_table).delete().eq("user_id", user_id)
        ).data

    def create_session(self, initiator_user_id: str, recipient_user_id: str):
        result = execute_with_retry(
            supabase.table(self.sessions_table).insert(
                {
                    "initiator_user_id": initiator_user_id,
                    "recipient_user_id": recipient_user_id,
                    "status": "matched",
                }
            )
        ).data
        return result[0] if result else None

    def get_sessions(self, session_ids: list[str]):
        if not session_ids:
            return []

        return execute_with_retry(
            supabase.table(self.sessions_table).select("*").in_("id", session_ids)
        ).data

    def list_user_sessions(self, user_id: str, limit: int = 5):
        initiated = execute_with_retry(
            supabase.table(self.sessions_table)
            .select("*")
            .eq("initiator_user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        ).data
        received = execute_with_retry(
            supabase.table(self.sessions_table)
            .select("*")
            .eq("recipient_user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        ).data

        merged = {row["id"]: row for row in (initiated or []) + (received or []) if row.get("id")}
        return sorted(
            merged.values(),
            key=lambda row: row.get("created_at") or "",
            reverse=True,
        )[:limit]
