"use client";

import { useState } from "react";

import { useDashboardAction } from "../use-dashboard-action";
import { useLiveAdminHealth } from "./use-live-admin-health";

type ReportEnforcementProps = {
  currentAdminRole?: "moderator" | "lead" | "admin";
  reportId: string;
};

const ENFORCEMENT_OPTIONS = [
  { label: "Warning", value: "warning" },
  { label: "Require verification", value: "verification_required" },
  { label: "Temporary ban", value: "temporary_ban" },
  { label: "Permanent ban", value: "permanent_ban" },
] as const;

export function ReportEnforcement({
  currentAdminRole,
  reportId,
}: ReportEnforcementProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const { currentHealth: liveAdminHealth } = useLiveAdminHealth();
  const [action, setAction] =
    useState<(typeof ENFORCEMENT_OPTIONS)[number]["value"]>("warning");
  const [durationHours, setDurationHours] = useState("72");
  const [note, setNote] = useState("");
  const canEnforce = currentAdminRole === "lead" || currentAdminRole === "admin";
  const hasFailedAdminRoute = liveAdminHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = liveAdminHealth.statuses.some(
    (status) => status.durationMs !== null && status.durationMs >= 2000,
  );

  if (!canEnforce) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        Enforcement
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_180px]">
        <select
          value={action}
          onChange={(event) => setAction(event.target.value as (typeof ENFORCEMENT_OPTIONS)[number]["value"])}
          disabled={hasFailedAdminRoute}
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none dark:text-stone-100"
        >
          {ENFORCEMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={durationHours}
          onChange={(event) => setDurationHours(event.target.value)}
          placeholder="Hours for temp ban"
          disabled={hasFailedAdminRoute || action !== "temporary_ban"}
          inputMode="numeric"
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-stone-100"
        />
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Record why this enforcement action is appropriate..."
        disabled={hasFailedAdminRoute}
        className="mt-3 min-h-24 w-full rounded-2xl border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-stone-100"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={hasFailedAdminRoute || pendingKey !== null}
          onClick={() => {
            const trimmedNote = note.trim();
            const parsedDuration =
              action === "temporary_ban" ? Number.parseInt(durationHours, 10) : undefined;
            void runAction({
              path: `/api/admin/reports/${reportId}/enforcement`,
              method: "POST",
              body: {
                action,
                duration_hours:
                  action === "temporary_ban" && Number.isFinite(parsedDuration)
                    ? parsedDuration
                    : null,
                note: trimmedNote || null,
              },
              successMessage: "Enforcement action recorded.",
              defaultErrorMessage: "Unable to record enforcement action.",
              pendingKey: `${reportId}:enforcement`,
            }).then((didSucceed) => {
              if (didSucceed) {
                setNote("");
              }
            });
          }}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
        >
          {pendingKey === `${reportId}:enforcement` ? "Saving..." : "Record action"}
        </button>
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
      {hasFailedAdminRoute ? (
        <p className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-300">
          Enforcement actions are temporarily paused because one or more admin routes are failing.
        </p>
      ) : hasVerySlowAdminRoute ? (
        <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
          Enforcement actions are available, but admin-route latency is high and updates may reflect slowly.
        </p>
      ) : null}
    </div>
  );
}
