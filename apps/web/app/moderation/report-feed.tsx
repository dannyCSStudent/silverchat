"use client";

import { useState } from "react";
import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminUser, ModerationEnforcementSummary, ModerationEvent, ModerationReport } from "@repo/types";

import {
  rankAssignmentTargets,
  requiresElevatedCapability,
  type ModeratorWorkloadSnapshot,
} from "./assignment-targets";
import {
  getActiveGuardrails,
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import {
  formatActorSuffix,
  formatDate,
  formatEnforcementFollowUp,
  formatEnforcementLabel,
  formatEventLabel,
  getMemberAttentionSummary,
  formatModerationEventBody,
} from "./formatters";
import { ReportActions } from "./report-actions";
import { ReportAssignment } from "./report-assignment";
import { ReportEnforcement } from "./report-enforcement";
import { ReportEnforcementReview } from "./report-enforcement-review";
import { ReportNotes } from "./report-notes";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

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

function formatMemberSafetyState(report: ModerationReport) {
  const safetyState = report.member_safety_state;
  if (!safetyState) {
    return null;
  }

  if (safetyState.state === "temporarily_banned" && safetyState.expires_at) {
    return `${safetyState.label} until ${formatDate(safetyState.expires_at)}`;
  }

  return safetyState.label;
}

function safetyStateClasses(
  state?:
    | "clear"
    | "warned"
    | "verification_required"
    | "temporarily_banned"
    | "permanently_banned",
) {
  if (state === "permanently_banned" || state === "temporarily_banned") {
    return "bg-rose-100 text-rose-900";
  }
  if (state === "verification_required") {
    return "bg-amber-100 text-amber-900";
  }
  if (state === "warned") {
    return "bg-slate-200 text-slate-800";
  }

  return "bg-emerald-100 text-emerald-900";
}

const BULK_STATUS_OPTIONS = [
  { label: "Set reviewing", value: "reviewing" },
  { label: "Resolve", value: "resolved" },
  { label: "Dismiss", value: "dismissed" },
] as const;

const SORT_OPTIONS = [
  { label: "Attention first", value: "attention" },
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
] as const;
const CLAIM_URGENT_BATCH_SIZE = 3;

function attentionToneClasses(tone: "amber" | "emerald" | "rose" | "slate") {
  if (tone === "rose") {
    return "bg-rose-100 text-rose-900";
  }
  if (tone === "amber") {
    return "bg-amber-100 text-amber-900";
  }
  if (tone === "emerald") {
    return "bg-emerald-100 text-emerald-900";
  }

  return "bg-slate-200 text-slate-800";
}

function assigneeNeedsEscalation(args: {
  assigneeRole?: AdminUser["role"];
  attentionTitle: string;
}) {
  return (
    args.assigneeRole === "moderator" &&
    requiresElevatedCapability([args.attentionTitle])
  );
}

export function ReportFeed({
  adminUsers,
  currentAdminUserId,
  currentAdminRole,
  currentAdminUsername,
  reports,
}: ReportFeedProps) {
  const router = useRouter();
  const { currentHealth: liveAdminHealth } = useLiveAdminHealth();
  const [assigneeAdminUserId, setAssigneeAdminUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortMode, setSortMode] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("attention");
  const [success, setSuccess] = useState<string | null>(null);
  const selectedSet = new Set(selectedIds);
  const canResolveOrDismiss =
    currentAdminRole === "lead" || currentAdminRole === "admin";
  const hasFailedAdminRoute = liveAdminHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = liveAdminHealth.statuses.some(
    (status) => status.durationMs !== null && status.durationMs >= 2000,
  );
  const workflowMode = getWorkflowMode(liveAdminHealth.statuses);
  const activeGuardrails = getActiveGuardrails(liveAdminHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(liveAdminHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(liveAdminHealth.statuses);
  const actionRiskBanner = hasFailedAdminRoute
    ? {
        classes: "border-rose-200 bg-rose-50 text-rose-900",
        detail:
          "One or more admin routes are failing. Prefer targeted moderation actions and verify queue refresh before repeating changes.",
        title: "Moderation actions are at elevated risk",
      }
    : hasVerySlowAdminRoute
      ? {
          classes: "border-amber-200 bg-amber-50 text-amber-900",
          detail:
            "Admin route latency is currently very high. Queue refresh and moderation actions may reflect slowly.",
          title: "Moderation actions may appear delayed",
        }
      : null;
  const disableBulkActions = hasFailedAdminRoute;
  const canManageOtherAssignees =
    currentAdminRole === "lead" || currentAdminRole === "admin";
  const bulkStatusOptions = BULK_STATUS_OPTIONS.filter((option) =>
    option.value === "reviewing" ? true : canResolveOrDismiss,
  );
  const openReportCountByUserId = reports.reduce<Record<string, number>>(
    (accumulator, report) => {
      if ((report.status ?? "open") === "open") {
        accumulator[report.reported_user_id] =
          (accumulator[report.reported_user_id] ?? 0) + 1;
      }
      return accumulator;
    },
    {},
  );
  const adminWorkloads: ModeratorWorkloadSnapshot[] = adminUsers.map((adminUser) => {
    const assignedReports = reports.filter(
      (report) => report.current_assignee_admin_user_id === adminUser.id,
    );
    const urgentAssignedCount = assignedReports.filter((report) => {
      const attentionSummary = getMemberAttentionSummary({
        currentSafetyState: report.member_safety_state,
        openReportCount: openReportCountByUserId[report.reported_user_id] ?? 0,
      });

      return (
        requiresElevatedCapability([attentionSummary.title]) ||
        attentionSummary.tone !== "emerald"
      );
    }).length;

    return {
      adminUserId: adminUser.id,
      openAssignedCount: assignedReports.filter(
        (report) => (report.status ?? "open") === "open",
      ).length,
      totalAssignedCount: assignedReports.length,
      urgentAssignedCount,
    };
  });
  const sortedReports = [...reports].sort((left, right) => {
    const leftTime = new Date(left.created_at ?? 0).getTime();
    const rightTime = new Date(right.created_at ?? 0).getTime();

    if (sortMode === "newest") {
      return rightTime - leftTime;
    }

    if (sortMode === "oldest") {
      return leftTime - rightTime;
    }

    const toneRank = { rose: 3, amber: 2, slate: 1, emerald: 0 };
    const leftAttention = getMemberAttentionSummary({
      currentSafetyState: left.member_safety_state,
      openReportCount: openReportCountByUserId[left.reported_user_id] ?? 0,
    });
    const rightAttention = getMemberAttentionSummary({
      currentSafetyState: right.member_safety_state,
      openReportCount: openReportCountByUserId[right.reported_user_id] ?? 0,
    });
    const toneDelta = toneRank[rightAttention.tone] - toneRank[leftAttention.tone];
    if (toneDelta !== 0) {
      return toneDelta;
    }

    const openCountDelta =
      (openReportCountByUserId[right.reported_user_id] ?? 0) -
      (openReportCountByUserId[left.reported_user_id] ?? 0);
    if (openCountDelta !== 0) {
      return openCountDelta;
    }

    return rightTime - leftTime;
  });
  const urgentAssignableReports = sortedReports.filter(
    (report) =>
      !report.current_assignee &&
      (report.status ?? "open") === "open",
  );
  const urgentClaimTargets = urgentAssignableReports.slice(0, CLAIM_URGENT_BATCH_SIZE);

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

  async function runSingleAssignment(args: {
    reportId: string;
    targetAdminUserId: string;
    targetLabel: string;
  }) {
    setError(null);
    setSuccess(null);
    setPendingKey(`escalate:${args.reportId}`);

    try {
      const response = await fetch(`/api/admin/reports/${args.reportId}/assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignee_admin_user_id: args.targetAdminUserId }),
      });

      if (!response.ok) {
        throw new Error(`POST failed with ${response.status}`);
      }

      setSuccess(`Escalated case to ${args.targetLabel}.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to escalate case assignment.",
      );
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {actionRiskBanner ? (
        <div className={`rounded-3xl border px-4 py-3 text-sm ${actionRiskBanner.classes}`}>
          <p className="font-semibold">{actionRiskBanner.title}</p>
          <p className="mt-1">{actionRiskBanner.detail}</p>
          {highestAttentionRoute ? (
            <div className="mt-3 rounded-2xl border border-current/20 bg-white/40 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Check next
              </p>
              <p className="mt-1 text-sm font-semibold">
                {highestAttentionRoute.label} · {highestAttentionRoute.path}
              </p>
              <LocalRecoveryHint
                route={highestAttentionRoute}
                prefix=""
                className="mt-1 flex flex-col items-start gap-2 text-xs"
                endpointClassName="inline-flex rounded-full border border-current/20 bg-white/50 px-3 py-1 text-xs font-semibold transition hover:bg-white/70"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">Bulk triage</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${workflowMode.classes}`}
              >
                {workflowMode.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {selectedIds.length} of {reports.length} filtered reports selected
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {activeGuardrails.join(" · ")}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              What to do now: {recommendedBehavior.steps.join(" · ")}
            </p>
            {highestAttentionRoute ? (
              <LocalRecoveryHint
                route={highestAttentionRoute}
                className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                endpointClassName="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-3 py-1 font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as (typeof SORT_OPTIONS)[number]["value"])
              }
              className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 outline-none dark:text-stone-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
            >
              {selectedIds.length === reports.length && reports.length > 0 ? "Clear all" : "Select all"}
            </button>
            {currentAdminUsername && currentAdminUserId ? (
              <button
                type="button"
                disabled={
                  disableBulkActions ||
                  pendingKey !== null ||
                  urgentClaimTargets.length === 0
                }
                onClick={() => {
                  const urgentIds = urgentClaimTargets.map((report) => report.id);
                  setSelectedIds(urgentIds);
                  void runBulkAction({
                    actionKey: "bulk-claim-urgent",
                    body: { assignee_admin_user_id: currentAdminUserId },
                    method: "POST",
                    pathBuilder: (reportId) => `/api/admin/reports/${reportId}/assignment`,
                    successMessage: `Assigned ${urgentIds.length} urgent report${urgentIds.length === 1 ? "" : "s"} to ${currentAdminUsername}.`,
                  });
                }}
                className="rounded-full bg-rose-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingKey === "bulk-claim-urgent"
                  ? "Claiming..."
                  : `Claim top urgent ${urgentClaimTargets.length === 1 ? "case" : `${urgentClaimTargets.length} cases`}`}
              </button>
            ) : null}
            {bulkStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disableBulkActions || pendingKey !== null}
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
            disabled={disableBulkActions || !canManageOtherAssignees}
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
                disabled={disableBulkActions || pendingKey !== null}
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
              disabled={disableBulkActions || pendingKey !== null || !canManageOtherAssignees}
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
              disabled={disableBulkActions || pendingKey !== null || !canManageOtherAssignees}
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
        {sortMode === "attention" && urgentClaimTargets.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Urgent claim uses the current attention ranking and only targets open, unassigned reports.
          </p>
        ) : null}
        {disableBulkActions ? (
          <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
            Bulk triage is temporarily disabled because one or more admin routes are failing. Use single-case actions until the admin data path recovers.
          </p>
        ) : null}
      </div>

      {sortedReports.map((report) => {
        const attentionSummary = getMemberAttentionSummary({
          currentSafetyState: report.member_safety_state,
          openReportCount: openReportCountByUserId[report.reported_user_id] ?? 0,
        });
        const currentAssigneeNeedsEscalation = assigneeNeedsEscalation({
          assigneeRole: report.current_assignee_admin_user?.role,
          attentionTitle: attentionSummary.title,
        });
        const preferredEscalationTarget = rankAssignmentTargets({
          adminUsers,
          adminWorkloads,
          excludeAdminUserId: report.current_assignee_admin_user_id,
          minimumRoleRank: requiresElevatedCapability([attentionSummary.title]) ? 2 : 1,
          preferredAdminUserId: currentAdminUserId,
        })[0];

        return (
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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950 dark:text-stone-100">
                      {report.reason}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${attentionToneClasses(
                        attentionSummary.tone,
                      )}`}
                    >
                      {attentionSummary.title}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {profileLabel(report.reporter_profile)} flagged {profileLabel(report.reported_profile)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {attentionSummary.detail}
                  </p>
                  {report.current_assignee ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Assigned to {report.current_assignee_admin_user?.display_name || report.current_assignee}
                    </p>
                  ) : null}
                  {currentAssigneeNeedsEscalation ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                        Current assignee can review this urgent case, but a lead or admin may be needed to complete enforcement follow-up.
                      </p>
                      {hasFailedAdminRoute ? (
                        <p className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-900">
                          Escalation shortcut is paused until admin routes recover.
                        </p>
                      ) : null}
                      {preferredEscalationTarget && canManageOtherAssignees ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={hasFailedAdminRoute || pendingKey !== null}
                            onClick={() => {
                              void runSingleAssignment({
                                reportId: report.id,
                                targetAdminUserId: preferredEscalationTarget.adminUser.id,
                                targetLabel:
                                  preferredEscalationTarget.adminUser.display_name ||
                                  preferredEscalationTarget.adminUser.username,
                              });
                            }}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-900 transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `escalate:${report.id}`
                              ? "Escalating..."
                              : `Escalate to ${
                                  preferredEscalationTarget.adminUser.id === currentAdminUserId
                                    ? "me"
                                    : preferredEscalationTarget.adminUser.display_name ||
                                      preferredEscalationTarget.adminUser.username
                                }`}
                          </button>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {preferredEscalationTarget.recommendationReason}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {report.latest_enforcement ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                      {formatEnforcementLabel(report.latest_enforcement)}
                    </p>
                  ) : null}
                  {formatEnforcementFollowUp(report) ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">
                      {formatEnforcementFollowUp(report)}
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
              <Link
                href={`/moderation/members/${report.reported_user_id}`}
                className="mt-2 inline-block text-sm font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950 dark:text-stone-100"
              >
                {profileLabel(report.reported_profile)}
              </Link>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {report.reported_profile?.country_code ?? "Country unknown"} ·{" "}
                {report.reported_profile?.profile_status ?? "Profile state unknown"} ·{" "}
                {report.reported_profile?.age_verified_status ?? "Verification unknown"}
              </p>
              {report.member_safety_state ? (
                <p
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${safetyStateClasses(
                    report.member_safety_state.state,
                  )}`}
                >
                  {formatMemberSafetyState(report)}
                </p>
              ) : null}
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
            {report.member_safety_state ? (
              <span
                className={`rounded-full px-3 py-2 ${safetyStateClasses(
                  report.member_safety_state.state,
                )}`}
              >
                {formatMemberSafetyState(report)}
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
              {formatEnforcementFollowUp(report) ? (
                <p className="mt-2 text-sm font-semibold text-rose-800">
                  {formatEnforcementFollowUp(report)}
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
                      {formatModerationEventBody(event)}
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
            <ReportEnforcementReview currentAdminRole={currentAdminRole} report={report} />
            <ReportNotes reportId={report.id} />
            <ReportActions currentAdminRole={currentAdminRole} reportId={report.id} status={report.status} />
          </div>
        );
      })}
    </div>
  );
}
