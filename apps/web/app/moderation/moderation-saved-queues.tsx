"use client";

import Link from "next/link";

import {
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

type SavedQueueItem = {
  description: string;
  href: string;
  key: string;
  label: string;
  selected: boolean;
};

const SAFER_QUEUE_KEYS = new Set([
  "assigned-to-me",
  "open-unassigned",
  "attention-needed",
  "urgent-unassigned",
]);

export function ModerationSavedQueues({
  queues,
}: {
  queues: SavedQueueItem[];
}) {
  const { currentHealth } = useLiveAdminHealth();
  const hasFailedAdminRoute = currentHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = currentHealth.statuses.some(
    (status) => (status.durationMs ?? 0) >= 2000,
  );
  const shouldPrioritizeSaferQueues = hasFailedAdminRoute || hasVerySlowAdminRoute;
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(currentHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);

  const orderedQueues = [...queues].sort((left, right) => {
    if (!shouldPrioritizeSaferQueues) {
      return 0;
    }

    const leftPriority = SAFER_QUEUE_KEYS.has(left.key) ? 1 : 0;
    const rightPriority = SAFER_QUEUE_KEYS.has(right.key) ? 1 : 0;
    return rightPriority - leftPriority;
  });

  return (
    <div className="mt-6 space-y-3">
      {shouldPrioritizeSaferQueues ? (
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
            Narrower queue views are promoted first while the admin path is degraded or very slow.
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
      {orderedQueues.map((queue) => {
        const isSaferNow = shouldPrioritizeSaferQueues && SAFER_QUEUE_KEYS.has(queue.key);

        return (
          <Link
            key={queue.key}
            href={queue.href}
            className={`block rounded-3xl border p-5 transition ${
              queue.selected
                ? "border-slate-900 bg-slate-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-slate-950"
                : "border-(--color-line) bg-(--color-surface-strong) hover:bg-(--color-surface)"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{queue.label}</p>
              {isSaferNow ? (
                <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-950">
                  Safer now
                </span>
              ) : null}
            </div>
            <p className={`mt-2 text-sm ${queue.selected ? "text-white/72 dark:text-slate-700" : "text-slate-600 dark:text-slate-300"}`}>
              {queue.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
