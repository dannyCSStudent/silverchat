import type { ModerationAdminHealth } from "./data";

type AdminHealthPanelProps = {
  health: ModerationAdminHealth;
};

const SLOW_ROUTE_THRESHOLD_MS = 750;
const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;

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

export function AdminHealthPanel({ health }: AdminHealthPanelProps) {
  const summary = getHealthSummary(health);
  const sortedStatuses = [...health.statuses].sort((left, right) => {
    const severityDelta = getRouteSeverity(right) - getRouteSeverity(left);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return (right.durationMs ?? -1) - (left.durationMs ?? -1);
  });
  const slowestStatus = sortedStatuses[0];

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
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {sortedStatuses.map((status) => {
            const tone = getRouteTone(status);

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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
