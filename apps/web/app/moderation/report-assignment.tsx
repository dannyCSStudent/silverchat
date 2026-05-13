"use client";

import { useState } from "react";
import type { AdminUser } from "@repo/types";

import { useDashboardAction } from "../use-dashboard-action";

type ReportAssignmentProps = {
  adminUsers: AdminUser[];
  currentAdminUserId?: string;
  currentAdminUsername?: string;
  currentAdminRole?: "moderator" | "lead" | "admin";
  reportId: string;
  currentAssigneeAdminUserId?: string;
  currentAssignee?: string;
};

export function ReportAssignment({
  adminUsers,
  currentAdminUserId,
  currentAdminUsername,
  currentAdminRole,
  reportId,
  currentAssigneeAdminUserId,
  currentAssignee,
}: ReportAssignmentProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const [assigneeAdminUserId, setAssigneeAdminUserId] = useState(currentAssigneeAdminUserId ?? "");
  const canManageOtherAssignees =
    currentAdminRole === "lead" || currentAdminRole === "admin";
  const canClearAssignment =
    canManageOtherAssignees ||
    (currentAdminUsername !== undefined && currentAssignee === currentAdminUsername);

  return (
    <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        Case assignment
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <select
          value={assigneeAdminUserId}
          onChange={(event) => setAssigneeAdminUserId(event.target.value)}
          disabled={!canManageOtherAssignees}
          className="min-w-0 flex-1 rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-stone-100"
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
                void runAction({
                  path: `/api/admin/reports/${reportId}/assignment`,
                  method: "POST",
                  body: { assignee_admin_user_id: currentAdminUserId },
                  successMessage: `Assigned to ${currentAdminUsername}.`,
                  defaultErrorMessage: "Unable to assign to current moderator.",
                  pendingKey: `${reportId}:assign-me`,
                });
              }}
              className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-100"
            >
              {pendingKey === `${reportId}:assign-me` ? "Assigning..." : "Assign to me"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={pendingKey !== null || !canManageOtherAssignees}
            onClick={() => {
              const selectedAdminUser = adminUsers.find(
                (adminUser) => adminUser.id === assigneeAdminUserId,
              );
              void runAction({
                path: `/api/admin/reports/${reportId}/assignment`,
                method: "POST",
                body: { assignee_admin_user_id: assigneeAdminUserId || null },
                successMessage: selectedAdminUser
                  ? `Assigned to ${selectedAdminUser.display_name || selectedAdminUser.username}.`
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
            disabled={pendingKey !== null || assigneeAdminUserId.length === 0 || !canClearAssignment}
            onClick={() => {
              setAssigneeAdminUserId("");
              void runAction({
                path: `/api/admin/reports/${reportId}/assignment`,
                method: "POST",
                body: { assignee_admin_user_id: null },
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
      {canManageOtherAssignees ? null : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Moderators can only claim cases for themselves and clear assignments they currently own.
        </p>
      )}
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
