import Link from "next/link";
import type { ModerationBlock, ModerationReport } from "@repo/types";

import { Hero } from "../components/hero";
import { ReportFeed } from "./report-feed";

const apiBaseUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";
const adminApiToken = process.env.ADMIN_API_TOKEN;

const fallbackReports: ModerationReport[] = [
  {
    id: "sample-report-1",
    reporter_user_id: "user-1",
    reported_user_id: "user-9",
    reason: "harassment",
    details: "Repeated insults within the first minute.",
    status: "open",
    created_at: "2026-05-07T15:00:00.000Z",
    reporter_profile: {
      user_id: "user-1",
      display_name: "Eleanor",
      country_code: "US",
      profile_status: "active",
      age_verified_status: "self_attested",
    },
    reported_profile: {
      user_id: "user-9",
      display_name: "Martin",
      country_code: "CA",
      profile_status: "active",
      age_verified_status: "pending",
    },
  },
  {
    id: "sample-report-2",
    reporter_user_id: "user-2",
    reported_user_id: "user-4",
    reason: "scam",
    details: "Asked to move the conversation to a payment app immediately.",
    status: "reviewing",
    created_at: "2026-05-07T13:20:00.000Z",
    reporter_profile: {
      user_id: "user-2",
      display_name: "Nina",
      country_code: "US",
      profile_status: "active",
      age_verified_status: "verified",
    },
    reported_profile: {
      user_id: "user-4",
      display_name: "David",
      country_code: "GB",
      profile_status: "active",
      age_verified_status: "self_attested",
    },
    session: {
      id: "session-2",
      initiator_user_id: "user-2",
      recipient_user_id: "user-4",
      status: "reported",
      created_at: "2026-05-07T13:15:00.000Z",
    },
  },
];

const fallbackBlocks: ModerationBlock[] = [
  {
    id: "sample-block-1",
    blocker_user_id: "user-1",
    blocked_user_id: "user-9",
    reason: "Felt unsafe after first match.",
    created_at: "2026-05-07T15:03:00.000Z",
    blocker_profile: {
      user_id: "user-1",
      display_name: "Eleanor",
      country_code: "US",
      profile_status: "active",
    },
    blocked_profile: {
      user_id: "user-9",
      display_name: "Martin",
      country_code: "CA",
      profile_status: "active",
    },
  },
];

function profileLabel(profile?: {
  display_name?: string;
  user_id: string;
  country_code?: string;
  profile_status?: string;
  age_verified_status?: string;
}) {
  return profile?.display_name ?? profile?.user_id ?? "Unknown profile";
}

function formatDate(value?: string) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type ModerationData = {
  reports: ModerationReport[];
  blocks: ModerationBlock[];
  isFallback: boolean;
  configurationError: string | null;
};

type ModerationSearchParams = {
  status?: string;
  reason?: string;
  subject?: string;
};

