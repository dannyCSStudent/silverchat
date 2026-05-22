"use client";

import Link from "next/link";

import {
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

type BlockSignalItem = {
  blockedCountry: string;
  blockedHref: string;
  blockedLabel: string;
  blockerCountry: string;
  blockerHref: string;
  blockerLabel: string;
  createdAtLabel: string;
  id: string;
  reason: string;
};

export function ModerationBlockSignals({
  blocks,
}: {
  blocks: BlockSignalItem[];
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
    <div className="mt-6 space-y-4">
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
            Member case views are preferred over broad signal interpretation while the admin path is degraded or very slow.
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
      {blocks.length > 0 ? (
        blocks.map((block) => (
          <div
            key={block.id}
            className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
          >
            <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
              <Link
                href={block.blockerHref}
                className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950"
              >
                {block.blockerLabel}
              </Link>{" "}
              blocked{" "}
              <Link
                href={block.blockedHref}
                className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950"
              >
                {block.blockedLabel}
              </Link>
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {block.reason}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {block.blockerCountry} to {block.blockedCountry}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={block.blockerHref}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 dark:bg-stone-100 dark:text-slate-950"
              >
                Open blocker case
              </Link>
              <Link
                href={block.blockedHref}
                className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
              >
                Open blocked member
              </Link>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {block.createdAtLabel}
            </p>
          </div>
        ))
      ) : (
        <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
          No blocks match the current filters.
        </div>
      )}
    </div>
  );
}
