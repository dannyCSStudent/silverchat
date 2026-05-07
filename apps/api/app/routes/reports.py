from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user, require_admin
from app.repositories.matchmaking import MatchQueueRepository
from app.repositories.moderation import ModerationEventRepository
from app.repositories.profiles import ProfileRepository
from app.repositories.moderation import ReportRepository
from app.schemas.moderation import (
    ModerationAssignmentUpdate,
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
profiles = ProfileRepository()
sessions = MatchQueueRepository()
events = ModerationEventRepository()


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
    event_map: dict[str, list[ModerationEventRecord]] = {}
    for row in event_rows:
        subject_user_id = row.get("subject_user_id")
        if not subject_user_id:
            continue
        event_map.setdefault(subject_user_id, []).append(
            ModerationEventRecord.model_validate(row)
        )

    moderation_reports = []
    for record in records:
        record_events = event_map.get(record["reported_user_id"], [])
        relevant_assignment_events = [
            event
            for event in record_events
            if event.event_type == "report_assignment_changed"
            and event.payload.get("report_id") == record.get("id")
        ]
        current_assignee = None
        if relevant_assignment_events:
            current_assignee = relevant_assignment_events[0].payload.get("assignee")

        moderation_reports.append(
            ModerationReportRecord(
                **record,
                reporter_profile=profile_map.get(record["reporter_user_id"]),
                reported_profile=profile_map.get(record["reported_user_id"]),
                session=session_map.get(record["session_id"]) if record.get("session_id") else None,
                events=record_events,
                current_assignee=current_assignee,
            )
        )

    return moderation_reports


@router.get("/", response_model=list[ModerationReportRecord])
def list_reports(_admin=Depends(require_admin)):
    return _build_moderation_reports(reports.list())


@router.get("/me", response_model=list[ReportRecord])
def list_my_reports(user=Depends(get_current_user)):
    return reports.list_for_user(user.id)


@router.post("/", response_model=ReportRecord)
def create_report(payload: ReportCreate, user=Depends(get_current_user)):
    return reports.create({**payload.model_dump(), "reporter_user_id": user.id})


@router.patch("/{report_id}", response_model=ReportRecord)
def update_report_status(report_id: str, payload: ReportStatusUpdate, _admin=Depends(require_admin)):
    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

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
            },
        }
    )

    return updated


@router.post("/{report_id}/notes", response_model=ModerationEventRecord)
def add_report_note(report_id: str, payload: ModerationNoteCreate, _admin=Depends(require_admin)):
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
    _admin=Depends(require_admin),
):
    existing = reports.get(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    assignee = payload.assignee.strip() if payload.assignee else None
    event = events.create(
        {
            "actor_user_id": None,
            "subject_user_id": existing.get("reported_user_id"),
            "event_type": "report_assignment_changed",
            "payload": {
                "report_id": report_id,
                "assignee": assignee,
            },
        }
    )
    if not event:
        raise HTTPException(status_code=500, detail="Unable to update assignment")

    return ModerationEventRecord.model_validate(event)
