from app.db.supabase_client import supabase


class ReportRepository:
    table = "reports"

    def create(self, payload: dict):
        result = supabase.table(self.table).insert(payload).execute().data
        return result[0] if result else None

    def list(self):
        return (
            supabase.table(self.table)
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def list_for_user(self, reporter_user_id: str):
        return (
            supabase.table(self.table)
            .select("*")
            .eq("reporter_user_id", reporter_user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def get(self, report_id: str):
        result = (
            supabase.table(self.table)
            .select("*")
            .eq("id", report_id)
            .limit(1)
            .execute()
            .data
        )
        return result[0] if result else None

    def list_by_ids(self, report_ids: list[str]):
        if not report_ids:
            return []

        return (
            supabase.table(self.table)
            .select("*")
            .in_("id", report_ids)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def update_status(self, report_id: str, status: str):
        result = (
            supabase.table(self.table)
            .update({"status": status})
            .eq("id", report_id)
            .execute()
            .data
        )
        return result[0] if result else None


class ModerationEventRepository:
    table = "moderation_events"

    def create(self, payload: dict):
        result = supabase.table(self.table).insert(payload).execute().data
        return result[0] if result else None

    def list_for_subjects(self, subject_user_ids: list[str]):
        if not subject_user_ids:
            return []

        return (
            supabase.table(self.table)
            .select("*")
            .in_("subject_user_id", subject_user_ids)
            .order("created_at", desc=True)
            .limit(100)
            .execute()
            .data
        )


class BlockRepository:
    table = "blocks"

    def create(self, payload: dict):
        result = supabase.table(self.table).upsert(payload, on_conflict="blocker_user_id,blocked_user_id").execute().data
        return result[0] if result else None

    def list(self):
        return (
            supabase.table(self.table)
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def list_for_user(self, blocker_user_id: str):
        return (
            supabase.table(self.table)
            .select("*")
            .eq("blocker_user_id", blocker_user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def list_by_ids(self, block_ids: list[str]):
        if not block_ids:
            return []

        return (
            supabase.table(self.table)
            .select("*")
            .in_("id", block_ids)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def list_related_user_ids(self, user_id: str):
        outgoing = (
            supabase.table(self.table)
            .select("blocked_user_id")
            .eq("blocker_user_id", user_id)
            .execute()
            .data
        )
        incoming = (
            supabase.table(self.table)
            .select("blocker_user_id")
            .eq("blocked_user_id", user_id)
            .execute()
            .data
        )
        return {
            *(row["blocked_user_id"] for row in outgoing),
            *(row["blocker_user_id"] for row in incoming),
        }
