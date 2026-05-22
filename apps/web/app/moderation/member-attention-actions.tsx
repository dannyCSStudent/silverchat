"use client";

import Link from "next/link";

import {
  getHighestAttentionRoute,
  getRecommendedBehavior,
  getWorkflowMode,
} from "./admin-health-status-strip";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { useLiveAdminHealth } from "./use-live-admin-health";

type MemberAttentionActionsProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  tone: "amber" | "emerald" | "rose" | "slate";
};

function primaryClasses(tone: MemberAttentionActionsProps["tone"]) {
  if (tone === "rose") {
    return "bg-rose-900 text-white hover:bg-rose-950";
  }
  if (tone === "amber") {
    return "bg-amber-900 text-white hover:bg-amber-950";
  }
  if (tone === "emerald") {
    return "bg-emerald-900 text-white hover:bg-emerald-950";
  }

  return "bg-slate-900 text-white hover:bg-slate-950 dark:bg-stone-100 dark:text-slate-950";
}

export function MemberAttentionActions({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  tone,
}: MemberAttentionActionsProps) {
  const { currentHealth } = useLiveAdminHealth();
  const hasFailedAdminRoute = currentHealth.statuses.some((status) => !status.ok);
  const hasVerySlowAdminRoute = currentHealth.statuses.some(
    (status) => (status.durationMs ?? 0) >= 2000,
  );
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const recommendedBehavior = getRecommendedBehavior(currentHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);
  const promoteCurrentMemberActions = hasFailedAdminRoute || hasVerySlowAdminRoute;

  const preferredHref = promoteCurrentMemberActions ? secondaryHref : primaryHref;
  const preferredLabel = promoteCurrentMemberActions
    ? secondaryLabel
    : primaryLabel;
  const queueHref = promoteCurrentMemberActions ? primaryHref : secondaryHref;
  const queueLabel = promoteCurrentMemberActions ? primaryLabel : secondaryLabel;

  return (
    <div className="mt-4">
      {(hasFailedAdminRoute || hasVerySlowAdminRoute) ? (
        <div className="mb-4 rounded-2xl border border-current/15 bg-white/40 px-4 py-3 text-sm text-slate-700 dark:text-stone-200">
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
            {hasFailedAdminRoute
              ? "Current-member actions are safer than broader queue navigation while the admin path is degraded."
              : "Broader queue navigation may lag. Start with this member’s current report actions when possible."}
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
      <div className="flex flex-wrap gap-3">
        <Link
          href={preferredHref}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${primaryClasses(tone)}`}
        >
          {preferredLabel}
        </Link>
        <Link
          href={queueHref}
          className="rounded-full border border-(--color-line) bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:bg-stone-950/30 dark:text-stone-100 dark:hover:bg-stone-950/50"
        >
          {queueLabel}
        </Link>
      </div>
    </div>
  );
}
