"use client";

import { useState } from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser, ModerationEnforcementSummary, ModerationEvent, ModerationReport } from "@repo/types";

import { ReportActions } from "./report-actions";
import { ReportAssignment } from "./report-assignment";
import { ReportEnforcement } from "./report-enforcement";
import { ReportNotes } from "./report-notes";

type ReportFeedProps = {
  adminUsers: AdminUser[];
  currentAdminUserId?: string;
  currentAdminRole?: "moderator" | "lead" | "admin";
  currentAdminUsername?: string;
  reports: ModerationReport[];
};

function profileLabel(profile?: {
  display_name?: string;
  user_id: string;
  country_code?: string;
  profile_status?: string;
  age_verified_status?: string;
}) {
  return profile?.display_name ?? profile?.user_id ?? "Unknown profile";
}

function formatDate(value?: string) {
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

function formatEventLabel(eventType: string) {
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

  return eventType.replaceAll("_", " ");
}

function formatActorSuffix(reportEvent: ModerationEvent) {
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

function formatEnforcementLabel(enforcement?: ModerationEnforcementSummary) {
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

function formatEnforcementFollowUp(enforcement?: ModerationEnforcementSummary) {
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

const BULK_STATUS_OPTIONS = [
  { label: "Set reviewing", value: "reviewing" },
  { label: "Resolve", value: "resolved" },
  { label: "Dismiss", value: "dismissed" },
] as const;

export function ReportFeed({
  adminUsers,
  currentAdminUserId,
  currentAdminRole,
  currentAdminUsername,
  reports,
}: ReportFeedProps) {
  const router = useRouter();
  const [assigneeAdminUserId, setAssigneeAdminUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const selectedSet = new Set(selectedIds);
  const canResolveOrDismiss =
    currentAdminRole === "lead" || currentAdminRole === "admin";
  const canManageOtherAssignees =
    currentAdminRole === "lead" || currentAdminRole === "admin";
  const bulkStatusOptions = BULK_STATUS_OPTIONS.filter((option) =>
    option.value === "reviewing" ? true : canResolveOrDismiss,
  );

  async function runBulkAction({
    actionKey,
    body,
    method,
    pathBuilder,
    successMessage,
  }: {
    actionKey: string;
    body: object;
    method: "POST" | "PATCH";
    pathBuilder: (reportId: string) => string;
    successMessage: string;
  }) {
    if (selectedIds.length === 0) {
      setError("Select at least one report first.");
      setSuccess(null);
      return;
    }

    setError(null);
    setPendingKey(actionKey);
    setSuccess(null);

    try {
      for (const reportId of selectedIds) {
        const response = await fetch(pathBuilder(reportId), {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`${method} failed with ${response.status}`);
        }
      }

      setSelectedIds([]);
      setSuccess(successMessage);
      startTransition(() => {
        router.refresh();
      });
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to apply bulk moderation action.",
      );
    } finally {
      setPendingKey(null);
    }
  }

  function toggleReport(reportId: string) {
    setSelectedIds((current) =>
      current.includes(reportId)
        ? current.filter((value) => value !== reportId)
        : [...current, reportId],
    );
  }

  function toggleAll() {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(reports.map((report) => report.id));
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">Bulk triage</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {selectedIds.length} of {reports.length} filtered reports selected
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
            >
              {selectedIds.length === reports.length && reports.length > 0 ? "Clear all" : "Select all"}
            </button>
            {bulkStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={pendingKey !== null}
                onClick={() => {
                  void runBulkAction({
                    actionKey: `bulk-status-${option.value}`,
                    body: { status: option.value },
                    method: "PATCH",
                    pathBuilder: (reportId) => `/api/admin/reports/${reportId}`,
                    successMessage: `Updated ${selectedIds.length} reports to ${option.value}.`,
                  });
                }}
                className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-100"
              >
                {pendingKey === `bulk-status-${option.value}` ? "Saving..." : option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <select
            value={assigneeAdminUserId}
            onChange={(event) => setAssigneeAdminUserId(event.target.value)}
            disabled={!canManageOtherAssignees}
            className="min-w-0 flex-1 rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-3 text-sm text-slate-900 outline-none dark:text-stone-100"
          >
            <option value="">Select moderator...</option>
            {adminUsers.map((adminUser) => (
              <option key={adminUser.id} value={adminUser.id}>
                {(adminUser.display_name || adminUser.username) + ` (${adminUser.role})`}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {currentAdminUsername && currentAdminUserId ? (
              <button
                type="button"
                disabled={pendingKey !== null}
                onClick={() => {
                  setAssigneeAdminUserId(currentAdminUserId);
                  void runBulkAction({
                    actionKey: "bulk-assign-me",
                    body: { assignee_admin_user_id: currentAdminUserId },
                    method: "POST",
                    pathBuilder: (reportId) => `/api/admin/reports/${reportId}/assignment`,
                    successMessage: `Assigned ${selectedIds.length} reports to ${currentAdminUsername}.`,
                  });
                }}
                className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-100"
              >
                {pendingKey === "bulk-assign-me" ? "Assigning..." : "Assign selected to me"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={pendingKey !== null || !canManageOtherAssignees}
              onClick={() => {
                const selectedAdminUser = adminUsers.find(
                  (adminUser) => adminUser.id === assigneeAdminUserId,
                );
                void runBulkAction({
                  actionKey: "bulk-assign",
                  body: { assignee_admin_user_id: assigneeAdminUserId || null },
                  method: "POST",
                  pathBuilder: (reportId) => `/api/admin/reports/${reportId}/assignment`,
                  successMessage: selectedAdminUser
                    ? `Assigned ${selectedIds.length} reports to ${selectedAdminUser.display_name || selectedAdminUser.username}.`
                    : `Cleared assignment for ${selectedIds.length} reports.`,
                });
              }}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
            >
              {pendingKey === "bulk-assign" ? "Saving..." : "Save assignment"}
            </button>
            <button
              type="button"
              disabled={pendingKey !== null || !canManageOtherAssignees}
              onClick={() => {
                setAssigneeAdminUserId("");
                void runBulkAction({
                  actionKey: "bulk-unassign",
                  body: { assignee_admin_user_id: null },
                  method: "POST",
                  pathBuilder: (reportId) => `/api/admin/reports/${reportId}/assignment`,
                  successMessage: `Cleared assignment for ${selectedIds.length} reports.`,
                });
              }}
              className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-100"
            >
              {pendingKey === "bulk-unassign" ? "Clearing..." : "Clear assignment"}
            </button>
          </div>
        </div>

        {success ? (
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="mt-3 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300"
          >
            {success}
          </button>
        ) : null}
        {error ? (
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-3 text-left text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            {error}
          </button>
        ) : null}
        {currentAdminRole === "moderator" ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Moderators can bulk move reports into review and claim them for themselves. Lead and admin roles can reassign, clear assignments, resolve, or dismiss.
          </p>
        ) : null}
      </div>

      {reports.map((report) => (
        <div
          key={report.id}
          className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedSet.has(report.id)}
                onChange={() => toggleReport(report.id)}
                className="mt-1 h-4 w-4 rounded border-(--color-line)"
              />
              <div>
                <p className="text-lg font-semibold text-slate-950 dark:text-stone-100">
                  {report.reason}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {profileLabel(report.reporter_profile)} flagged {profileLabel(report.reported_profile)}
                </p>
                {report.current_assignee ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Assigned to {report.current_assignee_admin_user?.display_name || report.current_assignee}
                  </p>
                ) : null}
                {report.latest_enforcement ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                    {formatEnforcementLabel(report.latest_enforcement)}
                  </p>
                ) : null}
                {formatEnforcementFollowUp(report.latest_enforcement) ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">
                    {formatEnforcementFollowUp(report.latest_enforcement)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="rounded-full bg-(--color-chip-muted) px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-900 dark:text-stone-100">
              {report.status ?? "open"}
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {report.details ?? "No additional details submitted."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Reporter
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-stone-100">
                {profileLabel(report.reporter_profile)}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {report.reporter_profile?.country_code ?? "Country unknown"} ·{" "}
                {report.reporter_profile?.profile_status ?? "Profile state unknown"} ·{" "}
                {report.reporter_profile?.age_verified_status ?? "Verification unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Reported user
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-stone-100">
                {profileLabel(report.reported_profile)}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {report.reported_profile?.country_code ?? "Country unknown"} ·{" "}
                {report.reported_profile?.profile_status ?? "Profile state unknown"} ·{" "}
                {report.reported_profile?.age_verified_status ?? "Verification unknown"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
              {formatDate(report.created_at)}
            </span>
            {report.session_id ? (
              <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
                Session {report.session_id}
              </span>
            ) : null}
            {report.evidence_storage_path ? (
              <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
                Evidence attached
              </span>
            ) : null}
            {report.session ? (
              <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
                Session status {report.session.status ?? "unknown"}
              </span>
            ) : null}
            {report.latest_enforcement ? (
              <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-900">
                {formatEnforcementLabel(report.latest_enforcement)}
              </span>
            ) : null}
          </div>

          {report.latest_enforcement ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-800">
                Latest enforcement
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-950">
                {formatEnforcementLabel(report.latest_enforcement)}
              </p>
              <p className="mt-2 text-sm text-amber-900">
                Recorded {formatDate(report.latest_enforcement.created_at)}
                {report.latest_enforcement.actor_admin_user
                  ? ` by ${report.latest_enforcement.actor_admin_user.display_name || report.latest_enforcement.actor_admin_user.username}`
                  : ""}
              </p>
              {report.latest_enforcement.note ? (
                <p className="mt-2 text-sm text-amber-900">{report.latest_enforcement.note}</p>
              ) : null}
              {formatEnforcementFollowUp(report.latest_enforcement) ? (
                <p className="mt-2 text-sm font-semibold text-rose-800">
                  {formatEnforcementFollowUp(report.latest_enforcement)}
                </p>
              ) : null}
            </div>
          ) : null}

          {report.session ? (
            <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Session context
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Session {report.session.id} between {report.session.initiator_user_id} and{" "}
                {report.session.recipient_user_id}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Created {formatDate(report.session.created_at)}
                {report.session.started_at ? ` · Started ${formatDate(report.session.started_at)}` : ""}
                {report.session.ended_at ? ` · Ended ${formatDate(report.session.ended_at)}` : ""}
              </p>
            </div>
          ) : null}

          {report.events && report.events.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Moderation history
              </p>
              <div className="mt-3 space-y-3">
                {report.events.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-(--color-line) bg-(--color-surface) px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                      {formatEventLabel(event.event_type)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {event.event_type === "report_status_changed"
                        ? `${String(event.payload.from_status ?? "unknown")} -> ${String(event.payload.to_status ?? "unknown")}${formatActorSuffix(event)}`
                        : event.event_type === "report_assignment_changed"
                          ? `Assigned to ${String(event.payload.assignee ?? "nobody")}${formatActorSuffix(event)}`
                          : event.event_type === "enforcement_action_recorded"
                            ? `${String(event.payload.action ?? "unknown")}${event.payload.duration_hours ? ` for ${String(event.payload.duration_hours)}h` : ""}${formatActorSuffix(event)}`
                          : event.event_type === "moderation_note_added"
                            ? `${String(event.payload.note ?? "")}${formatActorSuffix(event)}`
                            : JSON.stringify(event.payload)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <ReportAssignment
            adminUsers={adminUsers}
            currentAdminUserId={currentAdminUserId}
            currentAdminRole={currentAdminRole}
            currentAdminUsername={currentAdminUsername}
            reportId={report.id}
            currentAssigneeAdminUserId={report.current_assignee_admin_user_id}
            currentAssignee={report.current_assignee}
          />
          <ReportEnforcement currentAdminRole={currentAdminRole} reportId={report.id} />
          <ReportNotes reportId={report.id} />
          <ReportActions currentAdminRole={currentAdminRole} reportId={report.id} status={report.status} />
        </div>
      ))}
    </div>
  );
}
