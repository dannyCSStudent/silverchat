"use client";

import { useState } from "react";
import type { ModerationReport } from "@repo/types";

import { useDashboardAction } from "../use-dashboard-action";
import { useLiveAdminHealth } from "./use-live-admin-health";

type ReportEnforcementReviewProps = {
  currentAdminRole?: "moderator" | "lead" | "admin";
  report: ModerationReport;
};

export function ReportEnforcementReview({
  currentAdminRole,
  report,
}: ReportEnforcementReviewProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const { currentHealth: liveAdminHealth } = useLiveAdminHealth();
  const [durationHours, setDurationHours] = useState("72");
  const [note, setNote] = useState("");
  const enforcement = report.latest_enforcement;
  const review = report.latest_enforcement_review;
  const canReview = currentAdminRole === "lead" || currentAdminRole === "admin";
  const hasFailedAdminRoute = liveAdminHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = liveAdminHealth.statuses.some(
    (status) => status.durationMs !== null && status.durationMs >= 2000,
  );

  if (!canReview || !enforcement) {
    return null;
  }

  const reviewAlreadyClosed =
    review?.action === "lift_ban" || review?.action === "verification_completed";

  return (
    <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        Follow-up review
      </p>
      {review ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Latest review: {review.action.replaceAll("_", " ")}
          {review.actor_admin_user
            ? ` by ${review.actor_admin_user.display_name || review.actor_admin_user.username}`
            : ""}
        </p>
      ) : null}
      {enforcement.action === "temporary_ban" && !reviewAlreadyClosed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={hasFailedAdminRoute || pendingKey !== null}
            onClick={() => {
              void runAction({
                path: `/api/admin/reports/${report.id}/enforcement-review`,
                method: "POST",
                body: { action: "lift_ban", note: note.trim() || null },
                successMessage: "Temporary ban lifted.",
                defaultErrorMessage: "Unable to lift temporary ban.",
                pendingKey: `${report.id}:lift-ban`,
              });
            }}
            className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-100"
          >
            {pendingKey === `${report.id}:lift-ban` ? "Saving..." : "Lift ban"}
          </button>
          <input
            value={durationHours}
            onChange={(event) => setDurationHours(event.target.value)}
            inputMode="numeric"
            placeholder="Extend hours"
            disabled={hasFailedAdminRoute}
            className="w-36 rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-stone-100"
          />
          <button
            type="button"
            disabled={hasFailedAdminRoute || pendingKey !== null}
            onClick={() => {
              const parsedDuration = Number.parseInt(durationHours, 10);
              void runAction({
                path: `/api/admin/reports/${report.id}/enforcement-review`,
                method: "POST",
                body: {
                  action: "extend_temporary_ban",
                  duration_hours: Number.isFinite(parsedDuration) ? parsedDuration : null,
                  note: note.trim() || null,
                },
                successMessage: "Temporary ban extended.",
                defaultErrorMessage: "Unable to extend temporary ban.",
                pendingKey: `${report.id}:extend-ban`,
              });
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
          >
            {pendingKey === `${report.id}:extend-ban` ? "Saving..." : "Extend"}
          </button>
        </div>
      ) : null}
      {enforcement.action === "verification_required" && !reviewAlreadyClosed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={hasFailedAdminRoute || pendingKey !== null}
            onClick={() => {
              void runAction({
                path: `/api/admin/reports/${report.id}/enforcement-review`,
                method: "POST",
                body: { action: "verification_completed", note: note.trim() || null },
                successMessage: "Verification follow-up completed.",
                defaultErrorMessage: "Unable to complete verification follow-up.",
                pendingKey: `${report.id}:verification-complete`,
              });
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
          >
            {pendingKey === `${report.id}:verification-complete`
              ? "Saving..."
              : "Mark verification complete"}
          </button>
        </div>
      ) : null}
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add follow-up review context..."
        disabled={hasFailedAdminRoute}
        className="mt-3 min-h-20 w-full rounded-2xl border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-stone-100"
      />
      {hasFailedAdminRoute ? (
        <p className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-300">
          Follow-up review actions are temporarily paused because one or more admin routes are failing.
        </p>
      ) : hasVerySlowAdminRoute ? (
        <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
          Follow-up review actions are available, but admin-route latency is high and updates may reflect slowly.
        </p>
      ) : null}
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
