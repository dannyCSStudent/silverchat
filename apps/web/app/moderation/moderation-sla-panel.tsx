import Link from "next/link";
import type { ModerationReport } from "@repo/types";

function formatDuration(ms: number) {
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

function formatAge(createdAt?: string) {
  if (!createdAt) {
    return "Unknown age";
  }

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return "Unknown age";
  }

  return formatDuration(Date.now() - created.getTime());
}

function getReportAgeMs(report: ModerationReport) {
  if (!report.created_at) {
    return null;
  }

  const createdAt = new Date(report.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return Date.now() - createdAt.getTime();
}

function getFirstActionAt(report: ModerationReport) {
  const events = [...(report.events ?? [])]
    .filter((event) => event.created_at)
    .sort((left, right) => {
      const leftTime = new Date(left.created_at ?? 0).getTime();
      const rightTime = new Date(right.created_at ?? 0).getTime();
      return leftTime - rightTime;
    });

  return events[0]?.created_at ?? null;
}

function getResolutionAt(report: ModerationReport) {
  const events = [...(report.events ?? [])]
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
    });

  return events[0]?.created_at ?? null;
}

function getFirstActionDelayMs(report: ModerationReport) {
  if (!report.created_at) {
    return null;
  }

  const firstActionAt = getFirstActionAt(report);
  if (!firstActionAt) {
    return null;
  }

  const createdAt = new Date(report.created_at);
  const actionAt = new Date(firstActionAt);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(actionAt.getTime())) {
    return null;
  }

  return actionAt.getTime() - createdAt.getTime();
}

function getResolutionDelayMs(report: ModerationReport) {
  if (!report.created_at) {
    return null;
  }

  const resolutionAt = getResolutionAt(report);
  if (!resolutionAt) {
    return null;
  }

  const createdAt = new Date(report.created_at);
  const resolvedAt = new Date(resolutionAt);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(resolvedAt.getTime())) {
    return null;
  }

  return resolvedAt.getTime() - createdAt.getTime();
}

function isStillOpen(report: ModerationReport) {
  return (report.status ?? "open") === "open" || (report.status ?? "open") === "reviewing";
}

type SlaRecord = {
  ageMs: number;
  firstActionDelayMs: number | null;
  firstActionMissing: boolean;
  report: ModerationReport;
  resolutionDelayMs: number | null;
};

export type ModerationSlaSummary = {
  averageFirstActionMs: number | null;
  averageResolutionMs: number | null;
  oldestFirstAction: SlaRecord[];
  oldestResolution: SlaRecord[];
  overdueFirstAction: SlaRecord[];
  overdueResolution: SlaRecord[];
  records: SlaRecord[];
};

export function getModerationSlaSummary(reports: ModerationReport[]): ModerationSlaSummary {
  const records: SlaRecord[] = reports
    .map((report) => {
      const ageMs = getReportAgeMs(report);
      return {
        ageMs,
        firstActionDelayMs: getFirstActionDelayMs(report),
        firstActionMissing: (report.events ?? []).length === 0,
        report,
        resolutionDelayMs: getResolutionDelayMs(report),
      };
    })
    .filter((record): record is SlaRecord & { ageMs: number } => record.ageMs !== null);

  const firstActionWithData = records.filter((record) => record.firstActionDelayMs !== null);
  const resolutionWithData = records.filter((record) => record.resolutionDelayMs !== null);
  const overdueFirstAction = records.filter(
    (record) =>
      record.firstActionMissing &&
      record.ageMs >= 24 * 60 * 60 * 1000 &&
      isStillOpen(record.report),
  );
  const overdueResolution = records.filter(
    (record) => isStillOpen(record.report) && record.ageMs >= 48 * 60 * 60 * 1000,
  );

  const averageFirstActionMs =
    firstActionWithData.length > 0
      ? firstActionWithData.reduce((total, record) => total + (record.firstActionDelayMs ?? 0), 0) /
        firstActionWithData.length
      : null;
  const averageResolutionMs =
    resolutionWithData.length > 0
      ? resolutionWithData.reduce((total, record) => total + (record.resolutionDelayMs ?? 0), 0) /
        resolutionWithData.length
      : null;

  const oldestFirstAction = overdueFirstAction
    .slice()
    .sort((left, right) => right.ageMs - left.ageMs)
    .slice(0, 3);
  const oldestResolution = overdueResolution
    .slice()
    .sort((left, right) => right.ageMs - left.ageMs)
    .slice(0, 3);

  return {
    averageFirstActionMs,
    averageResolutionMs,
    oldestFirstAction,
    oldestResolution,
    overdueFirstAction,
    overdueResolution,
    records,
  };
}

