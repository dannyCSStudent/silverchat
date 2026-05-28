"use client";

import { useState } from "react";
import type { ModerationBlock, ModerationExportSnapshot, ModerationReport } from "@repo/types";

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

function formatDurationMs(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / (60 * 1000)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
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

function buildSummaryRows(reports: ModerationReport[]) {
  const perModerator = new Map<
    string,
    {
      actorRole: string;
      enforcementActions: number;
      noteEvents: number;
      reviewActions: number;
      statusChanges: number;
      totalEvents: number;
    }
  >();
  let totalEvents = 0;
  let totalStatusChanges = 0;
  let totalNotes = 0;
  let totalEnforcementActions = 0;
  let totalReviewActions = 0;

  const seenEventIds = new Set<string>();
  for (const report of reports) {
    for (const event of report.events ?? []) {
      if (seenEventIds.has(event.id)) {
        continue;
      }
      seenEventIds.add(event.id);

      totalEvents += 1;
      const actorLabel =
        event.actor_admin_user?.display_name ??
        event.actor_admin_user?.username ??
        "Unattributed";
      const actorRole = event.actor_admin_user?.role ?? "";
      const current =
        perModerator.get(actorLabel) ??
        {
          actorRole,
          enforcementActions: 0,
          noteEvents: 0,
          reviewActions: 0,
          statusChanges: 0,
          totalEvents: 0,
        };
      current.totalEvents += 1;
      if (!current.actorRole && actorRole) {
        current.actorRole = actorRole;
      }

      if (event.event_type === "report_status_changed") {
        current.statusChanges += 1;
        totalStatusChanges += 1;
      } else if (event.event_type === "moderation_note_added") {
        current.noteEvents += 1;
        totalNotes += 1;
      } else if (event.event_type === "enforcement_action_recorded") {
        current.enforcementActions += 1;
        totalEnforcementActions += 1;
      } else if (event.event_type === "enforcement_review_recorded") {
        current.reviewActions += 1;
        totalReviewActions += 1;
      }

      perModerator.set(actorLabel, current);
    }
  }

  return [
    [
      "summary_type",
      "label",
      "role",
      "report_count",
      "block_count",
      "event_count",
      "status_changes",
      "notes",
      "enforcement_actions",
      "enforcement_reviews",
    ],
    [
      "overview",
      "current_filtered_view",
      "",
      reports.length,
      "",
      totalEvents,
      totalStatusChanges,
      totalNotes,
      totalEnforcementActions,
      totalReviewActions,
    ],
    ...Array.from(perModerator.entries()).map(([actorLabel, counts]) => [
      "moderator",
      actorLabel,
      counts.actorRole,
      reports.filter((report) =>
        (report.events ?? []).some(
          (event) =>
            (event.actor_admin_user?.display_name ??
              event.actor_admin_user?.username ??
              "Unattributed") === actorLabel,
        ),
      ).length,
      "",
      counts.totalEvents,
      counts.statusChanges,
      counts.noteEvents,
      counts.enforcementActions,
      counts.reviewActions,
    ]),
  ];
}

function buildSummaryPreview(reports: ModerationReport[]) {
  const rows = buildSummaryRows(reports);
  const [, overviewRow, ...moderatorRows] = rows;
  const dailyPressureCounts = new Map<string, number>();
  const enforcementTrendCounts = new Map<string, number>();
  const enforcementCounts = new Map<string, number>();
  const enforcementLeaderRows = new Map<
    string,
    { enforcementCount: number; role: string }
  >();
  const moderatorActivityCounts = new Map<string, number>();
  const moderatorActivityLeaders = new Map<
    string,
    { eventCount: number; role: string }
  >();
  const reasonCounts = new Map<string, number>();
  const resolutionTrendCounts = new Map<string, number>();
  const safetyStateCounts = new Map<string, number>();
  const statusTrendCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const seenEventIds = new Set<string>();

  for (const report of reports) {
    const enforcement = report.latest_enforcement?.action || "none";
    const reason = report.reason || "unknown";
    const safetyState = report.member_safety_state?.state || "clear";
    const status = report.status || "open";
    const reportDay = report.created_at?.slice(0, 10);
    enforcementCounts.set(enforcement, (enforcementCounts.get(enforcement) ?? 0) + 1);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    safetyStateCounts.set(safetyState, (safetyStateCounts.get(safetyState) ?? 0) + 1);
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    if (reportDay) {
      dailyPressureCounts.set(reportDay, (dailyPressureCounts.get(reportDay) ?? 0) + 1);
    }

    for (const event of report.events ?? []) {
      if (seenEventIds.has(event.id)) {
        continue;
      }
      seenEventIds.add(event.id);

      const eventDay = event.created_at?.slice(0, 10);
      if (!eventDay) {
        continue;
      }

      moderatorActivityCounts.set(
        eventDay,
        (moderatorActivityCounts.get(eventDay) ?? 0) + 1,
      );
      const actorLabel =
        event.actor_admin_user?.display_name ??
        event.actor_admin_user?.username ??
        "Unattributed";
      const actorRole = event.actor_admin_user?.role ?? "";
      const existingLeader =
        moderatorActivityLeaders.get(actorLabel) ?? {
          eventCount: 0,
          role: actorRole,
        };
      existingLeader.eventCount += 1;
      if (!existingLeader.role && actorRole) {
        existingLeader.role = actorRole;
      }
      moderatorActivityLeaders.set(actorLabel, existingLeader);

      if (event.event_type === "report_status_changed") {
        statusTrendCounts.set(
          eventDay,
          (statusTrendCounts.get(eventDay) ?? 0) + 1,
        );
        const nextStatus = String(event.payload?.to_status ?? "");
        if (nextStatus === "resolved" || nextStatus === "dismissed") {
          resolutionTrendCounts.set(
            eventDay,
            (resolutionTrendCounts.get(eventDay) ?? 0) + 1,
          );
        }
      } else if (event.event_type === "enforcement_action_recorded") {
        enforcementTrendCounts.set(
          eventDay,
          (enforcementTrendCounts.get(eventDay) ?? 0) + 1,
        );
        const existingEnforcementLeader =
          enforcementLeaderRows.get(actorLabel) ?? {
            enforcementCount: 0,
            role: actorRole,
          };
        existingEnforcementLeader.enforcementCount += 1;
        if (!existingEnforcementLeader.role && actorRole) {
          existingEnforcementLeader.role = actorRole;
        }
        enforcementLeaderRows.set(actorLabel, existingEnforcementLeader);
      }
    }
  }

  return {
    moderatorRows: moderatorRows.map((row) => ({
      actor: String(row[1] ?? ""),
      enforcementActions: Number(row[8] ?? 0),
      noteEvents: Number(row[7] ?? 0),
      reviewActions: Number(row[9] ?? 0),
      role: String(row[2] ?? ""),
      statusChanges: Number(row[6] ?? 0),
      totalEvents: Number(row[5] ?? 0),
    })),
    overview: {
      enforcementActions: Number(overviewRow?.[8] ?? 0),
      eventCount: Number(overviewRow?.[5] ?? 0),
      noteCount: Number(overviewRow?.[7] ?? 0),
      reportCount: Number(overviewRow?.[3] ?? 0),
      reviewCount: Number(overviewRow?.[9] ?? 0),
      statusChangeCount: Number(overviewRow?.[6] ?? 0),
    },
    pressureTrendRows: Array.from(dailyPressureCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day))
      .slice(-7),
    reasonRows: Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count),
    statusRows: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count),
    enforcementRows: Array.from(enforcementCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((left, right) => right.count - left.count),
    moderatorActivityTrendRows: Array.from(moderatorActivityCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day))
      .slice(-7),
    moderatorLeaderRows: Array.from(moderatorActivityLeaders.entries())
      .map(([actor, value]) => ({
        actor,
        role: value.role,
        eventCount: value.eventCount,
      }))
      .sort((left, right) => right.eventCount - left.eventCount)
      .slice(0, 5),
    enforcementLeaderRows: Array.from(enforcementLeaderRows.entries())
      .map(([actor, value]) => ({
        actor,
        role: value.role,
        enforcementCount: value.enforcementCount,
      }))
      .sort((left, right) => right.enforcementCount - left.enforcementCount)
      .slice(0, 5),
    safetyStateRows: Array.from(safetyStateCounts.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((left, right) => right.count - left.count),
    enforcementTrendRows: Array.from(enforcementTrendCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day))
      .slice(-7),
    resolutionTrendRows: Array.from(resolutionTrendCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day))
      .slice(-7),
    statusTrendRows: Array.from(statusTrendCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day))
      .slice(-7),
    pressureVsResolvedRows: Array.from(
      new Set([
        ...dailyPressureCounts.keys(),
        ...resolutionTrendCounts.keys(),
      ]),
    )
      .sort((left, right) => left.localeCompare(right))
      .slice(-7)
      .map((day) => {
        const pressure = dailyPressureCounts.get(day) ?? 0;
        const resolved = resolutionTrendCounts.get(day) ?? 0;
        return {
          day,
          pressure,
          resolved,
          delta: pressure - resolved,
        };
      }),
  };
}

