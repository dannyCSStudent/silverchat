import { headers } from "next/headers";
import Link from "next/link";

import { Hero } from "../../../components/hero";
import { getModerationData } from "../../data";
import {
  formatDate,
  formatEventLabel,
  formatModerationEventBody,
} from "../../formatters";
import { ReportFeed } from "../../report-feed";

function profileLabel(profile?: { display_name?: string; user_id: string }) {
  return profile?.display_name ?? profile?.user_id ?? "Unknown profile";
}

function latestReportActivity(reportsAgainstMember: Awaited<
  ReturnType<typeof getModerationData>
>["reports"]) {
  const sortedEvents = reportsAgainstMember
    .flatMap((report) => report.events ?? [])
    .sort(
      (left, right) =>
        new Date(right.created_at ?? 0).getTime() -
        new Date(left.created_at ?? 0).getTime(),
    );

  return sortedEvents[0] ?? null;
}

function getMemberAttentionSummary(args: {
  currentSafetyState?: {
    expires_at?: string;
    label: string;
    state: string;
  } | null;
  openReportCount: number;
}) {
  const { currentSafetyState, openReportCount } = args;

  if (currentSafetyState?.state === "verification_required") {
    return {
      tone: "amber" as const,
      title: "Verification follow-up needed",
      detail: "Member is still gated behind verification review before returning to a clear state.",
    };
  }

  if (currentSafetyState?.state === "temporarily_banned") {
    if (currentSafetyState.expires_at) {
      const expiresAt = new Date(currentSafetyState.expires_at);
      if (!Number.isNaN(expiresAt.getTime())) {
        const msRemaining = expiresAt.getTime() - Date.now();
        if (msRemaining <= 0) {
          return {
            tone: "rose" as const,
            title: "Temporary ban follow-up overdue",
            detail: "Restriction has expired and needs a lift or extension decision.",
          };
        }
        if (msRemaining <= 24 * 60 * 60 * 1000) {
          return {
            tone: "amber" as const,
            title: "Temporary ban expiring soon",
            detail: `Restriction expires ${formatDate(currentSafetyState.expires_at)} and needs review.`,
          };
        }
      }
    }

    return {
      tone: "rose" as const,
      title: "Temporary restriction active",
      detail: "Member remains temporarily banned until the restriction is lifted or expires.",
    };
  }

  if (currentSafetyState?.state === "permanently_banned") {
    return {
      tone: "rose" as const,
      title: "Permanent restriction active",
      detail: "Member is currently in a permanently banned state.",
    };
  }

  if (openReportCount > 0) {
    return {
      tone: "slate" as const,
      title: "Open reports need resolution",
      detail: `${openReportCount} open report${openReportCount === 1 ? "" : "s"} still need moderator action.`,
    };
  }

  if (currentSafetyState?.state === "warned") {
    return {
      tone: "slate" as const,
      title: "Monitor after warning",
      detail: "Member is currently warned with no active restriction in place.",
    };
  }

  return {
    tone: "emerald" as const,
    title: "No immediate action needed",
    detail: "Current safety state is clear and there are no open reports requiring follow-up.",
  };
}

