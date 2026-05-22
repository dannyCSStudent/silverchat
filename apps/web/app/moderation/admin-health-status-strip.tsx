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

export function getWorkflowMode(
  statuses: ReturnType<typeof useLiveAdminHealth>["currentHealth"]["statuses"],
) {
  if (statuses.some((status) => !status.ok)) {
    return {
      classes: "border-rose-300 bg-rose-100 text-rose-950",
      label: "Safe actions only",
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      classes: "border-amber-300 bg-amber-100 text-amber-950",
      label: "Caution mode",
    };
  }

  return {
    classes: "border-emerald-300 bg-emerald-100 text-emerald-950",
    label: "Normal mode",
  };
}

export function getActiveGuardrails(
  statuses: ReturnType<typeof useLiveAdminHealth>["currentHealth"]["statuses"],
) {
  if (statuses.some((status) => !status.ok)) {
    return [
      "Bulk triage paused",
      "Urgent workload rebalancing paused",
      "Escalation shortcuts paused",
      "Per-card mutations restricted to safer actions only",
    ];
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS)) {
    return [
      "Mutations remain available",
      "Queue refresh may lag",
      "Verify updates before repeating actions",
    ];
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS)) {
    return ["Healthy enough to operate", "Expect mildly delayed refresh"];
  }

  return ["No extra moderation guardrails active"];
}

export function getRecommendedBehavior(
  statuses: ReturnType<typeof useLiveAdminHealth>["currentHealth"]["statuses"],
) {
  if (statuses.some((status) => !status.ok)) {
    return {
      title: "Recommended behavior",
      steps: [
        "Use single-case actions only",
        "Avoid bulk triage and urgent rebalancing",
        "Verify queue refresh after every change",
      ],
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      title: "Recommended behavior",
      steps: [
        "Proceed, but avoid repeating actions quickly",
        "Wait for queue refresh before escalating further",
        "Prefer smaller batches over high-fanout moves",
      ],
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      title: "Recommended behavior",
      steps: [
        "Operate normally",
        "Expect mildly delayed refresh",
      ],
    };
  }

  return {
    title: "Recommended behavior",
    steps: [
      "Operate normally",
      "Use full moderation workflow as needed",
    ],
  };
}

export function AdminHealthStatusStrip() {
  const { currentHealth, isRefreshing } = useLiveAdminHealth();
  const stripState = getStripState(currentHealth.statuses);
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const activeGuardrails = getActiveGuardrails(currentHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(currentHealth.statuses);

  return (
    <div className={`rounded-3xl border px-4 py-3 text-sm ${stripState.classes}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{stripState.title}</p>
          <p className="mt-1">{stripState.detail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${workflowMode.classes}`}
          >
            {workflowMode.label}
          </span>
          <span className="rounded-full border border-current/20 bg-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            {isRefreshing ? "Refreshing" : "Live"}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {activeGuardrails.map((guardrail) => (
          <span
            key={guardrail}
            className="rounded-full border border-current/20 bg-white/40 px-3 py-1 text-xs font-medium"
          >
            {guardrail}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-current/20 bg-white/30 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
          {recommendedBehavior.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recommendedBehavior.steps.map((step) => (
            <span
              key={step}
              className="rounded-full border border-current/20 bg-white/40 px-3 py-1 text-xs font-medium"
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
