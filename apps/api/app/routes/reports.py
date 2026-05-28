from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import ensure_admin_role, get_current_user, require_admin
from app.repositories.admin_users import AdminUserRepository
from app.repositories.moderation import BlockRepository
from app.repositories.matchmaking import MatchQueueRepository
from app.repositories.moderation import ModerationEventRepository
from app.repositories.profiles import ProfileRepository
from app.repositories.moderation import ReportRepository
from app.schemas.admin_users import AdminUserSummary
from app.schemas.moderation import (
    ModerationAssignmentUpdate,
    ModerationEnforcementCreate,
    ModerationEnforcementReviewCreate,
    ModerationMemberSafetyState,
    ModerationEnforcementReviewSummary,
    ModerationEnforcementSummary,
    ModerationBlockRecord,
    ModerationExportSnapshot,
    ModerationExportRequest,
    ModerationNoteCreate,
    ModerationEventRecord,
    ModerationProfileSummary,
    ModerationReportRecord,
    ModerationSessionSummary,
    ReportCreate,
    ReportRecord,
    ReportStatusUpdate,
)

router = APIRouter(prefix="/reports", tags=["Reports"])
reports = ReportRepository()
blocks = BlockRepository()
profiles = ProfileRepository()
sessions = MatchQueueRepository()
events = ModerationEventRepository()
admin_users = AdminUserRepository()


def _build_moderation_reports(records: list[dict]):
    user_ids = {
        record["reporter_user_id"]
        for record in records
        if record.get("reporter_user_id")
    } | {
        record["reported_user_id"]
        for record in records
        if record.get("reported_user_id")
    }
    session_ids = [record["session_id"] for record in records if record.get("session_id")]

    profile_rows = profiles.get_by_user_ids(list(user_ids))
    profile_map = {
        row["user_id"]: ModerationProfileSummary.model_validate(row)
        for row in profile_rows
    }
    session_rows = sessions.get_sessions(session_ids)
    session_map = {
        row["id"]: ModerationSessionSummary.model_validate(row)
        for row in session_rows
    }
    event_rows = events.list_for_subjects(
        [record["reported_user_id"] for record in records if record.get("reported_user_id")]
    )
    admin_user_ids = {
        str(row["payload"].get("actor_admin_user_id"))
        for row in event_rows
        if row.get("payload", {}).get("actor_admin_user_id")
    } | {
        str(row["payload"].get("assignee_admin_user_id"))
        for row in event_rows
        if row.get("payload", {}).get("assignee_admin_user_id")
    }
    admin_user_map = {
        row["id"]: AdminUserSummary.model_validate(row)
        for row in admin_users.list_by_ids(list(admin_user_ids))
    }
    event_map: dict[str, list[ModerationEventRecord]] = {}
    for row in event_rows:
        subject_user_id = row.get("subject_user_id")
        if not subject_user_id:
            continue
        actor_admin_user_id = row.get("payload", {}).get("actor_admin_user_id")
        event_map.setdefault(subject_user_id, []).append(
            ModerationEventRecord.model_validate(
                {
                    **row,
                    "actor_admin_user": admin_user_map.get(actor_admin_user_id)
                    if isinstance(actor_admin_user_id, str)
                    else None,
                }
            )
        )

    moderation_reports = []
    for record in records:
        record_events = event_map.get(record["reported_user_id"], [])
        latest_enforcement = _get_latest_enforcement(record_events, record["id"])
        latest_enforcement_review = _get_latest_enforcement_review(
            record_events, record["id"]
        )
        relevant_assignment_events = [
            event
            for event in record_events
            if event.event_type == "report_assignment_changed"
            and event.payload.get("report_id") == record.get("id")
        ]
        current_assignee = None
        current_assignee_admin_user_id = None
        if relevant_assignment_events:
            current_assignee = relevant_assignment_events[0].payload.get("assignee")
            assignee_admin_user_id = relevant_assignment_events[0].payload.get(
                "assignee_admin_user_id"
            )
            if isinstance(assignee_admin_user_id, str) and assignee_admin_user_id:
                current_assignee_admin_user_id = assignee_admin_user_id

        moderation_reports.append(
            ModerationReportRecord(
                **record,
                reporter_profile=profile_map.get(record["reporter_user_id"]),
                reported_profile=profile_map.get(record["reported_user_id"]),
                session=session_map.get(record["session_id"]) if record.get("session_id") else None,
                events=record_events,
                current_assignee=current_assignee,
                current_assignee_admin_user_id=current_assignee_admin_user_id,
                current_assignee_admin_user=admin_user_map.get(current_assignee_admin_user_id)
                if current_assignee_admin_user_id
                else None,
                latest_enforcement=latest_enforcement,
                latest_enforcement_review=latest_enforcement_review,
                member_safety_state=_derive_member_safety_state(
                    record["id"],
                    latest_enforcement,
                    latest_enforcement_review,
                ),
            )
        )

    return moderation_reports


