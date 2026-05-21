"use client";

import { useDashboardAction } from "../use-dashboard-action";
import { useLiveAdminHealth } from "./use-live-admin-health";

type ReportActionsProps = {
  currentAdminRole?: "moderator" | "lead" | "admin";
  reportId: string;
  status?: "open" | "reviewing" | "resolved" | "dismissed";
};

const STATUS_OPTIONS = [
  { label: "Mark reviewing", value: "reviewing" },
  { label: "Resolve", value: "resolved" },
  { label: "Dismiss", value: "dismissed" },
] as const;

export function ReportActions({ currentAdminRole, reportId, status }: ReportActionsProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const { currentHealth: liveAdminHealth } = useLiveAdminHealth();
  const visibleOptions = STATUS_OPTIONS.filter((option) =>
    option.value === "reviewing" ? true : currentAdminRole === "lead" || currentAdminRole === "admin",
  );
  const hasFailedAdminRoute = liveAdminHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = liveAdminHealth.statuses.some(
    (status) => status.durationMs !== null && status.durationMs >= 2000,
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((option) => {
          const isCurrent = status === option.value;
          const actionKey = `${reportId}:${option.value}`;

          return (
            <button
              key={option.value}
              type="button"
              disabled={hasFailedAdminRoute || pendingKey !== null || isCurrent}
              onClick={() => {
                void runAction({
                  path: `/api/admin/reports/${reportId}`,
                  method: "PATCH",
                  body: { status: option.value },
                  successMessage: `Report marked ${option.value}.`,
                  defaultErrorMessage: "Unable to update report status.",
                  pendingKey: actionKey,
                });
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                isCurrent
                  ? "cursor-default bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                  : "border border-(--color-line) bg-(--color-surface-strong) text-slate-800 hover:bg-(--color-chip-muted) dark:text-stone-100"
              }`}
            >
              {pendingKey === actionKey ? "Saving..." : option.label}
            </button>
          );
        })}
      </div>
      {hasFailedAdminRoute ? (
        <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
          Status updates are temporarily paused because one or more admin routes are failing.
        </p>
      ) : hasVerySlowAdminRoute ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Status updates are available, but admin-route latency is high and changes may reflect slowly.
        </p>
      ) : null}
      {currentAdminRole === "moderator" ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Moderators can move cases into review. Lead and admin roles can resolve or dismiss.
        </p>
      ) : null}

      {success ? (
        <button
          type="button"
          onClick={clearMessages}
          className="text-left text-xs font-medium text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </button>
      ) : null}
      {error ? (
        <button
          type="button"
          onClick={clearMessages}
          className="text-left text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {error}
        </button>
      ) : null}
    </div>
  );
}
