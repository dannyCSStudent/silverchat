"use client";

import { useState } from "react";

import { useDashboardAction } from "../use-dashboard-action";

type ReportAssignmentProps = {
  reportId: string;
  currentAssignee?: string;
};

export function ReportAssignment({ reportId, currentAssignee }: ReportAssignmentProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const [assignee, setAssignee] = useState(currentAssignee ?? "");

  return (
    <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        Case assignment
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          placeholder="Assign to moderator..."
          className="min-w-0 flex-1 rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-stone-100"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pendingKey !== null}
            onClick={() => {
              void runAction({
                path: `/api/admin/reports/${reportId}/assignment`,
                method: "POST",
                body: { assignee: assignee.trim() || null },
                successMessage: assignee.trim()
                  ? `Assigned to ${assignee.trim()}.`
                  : "Assignment cleared.",
                defaultErrorMessage: "Unable to update assignment.",
                pendingKey: `${reportId}:assignment`,
              });
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
          >
            {pendingKey === `${reportId}:assignment` ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            disabled={pendingKey !== null || assignee.length === 0}
            onClick={() => {
              setAssignee("");
              void runAction({
                path: `/api/admin/reports/${reportId}/assignment`,
                method: "POST",
                body: { assignee: null },
                successMessage: "Assignment cleared.",
                defaultErrorMessage: "Unable to clear assignment.",
                pendingKey: `${reportId}:unassign`,
              });
            }}
            className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-100"
          >
            {pendingKey === `${reportId}:unassign` ? "Clearing..." : "Clear"}
          </button>
        </div>
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
