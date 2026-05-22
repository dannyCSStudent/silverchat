"use client";

import type { ModerationAdminHealth } from "./data";

export const SLOW_ROUTE_THRESHOLD_MS = 750;
export const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;

export type ModerationHealthStatus = ModerationAdminHealth["statuses"][number];

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
