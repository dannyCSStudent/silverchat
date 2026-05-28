"use client";

import Link from "next/link";
import type { ModerationReport } from "@repo/types";

import {
  getHighestAttentionRoute,
  getWorkflowMode,
} from "./admin-health-status-strip";
import { getHealthSummary } from "./admin-health-utils";
import { LocalRecoveryHint } from "./local-recovery-hint";
import { getModerationSlaSummary } from "./moderation-sla-panel";
import { useLiveAdminHealth } from "./use-live-admin-health";

type ModerationAlertPanelProps = {
  reports: ModerationReport[];
};

type AlertRule = {
  description: string;
  href: string;
  severity: "amber" | "rose";
  title: string;
};

const FIRST_ACTION_ESCALATION_THRESHOLD = 5;
const RESOLUTION_ESCALATION_THRESHOLD = 3;

export function ModerationAlertPanel({ reports }: ModerationAlertPanelProps) {
  const { currentHealth } = useLiveAdminHealth();
  const slaSummary = getModerationSlaSummary(reports);
  const healthSummary = getHealthSummary(currentHealth);
  const workflowMode = getWorkflowMode(currentHealth.statuses);
  const highestAttentionRoute = getHighestAttentionRoute(currentHealth.statuses);
  const hasSlaAlert =
    slaSummary.overdueFirstAction.length > 0 || slaSummary.overdueResolution.length > 0;
  const hasHealthAlert = healthSummary !== "Healthy";
  const hasAlerts = hasSlaAlert || hasHealthAlert;
  const alertTone = !hasAlerts
    ? "emerald"
    : hasHealthAlert || slaSummary.overdueResolution.length > 0
      ? "rose"
      : "amber";
  const alertRules: AlertRule[] = [
    ...(hasHealthAlert
      ? [
          {
            description:
              "Admin routes are degraded or slow enough to risk stale moderation decisions.",
            href: "/health",
            severity: "rose" as const,
            title: `Admin path ${healthSummary.toLowerCase()}`,
          },
        ]
      : []),
    ...(slaSummary.overdueResolution.length >= RESOLUTION_ESCALATION_THRESHOLD
      ? [
          {
            description: `${slaSummary.overdueResolution.length} cases are overdue for resolution.`,
            href: "/moderation?status=open",
            severity: "rose" as const,
            title: "Resolution backlog high",
          },
        ]
      : []),
    ...(slaSummary.overdueFirstAction.length >= FIRST_ACTION_ESCALATION_THRESHOLD
      ? [
          {
            description: `${slaSummary.overdueFirstAction.length} cases still need a first moderation action.`,
            href: "/moderation?queue=open-unassigned",
            severity: "amber" as const,
            title: "First-action backlog high",
          },
        ]
      : []),
  ];

  return (
    <section
      className={`rounded-[34px] border p-6 shadow-(--shadow-md) ${
        alertTone === "rose"
          ? "border-rose-200 bg-rose-50"
          : alertTone === "amber"
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${
              alertTone === "rose"
                ? "text-rose-800"
                : alertTone === "amber"
                  ? "text-amber-800"
                  : "text-emerald-800"
            }`}
          >
            High-risk alerts
          </p>
          <h2
            className={`mt-2 text-2xl font-semibold tracking-tight ${
              alertTone === "rose"
                ? "text-rose-950"
                : alertTone === "amber"
                  ? "text-amber-950"
                  : "text-emerald-950"
            }`}
          >
            Lead attention required
          </h2>
          <p
            className={`mt-2 text-sm ${
              alertTone === "rose"
                ? "text-rose-950"
                : alertTone === "amber"
                  ? "text-amber-950"
                  : "text-emerald-950"
            }`}
          >
            {hasAlerts
              ? [
                  hasHealthAlert ? `Admin path is ${healthSummary.toLowerCase()}` : null,
                  hasSlaAlert
                    ? `${slaSummary.overdueResolution.length} overdue resolution${slaSummary.overdueResolution.length === 1 ? "" : "s"} and ${slaSummary.overdueFirstAction.length} waiting for a first action`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "No high-risk alerts are currently active."}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            workflowMode.classes
          }`}
        >
          {workflowMode.label}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white/70 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Overdue resolution</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
            {slaSummary.overdueResolution.length}
          </p>
        </div>
        <div className="rounded-3xl bg-white/70 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Waiting for first action</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
            {slaSummary.overdueFirstAction.length}
          </p>
        </div>
        <div className="rounded-3xl bg-white/70 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Health state</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
            {healthSummary}
          </p>
        </div>
        <div className="rounded-3xl bg-white/70 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Alert mode</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
            {workflowMode.label}
          </p>
        </div>
      </div>

      {alertRules.length > 0 ? (
        <div className="mt-6 rounded-3xl border border-current/20 bg-white/70 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Threshold alerts
          </p>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {alertRules.map((rule) => (
              <Link
                key={rule.title}
                href={rule.href}
                className={`rounded-2xl border px-4 py-3 transition hover:bg-white ${
                  rule.severity === "rose"
                    ? "border-rose-200 bg-rose-50 text-rose-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                <p className="text-sm font-semibold">{rule.title}</p>
                <p className="mt-1 text-xs opacity-80">{rule.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {slaSummary.overdueFirstAction.length > 0 ? (
          <Link
            href="/moderation?queue=open-unassigned"
            className="rounded-full border border-current/20 bg-white/80 px-4 py-2 text-xs font-semibold transition hover:bg-white"
          >
            Review first-action backlog
          </Link>
        ) : null}
        {slaSummary.overdueResolution.length > 0 ? (
          <Link
            href="/moderation?status=open"
            className="rounded-full border border-current/20 bg-white/80 px-4 py-2 text-xs font-semibold transition hover:bg-white"
          >
            Review overdue cases
          </Link>
        ) : null}
        {highestAttentionRoute ? (
          <LocalRecoveryHint
            route={highestAttentionRoute}
            prefix=""
            showPath
            className="flex flex-wrap items-center gap-2 text-xs"
            pathClassName="text-xs font-semibold"
            endpointClassName="rounded-full border border-current/20 bg-white/80 px-4 py-2 font-semibold transition hover:bg-white"
          />
        ) : null}
      </div>
    </section>
  );
}
