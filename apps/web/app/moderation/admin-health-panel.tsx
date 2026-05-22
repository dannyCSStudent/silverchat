"use client";

import { useEffect, useState } from "react";

import type { ModerationAdminHealth } from "./data";
import {
  getRouteLabel,
  getRouteRecoveryHint,
} from "./admin-health-status-strip";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

type HealthHistoryEntry = {
  implicatedRoutePath: string | null;
  sampledAt: string | null;
  summary: string;
};

const SLOW_ROUTE_THRESHOLD_MS = 750;
const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;
const STALE_SAMPLE_THRESHOLD_MS = 90_000;
const VERY_STALE_SAMPLE_THRESHOLD_MS = 180_000;
const HEALTH_HISTORY_LIMIT = 5;
const routeTargets: Record<string, string> = {
  "/admin-users/me": "/api/admin/me",
  "/admin-users/": "/api/admin/admin-users",
  "/reports/": "/api/admin/reports",
  "/blocks/": "/api/admin/blocks",
};

function getRouteTone(status: ModerationAdminHealth["statuses"][number]) {
  if (!status.ok) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      label: `Failed (${status.status ?? "no status"})`,
    };
  }

  if (status.durationMs !== null && status.durationMs >= VERY_SLOW_ROUTE_THRESHOLD_MS) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      label: `Very slow (${status.status ?? "ok"})`,
    };
  }

  if (status.durationMs !== null && status.durationMs >= SLOW_ROUTE_THRESHOLD_MS) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      label: `Slow (${status.status ?? "ok"})`,
    };
  }

  return {
    classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    label: `Healthy (${status.status ?? "ok"})`,
  };
}

function getHealthSummary(health: ModerationAdminHealth) {
  if (health.statuses.some((status) => !status.ok)) {
    return "Degraded";
  }

  if (
    health.statuses.some(
      (status) =>
        status.durationMs !== null && status.durationMs >= VERY_SLOW_ROUTE_THRESHOLD_MS,
    )
  ) {
    return "Very slow";
  }

  if (
    health.statuses.some(
      (status) => status.durationMs !== null && status.durationMs >= SLOW_ROUTE_THRESHOLD_MS,
    )
  ) {
    return "Slow";
  }

  return "Healthy";
}

function getRouteSeverity(status: ModerationAdminHealth["statuses"][number]) {
  if (!status.ok) {
    return 3;
  }

  if (status.durationMs !== null && status.durationMs >= VERY_SLOW_ROUTE_THRESHOLD_MS) {
    return 2;
  }

  if (status.durationMs !== null && status.durationMs >= SLOW_ROUTE_THRESHOLD_MS) {
    return 1;
  }

  return 0;
}

function getRouteTarget(path: string) {
  return routeTargets[path] ?? null;
}

function getRecoveryRoute(path: string) {
  const endpointHref = getRouteTarget(path);
  if (!endpointHref) {
    return null;
  }

  return {
    endpointHref,
    hint: getRouteRecoveryHint(path),
    label: getRouteLabel(path),
    path,
  };
}

function getSampleAgeMs(sampledAt: string | null) {
  if (!sampledAt) {
    return null;
  }

  const sampledDate = new Date(sampledAt);
  if (Number.isNaN(sampledDate.getTime())) {
    return null;
  }

  return Math.max(0, Date.now() - sampledDate.getTime());
}

function getFreshnessTone(args: {
  isAutoRefreshEnabled: boolean;
  sampledAt: string | null;
}) {
  const ageMs = getSampleAgeMs(args.sampledAt);

  if (!args.isAutoRefreshEnabled) {
    return {
      classes: "border-slate-300 bg-slate-100 text-slate-800",
      label: "Paused",
    };
  }

  if (ageMs === null) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      label: "Unknown age",
    };
  }

  if (ageMs >= VERY_STALE_SAMPLE_THRESHOLD_MS) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      label: "Very stale",
    };
  }

  if (ageMs >= STALE_SAMPLE_THRESHOLD_MS) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      label: "Stale",
    };
  }

  return {
    classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    label: "Fresh",
  };
}

