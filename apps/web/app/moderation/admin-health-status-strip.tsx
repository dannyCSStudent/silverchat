"use client";

import { useLiveAdminHealth } from "./use-live-admin-health";

const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;
const SLOW_ROUTE_THRESHOLD_MS = 750;

function getStripState(
  statuses: ReturnType<typeof useLiveAdminHealth>["currentHealth"]["statuses"],
) {
  if (statuses.some((status) => !status.ok)) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      detail: "One or more admin routes are failing. Prefer single-case actions and verify queue refresh before repeating moderation changes.",
      title: "Admin path degraded",
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      detail: "Admin routes are very slow. Queue updates and moderation actions may reflect with noticeable delay.",
      title: "Admin path very slow",
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      detail: "Admin routes are slower than normal, but still responding.",
      title: "Admin path slow",
    };
  }

  return {
    classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    detail: "Admin routes are healthy and responding normally.",
    title: "Admin path healthy",
  };
}

export function AdminHealthStatusStrip() {
  const { currentHealth, isRefreshing } = useLiveAdminHealth();
  const stripState = getStripState(currentHealth.statuses);

  return (
    <div className={`rounded-3xl border px-4 py-3 text-sm ${stripState.classes}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{stripState.title}</p>
          <p className="mt-1">{stripState.detail}</p>
        </div>
        <span className="rounded-full border border-current/20 bg-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
          {isRefreshing ? "Refreshing" : "Live"}
        </span>
      </div>
    </div>
  );
}
