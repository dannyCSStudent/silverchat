"use client";

import type { ModerationAdminHealth } from "./data";
import type { RecoveryHintRoute } from "./local-recovery-hint";

export const SLOW_ROUTE_THRESHOLD_MS = 750;
export const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;

export type ModerationHealthStatus = ModerationAdminHealth["statuses"][number];

const routeTargets: Record<string, string> = {
  "/admin-users/me": "/api/admin/me",
  "/admin-users/": "/api/admin/admin-users",
  "/reports/": "/api/admin/reports",
  "/blocks/": "/api/admin/blocks",
};

export function getRouteTarget(path: string) {
  return routeTargets[path] ?? null;
}

export function getRouteLabel(path: string) {
  if (path === "/api/admin/reports") {
    return "report queue";
  }
  if (path === "/api/admin/admin-users") {
    return "moderator directory";
  }
  if (path === "/api/admin/blocks") {
    return "block history";
  }
  if (path === "/api/admin/me") {
    return "admin identity";
  }
  if (path === "/api/admin/health") {
    return "admin health proxy";
  }

  return path;
}

export function getRouteRecoveryHint(path: string) {
  if (path === "/api/admin/reports") {
    return "Check whether the reports proxy is recovering before trusting queue counts or repeating report actions.";
  }
  if (path === "/api/admin/admin-users") {
    return "Check the moderator directory before reassigning or escalating cases to another admin user.";
  }
  if (path === "/api/admin/blocks") {
    return "Check the blocks proxy before relying on block history or self-protection signals.";
  }
  if (path === "/api/admin/me") {
    return "Check the admin identity route before trusting role-based controls or assignee-to-me behavior.";
  }
  if (path === "/api/admin/health") {
    return "Refresh the admin health sample before trusting the current moderation status summary.";
  }

  return `Inspect ${path} before trusting this part of the moderation surface.`;
}

export function getRecoveryRoute(path: string): RecoveryHintRoute | null {
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

export function getRouteSeverity(status: ModerationHealthStatus) {
  if (!status.ok) {
    return 3;
  }

  if ((status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS) {
    return 2;
  }

  if ((status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS) {
    return 1;
  }

  return 0;
}

export function getRouteTone(status: ModerationHealthStatus) {
  if (!status.ok) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      label: `Failed (${status.status ?? "no status"})`,
    };
  }

  if ((status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      label: `Very slow (${status.status ?? "ok"})`,
    };
  }

  if ((status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS) {
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

export function getHealthSummary(health: ModerationAdminHealth) {
  if (health.statuses.some((status) => !status.ok)) {
    return "Degraded";
  }

  if (
    health.statuses.some(
      (status) => (status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS,
    )
  ) {
    return "Very slow";
  }

  if (
    health.statuses.some(
      (status) => (status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS,
    )
  ) {
    return "Slow";
  }

  return "Healthy";
}
