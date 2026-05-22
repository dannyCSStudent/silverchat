"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminUser } from "@repo/types";

import { useDashboardAction } from "../use-dashboard-action";
import {
  getActiveGuardrails,
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import {
  rankAssignmentTargets,
  requiresElevatedCapability,
  roleRank,
  type ModeratorWorkloadSnapshot,
} from "./assignment-targets";
import { useLiveAdminHealth } from "./use-live-admin-health";

const MAX_REBALANCE_BATCH_SIZE = 3;

type UrgentCasePreview = {
  attentionTitle: string;
  memberLabel: string;
  reason: string;
  reportId: string;
};

type WorkloadRebalanceProps = {
  adminUsers: AdminUser[];
  adminWorkloads: ModeratorWorkloadSnapshot[];
  currentAdminRole?: "moderator" | "lead" | "admin";
  fromAdminUserId: string;
  fromAdminUserLabel: string;
  urgentCases: UrgentCasePreview[];
};

export function WorkloadRebalance({
  adminUsers,
  adminWorkloads,
  currentAdminRole,
  fromAdminUserId,
  fromAdminUserLabel,
  urgentCases,
}: WorkloadRebalanceProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const { currentHealth: liveAdminHealth } = useLiveAdminHealth();
  const [targetAdminUserId, setTargetAdminUserId] = useState("");
  const canRebalance =
    currentAdminRole === "lead" || currentAdminRole === "admin";
  const hasFailedAdminRoute = liveAdminHealth.statuses.some((status) => !status.ok);
  const workflowMode = getWorkflowMode(liveAdminHealth.statuses);
  const activeGuardrails = getActiveGuardrails(liveAdminHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(liveAdminHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(liveAdminHealth.statuses);
  const urgentBatch = urgentCases.slice(0, MAX_REBALANCE_BATCH_SIZE);
  const batchNeedsElevatedCapability = requiresElevatedCapability(
    urgentBatch.map((urgentCase) => urgentCase.attentionTitle),
  );
  const minimumTargetRoleRank = batchNeedsElevatedCapability ? 2 : 1;
  const availableTargets = adminUsers.filter(
    (adminUser) => adminUser.id !== fromAdminUserId,
  );
  const rankedTargets = rankAssignmentTargets({
    adminUsers,
    adminWorkloads,
    excludeAdminUserId: fromAdminUserId,
    minimumRoleRank: minimumTargetRoleRank,
  });
  const recommendedTarget = rankedTargets[0];
  const selectedAdminUser = adminUsers.find(
    (adminUser) => adminUser.id === targetAdminUserId,
  );
  const sourceAdminWorkload = adminWorkloads.find(
    (workload) => workload.adminUserId === fromAdminUserId,
  );
  const selectedAdminWorkload = adminWorkloads.find(
    (workload) => workload.adminUserId === targetAdminUserId,
  );
  const sourceOpenAfterMove = Math.max(
    (sourceAdminWorkload?.openAssignedCount ?? 0) - urgentBatch.length,
    0,
  );
  const sourceUrgentAfterMove = Math.max(
    (sourceAdminWorkload?.urgentAssignedCount ?? 0) - urgentBatch.length,
    0,
  );
  const sourceAssignedAfterMove = Math.max(
    (sourceAdminWorkload?.totalAssignedCount ?? 0) - urgentBatch.length,
    0,
  );
  const destinationOpenAfterMove =
    (selectedAdminWorkload?.openAssignedCount ?? 0) + urgentBatch.length;
  const destinationUrgentAfterMove =
    (selectedAdminWorkload?.urgentAssignedCount ?? 0) + urgentBatch.length;
  const destinationAssignedAfterMove =
    (selectedAdminWorkload?.totalAssignedCount ?? 0) + urgentBatch.length;
  const highestOtherUrgentCount = Math.max(
    0,
    ...adminWorkloads
      .filter((workload) => workload.adminUserId !== targetAdminUserId)
      .map((workload) =>
        workload.adminUserId === fromAdminUserId
          ? sourceUrgentAfterMove
          : workload.urgentAssignedCount,
      ),
  );
  const destinationWouldLeadUrgentLoad =
    Boolean(selectedAdminUser) &&
    destinationUrgentAfterMove > highestOtherUrgentCount;
  const destinationWouldTieUrgentLead =
    Boolean(selectedAdminUser) &&
    destinationUrgentAfterMove === highestOtherUrgentCount &&
    destinationUrgentAfterMove > 0;
  const remainingUrgentCount = Math.max(
    urgentCases.length - urgentBatch.length,
    0,
  );

  if (!canRebalance || urgentCases.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Rebalance urgent cases
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${workflowMode.classes}`}
        >
          {workflowMode.label}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {activeGuardrails.join(" · ")}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        What to do now: {recommendedBehavior.steps.join(" · ")}
      </p>
      {highestAttentionRoute ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Check next: {highestAttentionRoute.label} · {highestAttentionRoute.hint}
          </span>
          <Link
            href={highestAttentionRoute.endpointHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-3 py-1 font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
          >
            Open endpoint
          </Link>
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <select
          value={targetAdminUserId}
          onChange={(event) => setTargetAdminUserId(event.target.value)}
          disabled={hasFailedAdminRoute}
          className="min-w-0 flex-1 rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-3 text-sm text-slate-900 outline-none dark:text-stone-100"
        >
          <option value="">Move to moderator...</option>
          {availableTargets.map((adminUser) => (
            <option
              key={adminUser.id}
              value={adminUser.id}
              disabled={roleRank(adminUser.role) < minimumTargetRoleRank}
            >
              {(adminUser.display_name || adminUser.username) +
                ` (${adminUser.role})` +
                (roleRank(adminUser.role) < minimumTargetRoleRank
                  ? " - needs lead/admin capability"
                  : "")}
            </option>
          ))}
        </select>
        {recommendedTarget ? (
          <button
            type="button"
            onClick={() => setTargetAdminUserId(recommendedTarget.adminUser.id)}
            disabled={hasFailedAdminRoute}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:opacity-92"
          >
            Use recommended
          </button>
        ) : null}
        <button
          type="button"
          disabled={
            hasFailedAdminRoute || pendingKey !== null || targetAdminUserId.length === 0
          }
          onClick={async () => {
            if (!selectedAdminUser) {
              return;
            }

            const confirmed = window.confirm(
              `Move ${urgentBatch.length} urgent case${
                urgentBatch.length === 1 ? "" : "s"
              } to ${selectedAdminUser.display_name || selectedAdminUser.username}?${
                remainingUrgentCount > 0
                  ? ` ${remainingUrgentCount} urgent case${
                      remainingUrgentCount === 1 ? "" : "s"
                    } will stay assigned for now.`
                  : ""
              }`,
            );
            if (!confirmed) {
              return;
            }

            for (const urgentCase of urgentBatch) {
              const ok = await runAction({
                path: `/api/admin/reports/${urgentCase.reportId}/assignment`,
                method: "POST",
                body: { assignee_admin_user_id: targetAdminUserId },
                successMessage: `Moved ${urgentBatch.length} urgent case${urgentBatch.length === 1 ? "" : "s"} to ${selectedAdminUser.display_name || selectedAdminUser.username}.`,
                defaultErrorMessage: "Unable to rebalance urgent cases.",
                pendingKey: `rebalance:${fromAdminUserId}`,
              });
              if (!ok) {
                break;
              }
            }
          }}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
        >
          {pendingKey === `rebalance:${fromAdminUserId}`
            ? "Reassigning..."
            : `Move ${urgentBatch.length} urgent ${urgentBatch.length === 1 ? "case" : "cases"}`}
        </button>
      </div>
      {recommendedTarget ? (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          Recommended destination: {recommendedTarget.adminUser.display_name || recommendedTarget.adminUser.username}
          {` · ${recommendedTarget.urgentAssignedCount} urgent, ${recommendedTarget.openAssignedCount} open, ${recommendedTarget.totalAssignedCount} assigned`}
          {` · ${recommendedTarget.recommendationReason}`}
        </p>
      ) : null}
      {batchNeedsElevatedCapability ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          This urgent batch includes enforcement follow-up, so recommendation and target selection are limited to `lead` and `admin` moderators.
        </p>
      ) : null}
      {hasFailedAdminRoute ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
          Rebalancing is temporarily disabled because one or more admin routes are failing. Wait for the admin path to recover before moving urgent workload in bulk.
        </p>
      ) : null}
      {hasFailedAdminRoute && highestAttentionRoute ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          <p>
            Most relevant route right now: <span className="font-semibold">{highestAttentionRoute.label}</span>
            {` · ${highestAttentionRoute.path}. `}
            {highestAttentionRoute.hint}
          </p>
          <Link
            href={highestAttentionRoute.endpointHref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex rounded-full border border-rose-300 bg-white/70 px-3 py-1 font-semibold text-rose-900 transition hover:bg-white"
          >
            Open endpoint
          </Link>
        </div>
      ) : null}
      <div className="mt-3 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Source impact
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-stone-100">
          {fromAdminUserLabel}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-(--color-surface) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Assigned
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {sourceAdminWorkload?.totalAssignedCount ?? 0} to {sourceAssignedAfterMove}
            </p>
          </div>
          <div className="rounded-2xl bg-(--color-surface) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Open
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {sourceAdminWorkload?.openAssignedCount ?? 0} to {sourceOpenAfterMove}
            </p>
          </div>
          <div className="rounded-2xl bg-(--color-surface) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Urgent
            </p>
            <p className="mt-1 text-lg font-semibold text-rose-950">
              {sourceAdminWorkload?.urgentAssignedCount ?? 0} to {sourceUrgentAfterMove}
            </p>
          </div>
        </div>
      </div>
      {selectedAdminUser ? (
        <div className="mt-3 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Destination impact
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-stone-100">
            {selectedAdminUser.display_name || selectedAdminUser.username}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-(--color-surface) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Assigned
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
                {selectedAdminWorkload?.totalAssignedCount ?? 0} to {destinationAssignedAfterMove}
              </p>
            </div>
            <div className="rounded-2xl bg-(--color-surface) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Open
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
                {selectedAdminWorkload?.openAssignedCount ?? 0} to {destinationOpenAfterMove}
              </p>
            </div>
            <div className="rounded-2xl bg-(--color-surface) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Urgent
              </p>
              <p className="mt-1 text-lg font-semibold text-rose-950">
                {selectedAdminWorkload?.urgentAssignedCount ?? 0} to {destinationUrgentAfterMove}
              </p>
            </div>
          </div>
          {destinationWouldLeadUrgentLoad ? (
            <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
              Warning: this move would make {selectedAdminUser.display_name || selectedAdminUser.username} the heaviest urgent owner on the team.
            </p>
          ) : null}
          {!destinationWouldLeadUrgentLoad && destinationWouldTieUrgentLead ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Heads up: this move would tie {selectedAdminUser.display_name || selectedAdminUser.username} for the highest urgent load on the team.
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Rebalancing moves at most {MAX_REBALANCE_BATCH_SIZE} urgent cases at once.
        {remainingUrgentCount > 0
          ? ` ${remainingUrgentCount} additional urgent case${remainingUrgentCount === 1 ? "" : "s"} will stay with the current moderator after this batch.`
          : ""}
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Next batch preview:
      </p>
      <div className="mt-2 space-y-2">
        {urgentBatch.map((urgentCase) => (
          <div
            key={urgentCase.reportId}
            className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) px-3 py-2 text-xs text-slate-600 dark:text-slate-300"
          >
            <p className="font-semibold text-slate-900 dark:text-stone-100">
              {urgentCase.memberLabel} · {urgentCase.reason}
            </p>
            <p className="mt-1">
              {urgentCase.attentionTitle} · {urgentCase.reportId}
            </p>
          </div>
        ))}
      </div>
      {success ? (
        <button
          type="button"
          onClick={clearMessages}
          className="mt-3 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </button>
      ) : null}
      {error ? (
        <button
          type="button"
          onClick={clearMessages}
          className="mt-3 text-left text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {error}
        </button>
      ) : null}
    </div>
  );
}