export function ModerationSlaPanel({ reports }: { reports: ModerationReport[] }) {
  const summary = getModerationSlaSummary(reports);
  const hasSlaAlerts =
    summary.overdueFirstAction.length > 0 || summary.overdueResolution.length > 0;

  return (
    <section className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            SLA tracking
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
            Moderation response timing
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Tracks first action within 24 hours and resolution within 48 hours.
          </p>
        </div>
        <Link
          href="/moderation?status=open"
          className="rounded-full border border-(--color-line) bg-(--color-surface-strong) px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
        >
          Open unresolved
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-(--color-surface-strong) p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Average first action</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
            {summary.averageFirstActionMs !== null ? formatDuration(summary.averageFirstActionMs) : "No data"}
          </p>
        </div>
        <div className="rounded-3xl bg-(--color-surface-strong) p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Average resolution</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
            {summary.averageResolutionMs !== null ? formatDuration(summary.averageResolutionMs) : "No data"}
          </p>
        </div>
        <Link
          href="/moderation?queue=open-unassigned"
          className="rounded-3xl bg-amber-50 p-5 transition hover:opacity-92"
        >
          <p className="text-sm text-amber-800">Waiting for first action</p>
          <p className="mt-3 text-3xl font-semibold text-amber-950">{summary.overdueFirstAction.length}</p>
          <p className="mt-2 text-sm text-amber-900">Open cases with no moderation event after 24h.</p>
        </Link>
        <Link
          href="/moderation?status=open"
          className="rounded-3xl bg-rose-50 p-5 transition hover:opacity-92"
        >
          <p className="text-sm text-rose-800">Overdue resolution</p>
          <p className="mt-3 text-3xl font-semibold text-rose-950">{summary.overdueResolution.length}</p>
          <p className="mt-2 text-sm text-rose-900">Open or reviewing cases older than 48h.</p>
        </Link>
      </div>

      {hasSlaAlerts ? (
        <div
          className={`mt-6 rounded-3xl border px-4 py-4 ${
            summary.overdueResolution.length > 0
              ? "border-rose-200 bg-rose-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${
              summary.overdueResolution.length > 0 ? "text-rose-800" : "text-amber-800"
            }`}
          >
            SLA alert
          </p>
          <p
            className={`mt-2 text-sm ${
              summary.overdueResolution.length > 0 ? "text-rose-950" : "text-amber-950"
            }`}
          >
            {summary.overdueResolution.length > 0
              ? `${summary.overdueResolution.length} case${summary.overdueResolution.length === 1 ? "" : "s"} are overdue for resolution, and ${summary.overdueFirstAction.length} case${summary.overdueFirstAction.length === 1 ? "" : "s"} still have no first action after 24 hours.`
              : `${summary.overdueFirstAction.length} case${summary.overdueFirstAction.length === 1 ? "" : "s"} still need a first moderation action after 24 hours.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.overdueFirstAction.length > 0 ? (
              <Link
                href="/moderation?queue=open-unassigned"
                className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold transition hover:bg-white"
              >
                Review first-action backlog
              </Link>
            ) : null}
            {summary.overdueResolution.length > 0 ? (
              <Link
                href="/moderation?status=open"
                className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold transition hover:bg-white"
              >
                Review overdue cases
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Oldest without action
          </p>
          <div className="mt-4 space-y-2">
            {summary.oldestFirstAction.length > 0 ? (
              summary.oldestFirstAction.map((record) => (
                <Link
                  key={record.report.id}
                  href={`/moderation/members/${record.report.reported_user_id}`}
                  className="block rounded-2xl bg-(--color-surface) px-4 py-3 transition hover:bg-(--color-chip-muted)"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950 dark:text-stone-100">
                      {record.report.reported_profile?.display_name ?? record.report.reported_user_id}
                    </p>
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {formatAge(record.report.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {record.report.reason} · {record.report.status ?? "open"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No open cases have crossed the 24-hour first-action target.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Oldest unresolved
          </p>
          <div className="mt-4 space-y-2">
            {summary.oldestResolution.length > 0 ? (
              summary.oldestResolution.map((record) => (
                <Link
                  key={record.report.id}
                  href={`/moderation/members/${record.report.reported_user_id}`}
                  className="block rounded-2xl bg-(--color-surface) px-4 py-3 transition hover:bg-(--color-chip-muted)"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950 dark:text-stone-100">
                      {record.report.reported_profile?.display_name ?? record.report.reported_user_id}
                    </p>
                    <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                      {formatAge(record.report.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {record.report.reason} · {record.report.status ?? "open"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No open or reviewing cases have crossed the 48-hour resolution target.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