function getTrustWarning(args: {
  isAutoRefreshEnabled: boolean;
  sampledAt: string | null;
}) {
  const ageMs = getSampleAgeMs(args.sampledAt);

  if (!args.isAutoRefreshEnabled) {
    return {
      classes: "border-slate-300 bg-slate-100 text-slate-800",
      title: "Auto-refresh paused",
      detail: "These route timings will keep aging until auto-refresh resumes or you refresh manually.",
    };
  }

  if (ageMs !== null && ageMs >= VERY_STALE_SAMPLE_THRESHOLD_MS) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      title: "Health sample is very stale",
      detail: "Treat the current route timings cautiously until a fresh sample succeeds.",
    };
  }

  if (ageMs === null || ageMs >= STALE_SAMPLE_THRESHOLD_MS) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      title: "Health sample is aging",
      detail: "Route status may no longer reflect the current admin path until the next successful refresh.",
    };
  }

  return null;
}

function getRefreshFailureNotice(args: {
  implicatedRoutePath: string | null;
  lastFailureAge: string | null;
  refreshError: string | null;
}) {
  if (!args.refreshError) {
    return null;
  }

  return {
    classes: "border-rose-200 bg-rose-50 text-rose-900",
    title: "Latest refresh failed",
    detail: args.lastFailureAge
      ? `The last health refresh failed ${args.lastFailureAge}. Retry now or inspect the most likely affected admin endpoint.`
      : "Retry now or inspect the most likely affected admin endpoint.",
    implicatedRoutePath: args.implicatedRoutePath,
  };
}

function getImplicatedRoutePath(
  statuses: ModerationAdminHealth["statuses"],
) {
  const failedStatuses = statuses.filter((status) => !status.ok);
  if (failedStatuses.length > 0) {
    return [...failedStatuses].sort((left, right) => {
      const leftStatus = left.status ?? -1;
      const rightStatus = right.status ?? -1;
      if (leftStatus !== rightStatus) {
        return leftStatus - rightStatus;
      }

      return (right.durationMs ?? -1) - (left.durationMs ?? -1);
    })[0]?.path ?? null;
  }

  return [...statuses].sort((left, right) => {
    const severityDelta = getRouteSeverity(right) - getRouteSeverity(left);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return (right.durationMs ?? -1) - (left.durationMs ?? -1);
  })[0]?.path ?? null;
}

function formatRelativeAgeFromTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const secondsAgo = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 1000));
  if (secondsAgo < 5) {
    return "just now";
  }

  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`;
  }

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  return `${hoursAgo}h ago`;
}

function buildHealthHistoryEntry(health: ModerationAdminHealth): HealthHistoryEntry {
  return {
    implicatedRoutePath: getImplicatedRoutePath(health.statuses),
    sampledAt: health.sampledAt,
    summary: getHealthSummary(health),
  };
}

function getHistoryTransitionLabel(args: {
  currentEntry: HealthHistoryEntry;
  previousEntry: HealthHistoryEntry | undefined;
}) {
  const { currentEntry, previousEntry } = args;

  if (!previousEntry) {
    return "Latest sample";
  }

  if (currentEntry.summary === previousEntry.summary) {
    if (currentEntry.implicatedRoutePath !== previousEntry.implicatedRoutePath) {
      return `Focus changed from ${previousEntry.implicatedRoutePath ?? "none"}`;
    }

    return "Unchanged";
  }

  return `${previousEntry.summary} -> ${currentEntry.summary}`;
}

function getSummarySeverity(summary: HealthHistoryEntry["summary"]) {
  if (summary === "Degraded") {
    return 3;
  }

  if (summary === "Very slow") {
    return 2;
  }

  if (summary === "Slow") {
    return 1;
  }

  return 0;
}

function getHistoryTransitionTone(args: {
  currentEntry: HealthHistoryEntry;
  previousEntry: HealthHistoryEntry | undefined;
}) {
  const { currentEntry, previousEntry } = args;

  if (!previousEntry) {
    return {
      classes: "border-slate-300 bg-slate-100 text-slate-800",
      label: "Current",
    };
  }

  const currentSeverity = getSummarySeverity(currentEntry.summary);
  const previousSeverity = getSummarySeverity(previousEntry.summary);

  if (currentSeverity > previousSeverity) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      label: "Worsening",
    };
  }

  if (currentSeverity < previousSeverity) {
    return {
      classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
      label: "Improving",
    };
  }

  if (currentEntry.implicatedRoutePath !== previousEntry.implicatedRoutePath) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      label: "Focus shift",
    };
  }

  return {
    classes: "border-slate-300 bg-slate-100 text-slate-800",
    label: "Stable",
  };
}

export function AdminHealthPanel() {
  const {
    currentHealth,
    isAutoRefreshEnabled,
    isRefreshing,
    lastFailedRefreshAt,
    lastSuccessfulRefreshAt,
    refreshError,
    refreshHealth,
    setIsAutoRefreshEnabled,
  } = useLiveAdminHealth();
  const [relativeSampleAge, setRelativeSampleAge] = useState("unknown age");
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>([
    buildHealthHistoryEntry(currentHealth),
  ]);

  useEffect(() => {
    function updateRelativeSampleAge() {
      if (!currentHealth.sampledAt) {
        setRelativeSampleAge("unknown age");
        return;
      }

      const sampledAt = new Date(currentHealth.sampledAt);
      if (Number.isNaN(sampledAt.getTime())) {
        setRelativeSampleAge("unknown age");
        return;
      }

      const secondsAgo = Math.max(
        0,
        Math.floor((Date.now() - sampledAt.getTime()) / 1000),
      );
      if (secondsAgo < 5) {
        setRelativeSampleAge("just now");
        return;
      }

      if (secondsAgo < 60) {
        setRelativeSampleAge(`${secondsAgo}s ago`);
        return;
      }

      const minutesAgo = Math.floor(secondsAgo / 60);
      if (minutesAgo < 60) {
        setRelativeSampleAge(`${minutesAgo}m ago`);
        return;
      }

      const hoursAgo = Math.floor(minutesAgo / 60);
      setRelativeSampleAge(`${hoursAgo}h ago`);
    }

    updateRelativeSampleAge();
    const intervalId = window.setInterval(updateRelativeSampleAge, 1_000);

    return () => window.clearInterval(intervalId);
  }, [currentHealth.sampledAt]);

  useEffect(() => {
    const nextEntry = buildHealthHistoryEntry(currentHealth);
    const timeoutId = window.setTimeout(() => {
      setHealthHistory((currentEntries) => {
        const withoutDuplicateHead =
          currentEntries[0]?.sampledAt === nextEntry.sampledAt &&
          currentEntries[0]?.summary === nextEntry.summary &&
          currentEntries[0]?.implicatedRoutePath === nextEntry.implicatedRoutePath
            ? currentEntries.slice(1)
            : currentEntries;

        return [nextEntry, ...withoutDuplicateHead].slice(0, HEALTH_HISTORY_LIMIT);
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentHealth]);

  const summary = getHealthSummary(currentHealth);
  const freshnessTone = getFreshnessTone({
    isAutoRefreshEnabled,
    sampledAt: currentHealth.sampledAt,
  });
  const trustWarning = getTrustWarning({
    isAutoRefreshEnabled,
    sampledAt: currentHealth.sampledAt,
  });
  const lastSuccessAge = formatRelativeAgeFromTimestamp(lastSuccessfulRefreshAt);
  const lastFailureAge = formatRelativeAgeFromTimestamp(lastFailedRefreshAt);
  const sortedStatuses = [...currentHealth.statuses].sort((left, right) => {
    const severityDelta = getRouteSeverity(right) - getRouteSeverity(left);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return (right.durationMs ?? -1) - (left.durationMs ?? -1);
  });
  const slowestStatus = sortedStatuses[0];
  const implicatedRoutePath = getImplicatedRoutePath(currentHealth.statuses);
  const refreshFailureNotice = getRefreshFailureNotice({
    implicatedRoutePath,
    lastFailureAge,
    refreshError,
  });
  const implicatedRoute = refreshFailureNotice?.implicatedRoutePath
    ? getRecoveryRoute(refreshFailureNotice.implicatedRoutePath)
    : null;

  return (
    <section className="rounded-[30px] border border-(--color-line) bg-(--color-surface) px-5 py-4 shadow-(--shadow-sm)">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Admin data path
          </p>
          <p className="mt-1 text-base font-semibold text-slate-950 dark:text-stone-100">
            {summary}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Slow routes are flagged at {SLOW_ROUTE_THRESHOLD_MS} ms and above.
          </p>
          {slowestStatus ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Highest attention: <span className="font-medium">{slowestStatus.path}</span>
              {" · "}
              {slowestStatus.durationMs !== null
                ? `${slowestStatus.durationMs} ms`
                : "latency unavailable"}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Sampled{" "}
            {currentHealth.sampledAt
              ? new Date(currentHealth.sampledAt).toLocaleString()
              : "unknown time"}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Freshness: {relativeSampleAge}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Last successful refresh: {lastSuccessAge ?? "unknown"}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Last failed refresh: {lastFailureAge ?? "none"}
          </p>
          <div
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${freshnessTone.classes}`}
          >
            {freshnessTone.label}
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => void refreshHealth()}
              disabled={isRefreshing}
              className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) disabled:cursor-not-allowed disabled:opacity-70 dark:text-stone-100"
            >
              {isRefreshing ? "Refreshing..." : "Refresh status only"}
            </button>
            <button
              type="button"
              onClick={() => setIsAutoRefreshEnabled((currentValue) => !currentValue)}
              className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
            >
              {isAutoRefreshEnabled ? "Pause auto-refresh" : "Resume auto-refresh"}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {sortedStatuses.map((status) => {
            const tone = getRouteTone(status);
            const recoveryRoute = getRecoveryRoute(status.path);

            return (
              <div
                key={status.path}
                className={`rounded-2xl border px-4 py-3 text-sm ${tone.classes}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {status.path}
                </p>
                <p className="mt-2 font-medium">{tone.label}</p>
                <p className="mt-2 text-xs">
                  {status.durationMs !== null
                    ? `${status.durationMs} ms`
                    : "Latency unavailable"}
                </p>
                {recoveryRoute ? (
                  <LocalRecoveryHint
                    route={recoveryRoute}
                    prefix=""
                    showPath={false}
                    className="mt-3 flex flex-col items-start gap-2 text-xs"
                    endpointClassName="inline-flex font-semibold underline underline-offset-2"
                  />
                ) : null}
              </div>
            );
          })}
          </div>
        </div>
      </div>
      {trustWarning ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${trustWarning.classes}`}>
          <p className="font-semibold">{trustWarning.title}</p>
          <p className="mt-1">{trustWarning.detail}</p>
        </div>
      ) : null}
      {refreshFailureNotice ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${refreshFailureNotice.classes}`}
        >
          <p className="font-semibold">{refreshFailureNotice.title}</p>
          <p className="mt-1">{refreshFailureNotice.detail}</p>
          {refreshFailureNotice.implicatedRoutePath ? (
            <p className="mt-2">
              Highest-attention route:{" "}
              <span className="font-semibold">
                {refreshFailureNotice.implicatedRoutePath}
              </span>
            </p>
          ) : null}
          {implicatedRoute ? (
            <LocalRecoveryHint
              route={implicatedRoute}
              prefix=""
              showPath={false}
              className="mt-2 flex flex-col items-start gap-2 text-xs"
              endpointClassName="inline-flex font-semibold underline underline-offset-2"
            />
          ) : null}
          <p className="mt-2 break-all font-mono text-xs opacity-80">{refreshError}</p>
        </div>
      ) : null}
      <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Recent samples
        </p>
        <div className="mt-3 space-y-2">
          {healthHistory.map((entry, index) => {
            const previousEntry = healthHistory[index + 1];
            const transitionLabel = getHistoryTransitionLabel({
              currentEntry: entry,
              previousEntry,
            });
            const transitionTone = getHistoryTransitionTone({
              currentEntry: entry,
              previousEntry,
            });

            return (
              <div
                key={`${entry.sampledAt ?? "unknown"}-${index}`}
                className="rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{entry.summary}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatRelativeAgeFromTimestamp(entry.sampledAt) ?? "unknown time"}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${transitionTone.classes}`}
                  >
                    {transitionTone.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {transitionLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {entry.implicatedRoutePath
                    ? `Focus route: ${entry.implicatedRoutePath}`
                    : "No implicated route"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