def _build_moderation_blocks(records: list[dict]):
    user_ids = {
        record["blocker_user_id"]
        for record in records
        if record.get("blocker_user_id")
    } | {
        record["blocked_user_id"]
        for record in records
        if record.get("blocked_user_id")
    }
    profile_rows = profiles.get_by_user_ids(list(user_ids))
    profile_map = {
        row["user_id"]: ModerationProfileSummary.model_validate(row)
        for row in profile_rows
    }

    return [
        ModerationBlockRecord(
            **record,
            blocker_profile=profile_map.get(record["blocker_user_id"]),
            blocked_profile=profile_map.get(record["blocked_user_id"]),
        )
        for record in records
    ]


def _get_current_assignee(report: ModerationReportRecord):
    relevant_assignment_events = [
        event
        for event in report.events
        if event.event_type == "report_assignment_changed"
        and event.payload.get("report_id") == report.id
    ]
    if not relevant_assignment_events:
        return None

    assignee = relevant_assignment_events[0].payload.get("assignee")
    return assignee if isinstance(assignee, str) and assignee else None


def _get_current_assignee_admin_user_id(report: ModerationReportRecord):
    relevant_assignment_events = [
        event
        for event in report.events
        if event.event_type == "report_assignment_changed"
        and event.payload.get("report_id") == report.id
    ]
    if not relevant_assignment_events:
        return None

    assignee_admin_user_id = relevant_assignment_events[0].payload.get(
        "assignee_admin_user_id"
    )
    if not isinstance(assignee_admin_user_id, str) or not assignee_admin_user_id:
        return None

    return assignee_admin_user_id


def _get_latest_enforcement(report_events: list[ModerationEventRecord], report_id: str):
    relevant_enforcement_events = [
        event
        for event in report_events
        if event.event_type == "enforcement_action_recorded"
        and event.payload.get("report_id") == report_id
    ]
    if not relevant_enforcement_events:
        return None

    latest = relevant_enforcement_events[0]
    action = latest.payload.get("action")
    if not isinstance(action, str):
        return None

    duration_hours = latest.payload.get("duration_hours")
    note = latest.payload.get("note")
    return ModerationEnforcementSummary(
        action=action,
        duration_hours=duration_hours if isinstance(duration_hours, int) else None,
        note=note if isinstance(note, str) and note else None,
        actor_admin_user=latest.actor_admin_user,
        report_id=report_id,
        created_at=latest.created_at,
    )


def _get_latest_enforcement_review(
    report_events: list[ModerationEventRecord], report_id: str
):
    relevant_review_events = [
        event
        for event in report_events
        if event.event_type == "enforcement_review_recorded"
        and event.payload.get("report_id") == report_id
    ]
    if not relevant_review_events:
        return None

    latest = relevant_review_events[0]
    action = latest.payload.get("action")
    if not isinstance(action, str):
        return None

    duration_hours = latest.payload.get("duration_hours")
    note = latest.payload.get("note")
    return ModerationEnforcementReviewSummary(
        action=action,
        duration_hours=duration_hours if isinstance(duration_hours, int) else None,
        note=note if isinstance(note, str) and note else None,
        actor_admin_user=latest.actor_admin_user,
        report_id=report_id,
        created_at=latest.created_at,
    )


