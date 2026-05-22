"use client";

import { useLiveAdminHealth } from "./use-live-admin-health";

const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;
const SLOW_ROUTE_THRESHOLD_MS = 750;

type HealthStatus =
  ReturnType<typeof useLiveAdminHealth>["currentHealth"]["statuses"][number];

function getRouteLabel(path: string) {
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

function getRouteRecoveryHint(path: string) {
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

function getStatusSeverity(status: HealthStatus) {
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

export function getHighestAttentionRoute(statuses: HealthStatus[]) {
  const sortedStatuses = [...statuses].sort((left, right) => {
    const severityDelta = getStatusSeverity(right) - getStatusSeverity(left);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return (right.durationMs ?? 0) - (left.durationMs ?? 0);
  });
  const status = sortedStatuses[0];

  if (!status || getStatusSeverity(status) === 0) {
    return null;
  }

  return {
    detail: status.detail,
    endpointHref: status.path,
    hint: getRouteRecoveryHint(status.path),
    label: getRouteLabel(status.path),
    path: status.path,
    status,
  };
}

function getStripState(
  statuses: HealthStatus[],
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
  statuses: HealthStatus[],
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
  statuses: HealthStatus[],
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
  statuses: HealthStatus[],
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
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);

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
      {highestAttentionRoute ? (
        <div className="mt-4 rounded-2xl border border-current/20 bg-white/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Highest attention route
          </p>
          <p className="mt-2 text-sm font-semibold">
            {highestAttentionRoute.label} · {highestAttentionRoute.path}
          </p>
          <p className="mt-1 text-xs">{highestAttentionRoute.hint}</p>
        </div>
      ) : null}
    </div>
  );
}
