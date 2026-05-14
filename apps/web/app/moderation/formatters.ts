import type { ModerationEnforcementSummary, ModerationEvent, ModerationReport } from "@repo/types";

export function formatDate(value?: string) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatEventLabel(eventType: string) {
  if (eventType === "report_status_changed") {
    return "Status changed";
  }
  if (eventType === "moderation_note_added") {
    return "Moderator note";
  }
  if (eventType === "report_assignment_changed") {
    return "Assignment changed";
  }
  if (eventType === "enforcement_action_recorded") {
    return "Enforcement recorded";
  }
  if (eventType === "enforcement_review_recorded") {
    return "Enforcement review";
  }

  return eventType.replaceAll("_", " ");
}

export function formatActorSuffix(reportEvent: ModerationEvent) {
  const actorLabel =
    reportEvent.actor_admin_user?.display_name ||
    reportEvent.actor_admin_user?.username;
  if (actorLabel) {
    return ` by ${actorLabel}`;
  }

  const actorUsername = reportEvent.payload.actor_username;
  if (typeof actorUsername !== "string" || actorUsername.length === 0) {
    return "";
  }

  return ` by ${actorUsername}`;
}

export function formatEnforcementLabel(enforcement?: ModerationEnforcementSummary) {
  if (!enforcement) {
    return null;
  }

  if (enforcement.action === "verification_required") {
    return "Verification required";
  }
  if (enforcement.action === "temporary_ban") {
    return enforcement.duration_hours
      ? `Temporary ban for ${enforcement.duration_hours}h`
      : "Temporary ban";
  }
  if (enforcement.action === "permanent_ban") {
    return "Permanent ban";
  }

  return "Warning issued";
}

function getEnforcementExpiryDate(enforcement?: ModerationEnforcementSummary) {
  if (
    enforcement?.action !== "temporary_ban" ||
    !enforcement.created_at ||
    !enforcement.duration_hours
  ) {
    return null;
  }

  const createdAt = new Date(enforcement.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return new Date(createdAt.getTime() + enforcement.duration_hours * 60 * 60 * 1000);
}

export function formatEnforcementFollowUp(report: ModerationReport) {
  if (report.latest_enforcement_review?.action === "lift_ban") {
    return "Ban lifted";
  }
  if (report.latest_enforcement_review?.action === "verification_completed") {
    return "Verification completed";
  }

  let enforcement = report.latest_enforcement;
  if (
    report.latest_enforcement &&
    report.latest_enforcement_review?.action === "extend_temporary_ban"
  ) {
    enforcement = {
      ...report.latest_enforcement,
      created_at: report.latest_enforcement_review.created_at,
      duration_hours: report.latest_enforcement_review.duration_hours,
    };
  }
  const expiryDate = getEnforcementExpiryDate(enforcement);
  if (!expiryDate) {
    return null;
  }

  const now = Date.now();
  const expiryTime = expiryDate.getTime();
  if (expiryTime <= now) {
    return `Expired ${formatDate(expiryDate.toISOString())}`;
  }
  if (expiryTime - now <= 24 * 60 * 60 * 1000) {
    return `Expires ${formatDate(expiryDate.toISOString())}`;
  }

  return null;
}

export function formatModerationEventBody(event: ModerationEvent) {
  if (event.event_type === "report_status_changed") {
    return `${String(event.payload.from_status ?? "unknown")} -> ${String(event.payload.to_status ?? "unknown")}${formatActorSuffix(event)}`;
  }
  if (event.event_type === "report_assignment_changed") {
    return `Assigned to ${String(event.payload.assignee ?? "nobody")}${formatActorSuffix(event)}`;
  }
  if (event.event_type === "enforcement_action_recorded") {
    return `${String(event.payload.action ?? "unknown")}${event.payload.duration_hours ? ` for ${String(event.payload.duration_hours)}h` : ""}${formatActorSuffix(event)}`;
  }
  if (event.event_type === "enforcement_review_recorded") {
    return `${String(event.payload.action ?? "unknown")}${event.payload.duration_hours ? ` for ${String(event.payload.duration_hours)}h` : ""}${formatActorSuffix(event)}`;
  }
  if (event.event_type === "moderation_note_added") {
    return `${String(event.payload.note ?? "")}${formatActorSuffix(event)}`;
  }

  return JSON.stringify(event.payload);
}