def _derive_member_safety_state(
    report_id: str,
    latest_enforcement: ModerationEnforcementSummary | None,
    latest_enforcement_review: ModerationEnforcementReviewSummary | None,
):
    if not latest_enforcement:
        return ModerationMemberSafetyState(
            state="clear",
            label="Clear",
            source_report_id=report_id,
            enforcement=None,
            review=latest_enforcement_review,
        )

    if latest_enforcement.action == "warning":
        return ModerationMemberSafetyState(
            state="warned",
            label="Warned",
            source_report_id=report_id,
            enforcement=latest_enforcement,
            review=latest_enforcement_review,
        )

    if latest_enforcement.action == "verification_required":
        if latest_enforcement_review and latest_enforcement_review.action == "verification_completed":
            return ModerationMemberSafetyState(
                state="clear",
                label="Verification completed",
                source_report_id=report_id,
                enforcement=latest_enforcement,
                review=latest_enforcement_review,
            )

        return ModerationMemberSafetyState(
            state="verification_required",
            label="Verification required",
            source_report_id=report_id,
            enforcement=latest_enforcement,
            review=latest_enforcement_review,
        )

    if latest_enforcement.action == "permanent_ban":
        if latest_enforcement_review and latest_enforcement_review.action == "lift_ban":
            return ModerationMemberSafetyState(
                state="clear",
                label="Ban lifted",
                source_report_id=report_id,
                enforcement=latest_enforcement,
                review=latest_enforcement_review,
            )

        return ModerationMemberSafetyState(
            state="permanently_banned",
            label="Permanently banned",
            source_report_id=report_id,
            enforcement=latest_enforcement,
            review=latest_enforcement_review,
        )

    expires_at = None
    if latest_enforcement.action == "temporary_ban":
        duration_hours = latest_enforcement.duration_hours
        created_at = latest_enforcement.created_at
        if (
            latest_enforcement_review
            and latest_enforcement_review.action == "extend_temporary_ban"
        ):
            duration_hours = latest_enforcement_review.duration_hours
            created_at = latest_enforcement_review.created_at

        if created_at and duration_hours:
            expires_at = created_at + timedelta(hours=duration_hours)

        if latest_enforcement_review and latest_enforcement_review.action == "lift_ban":
            return ModerationMemberSafetyState(
                state="clear",
                label="Ban lifted",
                expires_at=expires_at,
                source_report_id=report_id,
                enforcement=latest_enforcement,
                review=latest_enforcement_review,
            )

        return ModerationMemberSafetyState(
            state="temporarily_banned",
            label="Temporarily banned",
            expires_at=expires_at,
            source_report_id=report_id,
            enforcement=latest_enforcement,
            review=latest_enforcement_review,
        )

    return ModerationMemberSafetyState(
        state="clear",
        label="Clear",
        source_report_id=report_id,
        enforcement=latest_enforcement,
        review=latest_enforcement_review,
    )


@router.get("/", response_model=list[ModerationReportRecord])
def list_reports(_admin=Depends(require_admin)):
    return _build_moderation_reports(reports.list())


@router.post("/export", response_model=ModerationExportSnapshot)
def export_reports(
    payload: ModerationExportRequest,
    _admin=Depends(require_admin),
):
    report_records = (
        reports.list_by_ids(payload.report_ids) if payload.report_ids else reports.list()
    )
    block_records = (
        blocks.list_by_ids(payload.block_ids) if payload.block_ids else blocks.list()
    )

    return ModerationExportSnapshot(
        reports=_build_moderation_reports(report_records),
        blocks=_build_moderation_blocks(block_records),
        exported_at=datetime.now(timezone.utc),
    )


@router.get("/me", response_model=list[ReportRecord])
def list_my_reports(user=Depends(get_current_user)):
    return reports.list_for_user(user.id)


