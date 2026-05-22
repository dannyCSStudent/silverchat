"use client";

import { useState } from "react";
import type { ModerationBlock, ModerationReport } from "@repo/types";

import {
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

type ModerationExportPanelProps = {
  blocks: ModerationBlock[];
  filterLabel: string;
  reports: ModerationReport[];
};

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildReportsRows(reports: ModerationReport[]) {
  return [
    [
      "report_id",
      "created_at",
      "status",
      "reason",
      "details",
      "reporter_user_id",
      "reporter_name",
      "reported_user_id",
      "reported_name",
      "session_id",
      "assignee",
      "latest_enforcement",
      "latest_review",
      "member_safety_state",
    ],
    ...reports.map((report) => [
      report.id,
      report.created_at,
      report.status,
      report.reason,
      report.details ?? "",
      report.reporter_user_id,
      report.reporter_profile?.display_name ?? "",
      report.reported_user_id,
      report.reported_profile?.display_name ?? "",
      report.session?.id ?? "",
      report.current_assignee_admin_user?.display_name ??
        report.current_assignee ??
        "",
      report.latest_enforcement?.action ?? "",
      report.latest_enforcement_review?.action ?? "",
      report.member_safety_state?.state ?? "",
    ]),
  ];
}

function buildBlocksRows(blocks: ModerationBlock[]) {
  return [
    [
      "block_id",
      "created_at",
      "blocker_user_id",
      "blocker_name",
      "blocked_user_id",
      "blocked_name",
      "reason",
    ],
    ...blocks.map((block) => [
      block.id,
      block.created_at,
      block.blocker_user_id,
      block.blocker_profile?.display_name ?? "",
      block.blocked_user_id,
      block.blocked_profile?.display_name ?? "",
      block.reason ?? "",
    ]),
  ];
}

function buildEventsRows(reports: ModerationReport[]) {
  const seenEventIds = new Set<string>();
  const eventRows = reports.flatMap((report) =>
    (report.events ?? [])
      .filter((event) => {
        if (seenEventIds.has(event.id)) {
          return false;
        }

        seenEventIds.add(event.id);
        return true;
      })
      .map((event) => [
        event.id,
        event.created_at ?? "",
        event.event_type,
        event.subject_user_id ?? report.reported_user_id,
        report.id,
        report.reason,
        event.actor_admin_user?.display_name ??
          event.actor_admin_user?.username ??
          "",
        event.actor_admin_user?.role ?? "",
        JSON.stringify(event.payload ?? {}),
      ]),
  );

  return [
    [
      "event_id",
      "created_at",
      "event_type",
      "subject_user_id",
      "report_id",
      "report_reason",
      "actor_admin_user",
      "actor_admin_role",
      "payload_json",
    ],
    ...eventRows,
  ];
}

function fileSafeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "all";
}

export function ModerationExportPanel({
  blocks,
  filterLabel,
  reports,
}: ModerationExportPanelProps) {
  const { currentHealth } = useLiveAdminHealth();
  const [pendingExport, setPendingExport] = useState<"blocks" | "events" | "reports" | null>(null);
  const hasFailedAdminRoute = currentHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = currentHealth.statuses.some(
    (status) => (status.durationMs ?? 0) >= 2000,
  );
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(currentHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);
  const today = new Date().toISOString().slice(0, 10);
  const label = fileSafeLabel(filterLabel);

  return (
    <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
          Export current view
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${workflowMode.classes}`}
        >
          {workflowMode.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Download the current filtered moderation queue and block signals as CSV.
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Filter scope: {filterLabel}
      </p>
      {(hasFailedAdminRoute || hasVerySlowAdminRoute) ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="text-xs font-medium">
            {recommendedBehavior.steps.join(" · ")}
          </p>
          <p className="mt-2 text-xs">
            {hasFailedAdminRoute
              ? "Exported files may reflect an incomplete queue while the admin path is degraded."
              : "Exported files may lag behind the latest moderation actions while the admin path is very slow."}
          </p>
          {highestAttentionRoute ? (
            <LocalRecoveryHint
              route={highestAttentionRoute}
              className="mt-2 flex flex-wrap items-center gap-2 text-xs"
              endpointClassName="rounded-full border border-current/20 bg-white/60 px-3 py-1 font-semibold transition hover:bg-white/80"
            />
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setPendingExport("reports");
            downloadCsv(
              `moderation-reports-${label}-${today}.csv`,
              buildReportsRows(reports),
            );
            setPendingExport(null);
          }}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
          disabled={pendingExport !== null}
        >
          {pendingExport === "reports"
            ? "Preparing reports..."
            : `Export reports (${reports.length})`}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingExport("blocks");
            downloadCsv(
              `moderation-blocks-${label}-${today}.csv`,
              buildBlocksRows(blocks),
            );
            setPendingExport(null);
          }}
          className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
          disabled={pendingExport !== null}
        >
          {pendingExport === "blocks"
            ? "Preparing blocks..."
            : `Export blocks (${blocks.length})`}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingExport("events");
            downloadCsv(
              `moderation-events-${label}-${today}.csv`,
              buildEventsRows(reports),
            );
            setPendingExport(null);
          }}
          className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
          disabled={pendingExport !== null}
        >
          {pendingExport === "events"
            ? "Preparing events..."
            : `Export events (${reports.reduce((count, report) => count + (report.events?.length ?? 0), 0)})`}
        </button>
      </div>
    </div>
  );
}