function buildSlaPreview(reports: ModerationReport[]) {
  const resolvedReports = reports.filter((report) =>
    (report.status ?? "open") === "resolved" || (report.status ?? "open") === "dismissed",
  );
  const firstActionDelays = reports
    .map((report) => {
      if (!report.created_at) {
        return null;
      }

      const createdAt = new Date(report.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }

      const firstAction = [...(report.events ?? [])]
        .filter((event) => Boolean(event.created_at))
        .sort((left, right) => {
          const leftTime = new Date(left.created_at ?? 0).getTime();
          const rightTime = new Date(right.created_at ?? 0).getTime();
          return leftTime - rightTime;
        })[0];

      if (!firstAction?.created_at) {
        return null;
      }

      const actionAt = new Date(firstAction.created_at);
      if (Number.isNaN(actionAt.getTime())) {
        return null;
      }

      return actionAt.getTime() - createdAt.getTime();
    })
    .filter((value): value is number => value !== null);
  const resolutionDelays = resolvedReports
    .map((report) => {
      if (!report.created_at) {
        return null;
      }

      const createdAt = new Date(report.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }

      const resolutionEvent = [...(report.events ?? [])]
        .filter(
          (event) =>
            event.event_type === "report_status_changed" &&
            (event.payload.to_status === "resolved" ||
              event.payload.to_status === "dismissed") &&
            event.created_at,
        )
        .sort((left, right) => {
          const leftTime = new Date(left.created_at ?? 0).getTime();
          const rightTime = new Date(right.created_at ?? 0).getTime();
          return leftTime - rightTime;
        })[0];

      if (!resolutionEvent?.created_at) {
        return null;
      }

      const resolvedAt = new Date(resolutionEvent.created_at);
      if (Number.isNaN(resolvedAt.getTime())) {
        return null;
      }

      return resolvedAt.getTime() - createdAt.getTime();
    })
    .filter((value): value is number => value !== null);

  const waitingForFirstAction = reports.filter((report) => {
    const createdAt = report.created_at ? new Date(report.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return false;
    }
    return (report.events?.length ?? 0) === 0 && Date.now() - createdAt.getTime() >= 24 * 60 * 60 * 1000;
  }).length;

  const overdueResolution = reports.filter((report) => {
    const status = report.status ?? "open";
    if (status !== "open" && status !== "reviewing") {
      return false;
    }

    const createdAt = report.created_at ? new Date(report.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return false;
    }

    return Date.now() - createdAt.getTime() >= 48 * 60 * 60 * 1000;
  }).length;

  const averageFirstActionMs =
    firstActionDelays.length > 0
      ? firstActionDelays.reduce((total, value) => total + value, 0) / firstActionDelays.length
      : null;
  const averageResolutionMs =
    resolutionDelays.length > 0
      ? resolutionDelays.reduce((total, value) => total + value, 0) / resolutionDelays.length
      : null;

  return {
    averageFirstActionMs,
    averageResolutionMs,
    overdueResolution,
    waitingForFirstAction,
  };
}

function fileSafeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "all";
}

function formatDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  return {
    from: formatDateInputValue(start),
    to: formatDateInputValue(end),
  };
}

export function ModerationExportPanel({
  blocks,
  filterLabel,
  reports,
}: ModerationExportPanelProps) {
  const { currentHealth } = useLiveAdminHealth();
  const [pendingExport, setPendingExport] = useState<"blocks" | "events" | "reports" | "summary" | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasFailedAdminRoute = currentHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = currentHealth.statuses.some(
    (status) => (status.durationMs ?? 0) >= 2000,
  );
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(currentHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);
  const today = new Date().toISOString().slice(0, 10);
  const label = fileSafeLabel(filterLabel);
  const rangeLabel =
    dateFrom || dateTo
      ? `${dateFrom || "start"}_to_${dateTo || "now"}`
      : "all-dates";
  const withinRange = (value?: string) => {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    if (dateFrom) {
      const start = new Date(`${dateFrom}T00:00:00`);
      if (date < start) {
        return false;
      }
    }

    if (dateTo) {
      const end = new Date(`${dateTo}T23:59:59.999`);
      if (date > end) {
        return false;
      }
    }

    return true;
  };
  const scopedReports: ModerationReport[] = [];
  if (dateFrom || dateTo) {
    for (const report of reports) {
      const reportInRange = withinRange(report.created_at);
      const scopedEvents = (report.events ?? []).filter((event) =>
        withinRange(event.created_at),
      );

      if (!reportInRange && scopedEvents.length === 0) {
        continue;
      }

      scopedReports.push({
        ...report,
        events: scopedEvents,
      });
    }
  } else {
    scopedReports.push(...reports);
  }
  const scopedBlocks =
    dateFrom || dateTo
      ? blocks.filter((block) => withinRange(block.created_at))
      : blocks;
  const summaryPreview = buildSummaryPreview(scopedReports);
  const slaPreview = buildSlaPreview(scopedReports);

  async function loadExportSnapshot() {
    try {
      const response = await fetch("/api/admin/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          block_ids: scopedBlocks.map((block) => block.id),
          report_ids: scopedReports.map((report) => report.id),
        }),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as ModerationExportSnapshot;
    } catch {
      return null;
    }
  }

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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="rounded-2xl border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-700 dark:text-stone-200">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Date from
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="mt-2 block w-full rounded-xl border border-(--color-line) bg-(--color-surface-strong) px-3 py-2 text-sm outline-none"
          />
        </label>
        <label className="rounded-2xl border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-700 dark:text-stone-200">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Date to
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="mt-2 block w-full rounded-xl border border-(--color-line) bg-(--color-surface-strong) px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const todayRange = getPresetRange(1);
            setDateFrom(todayRange.from);
            setDateTo(todayRange.to);
          }}
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            const last7Days = getPresetRange(7);
            setDateFrom(last7Days.from);
            setDateTo(last7Days.to);
          }}
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
        >
          Last 7 days
        </button>
        <button
          type="button"
          onClick={() => {
            const last30Days = getPresetRange(30);
            setDateFrom(last30Days.from);
            setDateTo(last30Days.to);
          }}
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
        >
          Last 30 days
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Date scope: {dateFrom || dateTo ? `${dateFrom || "start"} to ${dateTo || "now"}` : "all available dates"}
        </span>
        {(dateFrom || dateTo) ? (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="rounded-full border border-(--color-line) bg-(--color-surface) px-3 py-1 font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
          >
            Clear dates
          </button>
        ) : null}
      </div>
        <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Activity summary
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                First action
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
                {slaPreview.averageFirstActionMs !== null
                  ? formatDurationMs(slaPreview.averageFirstActionMs)
                  : "No data"}
              </p>
            </div>
            <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Resolution
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
                {slaPreview.averageResolutionMs !== null
                  ? formatDurationMs(slaPreview.averageResolutionMs)
                  : "No data"}
              </p>
            </div>
            <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Waiting
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
                {slaPreview.waitingForFirstAction}
              </p>
            </div>
            <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Overdue
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
                {slaPreview.overdueResolution}
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Reports
              </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {summaryPreview.overview.reportCount}
            </p>
          </div>
          <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Events
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {summaryPreview.overview.eventCount}
            </p>
          </div>
          <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Status
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {summaryPreview.overview.statusChangeCount}
            </p>
          </div>
          <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Enforcement
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {summaryPreview.overview.enforcementActions}
            </p>
          </div>
          <div className="rounded-2xl bg-(--color-surface-strong) px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Notes
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-stone-100">
              {summaryPreview.overview.noteCount}
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-semibold">Moderator</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Events</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Notes</th>
                <th className="px-3 py-2 font-semibold">Enforcement</th>
                <th className="px-3 py-2 font-semibold">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {summaryPreview.moderatorRows.length > 0 ? (
                summaryPreview.moderatorRows.map((row) => (
                  <tr
                    key={row.actor}
                    className="border-t border-(--color-line) text-slate-700 dark:text-stone-200"
                  >
                    <td className="px-3 py-2 font-medium">{row.actor}</td>
                    <td className="px-3 py-2">{row.role || "Unknown"}</td>
                    <td className="px-3 py-2">{row.totalEvents}</td>
                    <td className="px-3 py-2">{row.statusChanges}</td>
                    <td className="px-3 py-2">{row.noteEvents}</td>
                    <td className="px-3 py-2">{row.enforcementActions}</td>
                    <td className="px-3 py-2">{row.reviewActions}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-(--color-line) text-slate-500 dark:text-slate-400">
                  <td className="px-3 py-3" colSpan={7}>
                    No moderation events in the current filtered report set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Most active moderators
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {summaryPreview.moderatorLeaderRows.length > 0 ? (
                summaryPreview.moderatorLeaderRows.map((row) => (
                  <div
                    key={row.actor}
                    className="rounded-2xl bg-(--color-surface) px-3 py-3 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <p className="font-semibold text-slate-950 dark:text-stone-100">
                      {row.actor}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {row.role || "Unknown role"}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-stone-100">
                      {row.eventCount}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      actions
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 sm:col-span-2">
                  No moderator activity in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Most active enforcers
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {summaryPreview.enforcementLeaderRows.length > 0 ? (
                summaryPreview.enforcementLeaderRows.map((row) => (
                  <div
                    key={row.actor}
                    className="rounded-2xl bg-(--color-surface) px-3 py-3 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <p className="font-semibold text-slate-950 dark:text-stone-100">
                      {row.actor}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {row.role || "Unknown role"}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-stone-100">
                      {row.enforcementCount}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      enforcement actions
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 sm:col-span-2">
                  No enforcement actions in the selected range.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Report reasons
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.reasonRows.length > 0 ? (
                summaryPreview.reasonRows.map((row) => (
                  <div
                    key={row.reason}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.reason}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No reports in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Report statuses
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.statusRows.length > 0 ? (
                summaryPreview.statusRows.map((row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.status}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No reports in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Enforcement actions
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.enforcementRows.length > 0 ? (
                summaryPreview.enforcementRows.map((row) => (
                  <div
                    key={row.action}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.action}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No reports in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Safety states
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.safetyStateRows.length > 0 ? (
                summaryPreview.safetyStateRows.map((row) => (
                  <div
                    key={row.state}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.state}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No reports in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Daily pressure
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.pressureTrendRows.length > 0 ? (
                summaryPreview.pressureTrendRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.day}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No reports in the selected range.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Daily status changes
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.statusTrendRows.length > 0 ? (
                summaryPreview.statusTrendRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.day}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No status changes in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Daily enforcement actions
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.enforcementTrendRows.length > 0 ? (
                summaryPreview.enforcementTrendRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.day}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No enforcement actions in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Daily resolved work
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.resolutionTrendRows.length > 0 ? (
                summaryPreview.resolutionTrendRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.day}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No resolved or dismissed outcomes in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Pressure vs resolved
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.pressureVsResolvedRows.length > 0 ? (
                summaryPreview.pressureVsResolvedRows.map((row) => (
                  <div
                    key={row.day}
                    className="rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{row.day}</span>
                      <span
                        className={`font-semibold ${
                          row.delta > 0
                            ? "text-amber-700 dark:text-amber-300"
                            : row.delta < 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-slate-700 dark:text-stone-200"
                        }`}
                      >
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {row.pressure} new · {row.resolved} closed
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No trend comparison available in the selected range.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Daily moderator actions
            </p>
            <div className="mt-3 space-y-2">
              {summaryPreview.moderatorActivityTrendRows.length > 0 ? (
                summaryPreview.moderatorActivityTrendRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between rounded-2xl bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-stone-200"
                  >
                    <span className="font-medium">{row.day}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No moderator actions in the selected range.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
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
          onClick={async () => {
            setPendingExport("reports");
            try {
              const snapshot = await loadExportSnapshot();
              downloadCsv(
                `moderation-reports-${label}-${rangeLabel}-${today}.csv`,
                buildReportsRows(snapshot?.reports ?? scopedReports),
              );
            } finally {
              setPendingExport(null);
            }
          }}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
          disabled={pendingExport !== null}
        >
          {pendingExport === "reports"
            ? "Preparing reports..."
            : `Export reports (${scopedReports.length})`}
        </button>
        <button
          type="button"
          onClick={async () => {
            setPendingExport("blocks");
            try {
              const snapshot = await loadExportSnapshot();
              downloadCsv(
                `moderation-blocks-${label}-${rangeLabel}-${today}.csv`,
                buildBlocksRows(snapshot?.blocks ?? scopedBlocks),
              );
            } finally {
              setPendingExport(null);
            }
          }}
          className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
          disabled={pendingExport !== null}
        >
          {pendingExport === "blocks"
            ? "Preparing blocks..."
            : `Export blocks (${scopedBlocks.length})`}
        </button>
        <button
          type="button"
          onClick={async () => {
            setPendingExport("events");
            try {
              const snapshot = await loadExportSnapshot();
              downloadCsv(
                `moderation-events-${label}-${rangeLabel}-${today}.csv`,
                buildEventsRows(snapshot?.reports ?? scopedReports),
              );
            } finally {
              setPendingExport(null);
            }
          }}
          className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
          disabled={pendingExport !== null}
        >
          {pendingExport === "events"
            ? "Preparing events..."
            : `Export events (${scopedReports.reduce((count, report) => count + (report.events?.length ?? 0), 0)})`}
        </button>
        <button
          type="button"
          onClick={async () => {
            setPendingExport("summary");
            try {
              const snapshot = await loadExportSnapshot();
              downloadCsv(
                `moderation-summary-${label}-${rangeLabel}-${today}.csv`,
                buildSummaryRows(snapshot?.reports ?? scopedReports),
              );
            } finally {
              setPendingExport(null);
            }
          }}
          className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
          disabled={pendingExport !== null}
        >
          {pendingExport === "summary"
            ? "Preparing summary..."
            : "Export summary"}
        </button>
      </div>
    </div>
  );
}