@router.post("/", response_model=ReportRecord)
def create_report(payload: ReportCreate, user=Depends(get_current_user)):
    return reports.create({**payload.model_dump(), "reporter_user_id": user.id})


@router.patch("/{report_id}", response_model=ReportRecord)
def update_report_status(
    report_id: str,
    payload: ReportStatusUpdate,
    admin=Depends(require_admin),
):
    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    if payload.status in {"resolved", "dismissed"}:
        ensure_admin_role(admin, "lead")

    previous_status = existing.get("status")
    updated = reports.update_status(report_id, payload.status)
    if not updated:
        raise HTTPException(status_code=500, detail="Unable to update report status")

    events.create(
        {
            "actor_user_id": None,
            "subject_user_id": updated.get("reported_user_id"),
            "event_type": "report_status_changed",
            "payload": {
                "report_id": report_id,
                "from_status": previous_status,
                "to_status": payload.status,
                "actor_username": admin.get("username"),
                "actor_admin_user_id": admin.get("id"),
                "actor_admin_role": admin.get("role"),
            },
        }
    )

    return updated


@router.post("/{report_id}/notes", response_model=ModerationEventRecord)
def add_report_note(
    report_id: str,
    payload: ModerationNoteCreate,
    admin=Depends(require_admin),
):
    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    note = payload.note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="Note cannot be empty")

    event = events.create(
        {
            "actor_user_id": None,
            "subject_user_id": existing.get("reported_user_id"),
            "event_type": "moderation_note_added",
            "payload": {
                "report_id": report_id,
                "note": note,
                "actor_username": admin.get("username"),
                "actor_admin_user_id": admin.get("id"),
                "actor_admin_role": admin.get("role"),
            },
        }
    )
    if not event:
        raise HTTPException(status_code=500, detail="Unable to save note")

    return ModerationEventRecord.model_validate(event)


@router.post("/{report_id}/assignment", response_model=ModerationEventRecord)
def update_report_assignment(
    report_id: str,
    payload: ModerationAssignmentUpdate,
    admin=Depends(require_admin),
):
    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    assignee_admin_user = (
        admin_users.get(payload.assignee_admin_user_id)
        if payload.assignee_admin_user_id
        else None
    )
    if payload.assignee_admin_user_id and (
        not assignee_admin_user or not assignee_admin_user.get("is_active", False)
    ):
        raise HTTPException(status_code=400, detail="Assignee admin user not found")

    assignee = assignee_admin_user.get("username") if assignee_admin_user else None
    if admin.get("role") == "moderator":
        report = _build_moderation_reports([existing])[0]
        current_assignee = _get_current_assignee(report)
        current_assignee_admin_user_id = _get_current_assignee_admin_user_id(report)
        admin_username = admin.get("username")
        admin_user_id = admin.get("id")
        if assignee and assignee != admin_username:
            raise HTTPException(
                status_code=403,
                detail="Moderators can only assign cases to themselves",
            )
        if assignee_admin_user and assignee_admin_user.get("id") != admin_user_id:
            raise HTTPException(
                status_code=403,
                detail="Moderators can only assign cases to themselves",
            )
        if assignee is None and current_assignee not in {None, admin_username}:
            raise HTTPException(
                status_code=403,
                detail="Moderators can only clear their own case assignments",
            )
        if current_assignee_admin_user_id not in {None, admin_user_id}:
            raise HTTPException(
                status_code=403,
                detail="Moderators can only clear their own case assignments",
            )

    event = events.create(
        {
            "actor_user_id": None,
            "subject_user_id": existing.get("reported_user_id"),
            "event_type": "report_assignment_changed",
            "payload": {
                "report_id": report_id,
                "assignee": assignee,
                "assignee_admin_user_id": assignee_admin_user.get("id")
                if assignee_admin_user
                else None,
                "assignee_admin_role": assignee_admin_user.get("role")
                if assignee_admin_user
                else None,
                "actor_username": admin.get("username"),
                "actor_admin_user_id": admin.get("id"),
                "actor_admin_role": admin.get("role"),
            },
        }
    )
    if not event:
        raise HTTPException(status_code=500, detail="Unable to update assignment")

    return ModerationEventRecord.model_validate(event)