export default async function ModerationMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<{ event?: string }>;
}) {
  const { userId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const adminUsername = (await headers()).get("x-admin-username") ?? "";
  const {
    adminUser,
    adminUsers,
    reports,
    blocks,
    configurationError,
    isFallback,
  } =
    await getModerationData(adminUsername);

  const reportsAgainstMember = reports.filter(
    (report) => report.reported_user_id === userId,
  );
  const reportsFiledByMember = reports.filter(
    (report) => report.reporter_user_id === userId,
  );
  const relatedBlocks = blocks.filter(
    (block) => block.blocked_user_id === userId || block.blocker_user_id === userId,
  );
  const subjectProfile =
    reportsAgainstMember[0]?.reported_profile ??
    reportsFiledByMember[0]?.reporter_profile ??
    relatedBlocks.find((block) => block.blocked_user_id === userId)?.blocked_profile ??
    relatedBlocks.find((block) => block.blocker_user_id === userId)?.blocker_profile;
  const currentSafetyState = reportsAgainstMember.find(
    (report) => report.member_safety_state,
  )?.member_safety_state;
  const currentAssignee = reportsAgainstMember.find(
    (report) => report.current_assignee_admin_user ?? report.current_assignee,
  );
  const openReportCount = reportsAgainstMember.filter(
    (report) => (report.status ?? "open") === "open",
  ).length;
  const lastActivity = latestReportActivity(reportsAgainstMember);
  const attentionSummary = getMemberAttentionSummary({
    currentSafetyState,
    openReportCount,
  });
  const recentEvents = reportsAgainstMember
    .flatMap((report) => report.events ?? [])
    .sort((left, right) =>
      new Date(right.created_at ?? 0).getTime() -
      new Date(left.created_at ?? 0).getTime(),
    )
    .slice(0, 12);
  const selectedEventType = resolvedSearchParams.event?.trim() || "";
  const filteredRecentEvents = selectedEventType
    ? recentEvents.filter((event) => event.event_type === selectedEventType)
    : recentEvents;
  const eventCounts = recentEvents.reduce<Record<string, number>>((accumulator, event) => {
    accumulator[event.event_type] = (accumulator[event.event_type] ?? 0) + 1;
    return accumulator;
  }, {});
  const eventFilters = [
    { label: "All", value: "", count: recentEvents.length },
    {
      label: "Status",
      value: "report_status_changed",
      count: eventCounts.report_status_changed ?? 0,
    },
    {
      label: "Assignments",
      value: "report_assignment_changed",
      count: eventCounts.report_assignment_changed ?? 0,
    },
    {
      label: "Enforcement",
      value: "enforcement_action_recorded",
      count: eventCounts.enforcement_action_recorded ?? 0,
    },
    {
      label: "Reviews",
      value: "enforcement_review_recorded",
      count: eventCounts.enforcement_review_recorded ?? 0,
    },
    {
      label: "Notes",
      value: "moderation_note_added",
      count: eventCounts.moderation_note_added ?? 0,
    },
  ].filter((filter) => filter.value === "" || filter.count > 0);

  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <Hero
        eyebrow="Member Detail"
        title={profileLabel(subjectProfile)}
        copy="Aggregate safety context for one member: reports, blocks, current safety state, and moderation history."
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/moderation?subject=${userId}`}
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
        >
          Open report queue
        </Link>
        <Link
          href="/moderation"
          className="rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
        >
          Back to moderation
        </Link>
      </div>

      {configurationError ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-(--shadow-md)">
          {configurationError}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                  Member
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
                  {profileLabel(subjectProfile)}
                </h2>
              </div>
              <div
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  isFallback ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {isFallback ? "Fallback dataset" : "Live API connected"}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Current safety state</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-stone-100">
                  {currentSafetyState?.label ?? "Clear"}
                </p>
                {currentSafetyState?.expires_at ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Expires {formatDate(currentSafetyState.expires_at)}
                  </p>
                ) : null}
              </div>
              <div className="rounded-3xl bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Profile and verification</p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {subjectProfile?.country_code ?? "Country unknown"} ·{" "}
                  {subjectProfile?.profile_status ?? "Profile state unknown"} ·{" "}
                  {subjectProfile?.age_verified_status ?? "Verification unknown"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-4">
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Current restriction</p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-stone-100">
                  {currentSafetyState?.label ?? "Clear"}
                </p>
              </div>
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Assigned moderator</p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-stone-100">
                  {currentAssignee?.current_assignee_admin_user?.display_name ||
                    currentAssignee?.current_assignee ||
                    "Unassigned"}
                </p>
              </div>
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Open reports</p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-stone-100">
                  {openReportCount}
                </p>
              </div>
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Last moderation action</p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-stone-100">
                  {lastActivity ? lastActivity.event_type.replaceAll("_", " ") : "No activity"}
                </p>
                {lastActivity?.created_at ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(lastActivity.created_at)}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className={`mt-4 rounded-3xl border p-5 ${
                attentionSummary.tone === "rose"
                  ? "border-rose-200 bg-rose-50"
                  : attentionSummary.tone === "amber"
                    ? "border-amber-200 bg-amber-50"
                    : attentionSummary.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-(--color-line) bg-(--color-surface-strong)"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${
                  attentionSummary.tone === "rose"
                    ? "text-rose-800"
                    : attentionSummary.tone === "amber"
                      ? "text-amber-800"
                      : attentionSummary.tone === "emerald"
                        ? "text-emerald-800"
                        : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Attention needed
              </p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  attentionSummary.tone === "rose"
                    ? "text-rose-950"
                    : attentionSummary.tone === "amber"
                      ? "text-amber-950"
                      : attentionSummary.tone === "emerald"
                        ? "text-emerald-950"
                        : "text-slate-950 dark:text-stone-100"
                }`}
              >
                {attentionSummary.title}
              </p>
              <p
                className={`mt-2 text-sm ${
                  attentionSummary.tone === "rose"
                    ? "text-rose-900"
                    : attentionSummary.tone === "amber"
                      ? "text-amber-900"
                      : attentionSummary.tone === "emerald"
                        ? "text-emerald-900"
                        : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {attentionSummary.detail}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Reports against</p>
                <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">
                  {reportsAgainstMember.length}
                </p>
              </div>
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Reports filed</p>
                <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">
                  {reportsFiledByMember.length}
                </p>
              </div>
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Blocks involving member</p>
                <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">
                  {relatedBlocks.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Blocks
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Block history
            </h2>
            <div className="mt-6 space-y-3">
              {relatedBlocks.length > 0 ? (
                relatedBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
                  >
                    <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                      {profileLabel(block.blocker_profile)} blocked {profileLabel(block.blocked_profile)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {block.reason ?? "No reason submitted."}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(block.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No blocks involving this member.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Reports
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Reports against this member
            </h2>
            <div className="mt-6">
              {reportsAgainstMember.length > 0 ? (
                <ReportFeed
                  adminUsers={adminUsers}
                  currentAdminUserId={adminUser?.id}
                  currentAdminRole={adminUser?.role}
                  currentAdminUsername={adminUser?.username ?? adminUsername}
                  reports={reportsAgainstMember}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No reports against this member.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Timeline
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Recent moderation history
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {eventFilters.map((filter) => (
                <Link
                  key={filter.value || "all"}
                  href={
                    filter.value
                      ? `/moderation/members/${userId}?event=${filter.value}`
                      : `/moderation/members/${userId}`
                  }
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedEventType === filter.value
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface-strong) text-slate-700 hover:bg-(--color-surface) dark:text-stone-100"
                  }`}
                >
                  {filter.label} ({filter.count})
                </Link>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {filteredRecentEvents.length > 0 ? (
                filteredRecentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
                  >
                    <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                      {formatEventLabel(event.event_type)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {formatModerationEventBody(event)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No moderation events match the current filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
