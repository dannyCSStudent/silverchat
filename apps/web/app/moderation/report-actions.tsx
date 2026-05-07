"use client";

import { useDashboardAction } from "../use-dashboard-action";

type ReportActionsProps = {
  reportId: string;
  status?: "open" | "reviewing" | "resolved" | "dismissed";
};

const STATUS_OPTIONS = [
  { label: "Mark reviewing", value: "reviewing" },
  { label: "Resolve", value: "resolved" },
  { label: "Dismiss", value: "dismissed" },
] as const;

export function ReportActions({ reportId, status }: ReportActionsProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isCurrent = status === option.value;
          const actionKey = `${reportId}:${option.value}`;

          return (
            <button
              key={option.value}
              type="button"
              disabled={pendingKey !== null || isCurrent}
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