@router.post("/{report_id}/enforcement", response_model=ModerationEventRecord)
def record_report_enforcement(
    report_id: str,
    payload: ModerationEnforcementCreate,
    admin=Depends(require_admin),
):
    ensure_admin_role(admin, "lead")

    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    if payload.duration_hours is not None and payload.duration_hours <= 0:
        raise HTTPException(status_code=400, detail="duration_hours must be greater than zero")

    if (
        payload.action in {"warning", "verification_required", "permanent_ban"}
        and payload.duration_hours is not None
    ):
        raise HTTPException(
            status_code=400,
            detail="duration_hours is only supported for temporary bans",
        )

    if payload.action == "temporary_ban" and payload.duration_hours is None:
        raise HTTPException(
            status_code=400,
            detail="duration_hours is required for temporary bans",
        )

    event = events.create(
        {
            "actor_user_id": None,
            "subject_user_id": existing.get("reported_user_id"),
            "event_type": "enforcement_action_recorded",
            "payload": {
                "report_id": report_id,
                "action": payload.action,
                "duration_hours": payload.duration_hours,
                "note": payload.note.strip() if payload.note else None,
                "actor_username": admin.get("username"),
                "actor_admin_user_id": admin.get("id"),
                "actor_admin_role": admin.get("role"),
            },
        }
    )
    if not event:
        raise HTTPException(status_code=500, detail="Unable to record enforcement action")

    return ModerationEventRecord.model_validate(event)


@router.post("/{report_id}/enforcement-review", response_model=ModerationEventRecord)
def review_report_enforcement(
    report_id: str,
    payload: ModerationEnforcementReviewCreate,
    admin=Depends(require_admin),
):
    ensure_admin_role(admin, "lead")

    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    report = _build_moderation_reports([existing])[0]
    latest_enforcement = report.latest_enforcement
    if not latest_enforcement:
        raise HTTPException(status_code=400, detail="No enforcement action to review")

    if payload.duration_hours is not None and payload.duration_hours <= 0:
        raise HTTPException(status_code=400, detail="duration_hours must be greater than zero")

    if payload.action == "extend_temporary_ban":
        if latest_enforcement.action != "temporary_ban":
            raise HTTPException(
                status_code=400,
                detail="Only temporary bans can be extended",
            )
        if payload.duration_hours is None:
            raise HTTPException(
                status_code=400,
                detail="duration_hours is required when extending a temporary ban",
            )
    elif payload.duration_hours is not None:
        raise HTTPException(
            status_code=400,
            detail="duration_hours is only supported when extending a temporary ban",
        )

    if payload.action == "verification_completed" and latest_enforcement.action != "verification_required":
        raise HTTPException(
            status_code=400,
            detail="Only verification-required outcomes can be marked complete",
        )

    if payload.action == "lift_ban" and latest_enforcement.action not in {"temporary_ban", "permanent_ban"}:
        raise HTTPException(
            status_code=400,
            detail="Only active bans can be lifted",
        )

    event = events.create(
        {
            "actor_user_id": None,
            "subject_user_id": existing.get("reported_user_id"),
            "event_type": "enforcement_review_recorded",
            "payload": {
                "report_id": report_id,
                "action": payload.action,
                "duration_hours": payload.duration_hours,
                "note": payload.note.strip() if payload.note else None,
                "reviewed_enforcement_action": latest_enforcement.action,
                "actor_username": admin.get("username"),
                "actor_admin_user_id": admin.get("id"),
                "actor_admin_role": admin.get("role"),
            },
        }
    )
    if not event:
        raise HTTPException(status_code=500, detail="Unable to record enforcement review")

    return ModerationEventRecord.model_validate(event)