async function getModerationData(): Promise<ModerationData> {
  if (!adminApiToken) {
    return {
      reports: [] as ModerationReport[],
      blocks: [] as ModerationBlock[],
      isFallback: true,
      configurationError: "Missing ADMIN_API_TOKEN in apps/web environment.",
    };
  }

  try {
    const [reportsResponse, blocksResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/reports/`, {
        cache: "no-store",
        headers: { "X-Admin-Token": adminApiToken },
      }),
      fetch(`${apiBaseUrl}/blocks/`, {
        cache: "no-store",
        headers: { "X-Admin-Token": adminApiToken },
      }),
    ]);

    if (!reportsResponse.ok || !blocksResponse.ok) {
      throw new Error("Moderation API request failed");
    }

    const [reports, blocks] = (await Promise.all([
      reportsResponse.json(),
      blocksResponse.json(),
    ])) as [ModerationReport[], ModerationBlock[]];

    return { reports, blocks, isFallback: false, configurationError: null };
  } catch {
    return {
      reports: fallbackReports,
      blocks: fallbackBlocks,
      isFallback: true,
      configurationError: null,
    };
  }
}

function buildModerationHref(filters: ModerationSearchParams) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.reason) {
    params.set("reason", filters.reason);
  }
  if (filters.subject) {
    params.set("subject", filters.subject);
  }

  const query = params.toString();
  return query ? `/moderation?${query}` : "/moderation";
}

function matchesSubject(report: ModerationReport, subject?: string) {
  if (!subject) {
    return true;
  }

  return (
    report.reported_user_id === subject ||
    report.reported_profile?.user_id === subject ||
    report.reported_profile?.display_name?.toLowerCase().includes(subject.toLowerCase())
  );
}

type ModerationPageProps = {
  searchParams?: Promise<ModerationSearchParams>;
};

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { reports, blocks, isFallback, configurationError } = await getModerationData();
  const selectedStatus = resolvedSearchParams.status?.trim() || "";
  const selectedReason = resolvedSearchParams.reason?.trim() || "";
  const selectedSubject = resolvedSearchParams.subject?.trim() || "";
  const filteredReports = reports.filter((report) => {
    if (selectedStatus && (report.status ?? "open") !== selectedStatus) {
      return false;
    }
    if (selectedReason && report.reason !== selectedReason) {
      return false;
    }
    if (!matchesSubject(report, selectedSubject)) {
      return false;
    }
    return true;
  });
  const filteredBlocks = selectedSubject
    ? blocks.filter(
        (block) =>
          block.blocked_user_id === selectedSubject ||
          block.blocked_profile?.user_id === selectedSubject ||
          block.blocked_profile?.display_name?.toLowerCase().includes(selectedSubject.toLowerCase()),
      )
    : blocks;
  const openReports = reports.filter((report) => report.status === "open").length;
  const activeReviews = reports.filter((report) => report.status === "reviewing").length;
  const scamReports = reports.filter((report) => report.reason === "scam").length;
  const repeatOffenders = Object.values(
    reports.reduce<Record<string, { userId: string; label: string; count: number }>>((accumulator, report) => {
      const key = report.reported_user_id;
      const existing = accumulator[key];
      if (existing) {
        existing.count += 1;
        return accumulator;
      }

      accumulator[key] = {
        userId: key,
        label: profileLabel(report.reported_profile),
        count: 1,
      };
      return accumulator;
    }, {}),
  )
    .filter((item) => item.count > 1)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
  const activeFilterCount = [selectedStatus, selectedReason, selectedSubject].filter(Boolean).length;

  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <Hero
        eyebrow="Moderation"
        title="Triage reports and block signals before live video expands."
        copy="This first ops view reads the safety events already stored in FastAPI and Supabase so moderators can see trust pressure forming early."
      />

      {configurationError ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-(--shadow-md)">
          {configurationError}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                Queue pressure
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
                Current moderation volume
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

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href={buildModerationHref({ reason: selectedReason || undefined, subject: selectedSubject || undefined, status: "open" })} className="rounded-3xl bg-(--color-surface-dark) p-5 text-white transition hover:opacity-92">
              <p className="text-sm text-white/58">Open reports</p>
              <p className="mt-3 text-4xl font-semibold">{openReports}</p>
              <p className="mt-3 text-sm text-white/62">Needs first-pass moderator review.</p>
            </Link>
            <Link href={buildModerationHref({ reason: selectedReason || undefined, subject: selectedSubject || undefined, status: "reviewing" })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Active reviews</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{activeReviews}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Already escalated beyond intake.</p>
            </Link>
            <Link href={buildModerationHref({ status: selectedStatus || undefined, subject: selectedSubject || undefined, reason: "scam" })} className="rounded-3xl border border-(--color-line) bg-(--color-accent-soft) p-5 transition hover:opacity-92">
              <p className="text-sm text-slate-600">Scam reports</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950">{scamReports}</p>
              <p className="mt-3 text-sm text-slate-600">Highest-risk trust pattern right now.</p>
            </Link>
          </div>

          <div className="mt-6 rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">Report feed</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {filteredReports.length} report{filteredReports.length === 1 ? "" : "s"}
                  {activeFilterCount > 0 ? ` after ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildModerationHref({})}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeFilterCount === 0
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  All
                </Link>
                <Link
                  href={buildModerationHref({ status: "open", reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedStatus === "open"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Open
                </Link>
                <Link
                  href={buildModerationHref({ status: "reviewing", reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedStatus === "reviewing"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Reviewing
                </Link>
                <Link
                  href={buildModerationHref({ status: selectedStatus || undefined, reason: "scam", subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedReason === "scam"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Scam
                </Link>
              </div>
            </div>
            {filteredReports.length > 0 ? (
              <ReportFeed reports={filteredReports} />
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface) p-5 text-sm text-slate-600 dark:text-slate-300">
                No reports match the current filters.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Repeat offenders
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Fast drill-down targets
            </h2>
            <div className="mt-6 space-y-3">
              {repeatOffenders.length > 0 ? (
                repeatOffenders.map((offender) => (
                  <Link
                    key={offender.userId}
                    href={buildModerationHref({ subject: offender.userId })}
                    className="block rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)"
                  >
                    <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">{offender.label}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {offender.count} reports tied to this member
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No repeated reported users yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Blocks
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Recent self-protection signals
            </h2>
            <div className="mt-6 space-y-4">
              {filteredBlocks.length > 0 ? (
                filteredBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
                  >
                    <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                      {profileLabel(block.blocker_profile)} blocked {profileLabel(block.blocked_profile)}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {block.reason ?? "No reason submitted."}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {block.blocker_profile?.country_code ?? "Country unknown"} to{" "}
                      {block.blocked_profile?.country_code ?? "Country unknown"}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(block.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No blocks match the current filters.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Next step
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              What this dashboard still needs
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <li>1. Role-based auth beyond the current shared admin gate.</li>
              <li>2. Persistent moderator notes and escalation history.</li>
              <li>3. Saved queues for scam, underage, and harassment triage.</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
