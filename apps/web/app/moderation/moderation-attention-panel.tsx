"use client";

import Link from "next/link";

import {
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

type AttentionMember = {
  detail: string;
  label: string;
  lastSeenAtLabel: string;
  memberHref: string;
  openReportCount: number;
  queueHref: string;
  tone: "amber" | "emerald" | "rose" | "slate";
  title: string;
  userId: string;
};

function toneClasses(tone: AttentionMember["tone"]) {
  if (tone === "rose") {
    return "bg-rose-100 text-rose-900";
  }
  if (tone === "amber") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-200 text-slate-800";
}

export function ModerationAttentionPanel({
  members,
}: {
  members: AttentionMember[];
}) {
  const { currentHealth } = useLiveAdminHealth();
  const hasFailedAdminRoute = currentHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = currentHealth.statuses.some(
    (status) => (status.durationMs ?? 0) >= 2000,
  );
  const preferMemberCases = hasFailedAdminRoute || hasVerySlowAdminRoute;
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(currentHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);

  return (
    <div className="mt-6 space-y-3">
      {preferMemberCases ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${workflowMode.classes}`}
            >
              {workflowMode.label}
            </span>
            <span className="text-xs font-medium">
              {recommendedBehavior.steps.join(" · ")}
            </span>
          </div>
          <p className="mt-2 text-xs">
            Individual member case files are preferred over broader queue pivots while the admin path is degraded or very slow.
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
      {members.length > 0 ? (
        members.map((member) => (
          <div
            key={member.userId}
            className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                  {member.label}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {member.title}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses(member.tone)}`}>
                {member.openReportCount} open
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {member.detail}
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Last report {member.lastSeenAtLabel}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={member.memberHref}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 dark:bg-stone-100 dark:text-slate-950"
              >
                Open member case
              </Link>
              <Link
                href={member.queueHref}
                className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
              >
                Open filtered queue
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
          No members currently need immediate moderation follow-up.
        </div>
      )}
    </div>
  );
}
