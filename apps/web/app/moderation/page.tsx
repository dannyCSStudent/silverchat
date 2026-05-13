import { headers } from "next/headers";
import Link from "next/link";
import type {
  AdminUser,
  ModerationBlock,
  ModerationEnforcementAction,
  ModerationReport,
} from "@repo/types";

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
  adminUser: AdminUser | null;
  adminUsers: AdminUser[];
  reports: ModerationReport[];
  blocks: ModerationBlock[];
  isFallback: boolean;
  configurationError: string | null;
};

type ModerationSearchParams = {
  actor?: string;
  enforcement?: string;
  queue?: string;
  status?: string;
  reason?: string;
  subject?: string;
};

type EnforcementFollowUpMode = "" | "verification" | "temp-expiring" | "temp-expired";
type QueueFilters = {
  assigneeMode: "any" | "assigned" | "unassigned" | "exact";
  assigneeValue: string;
  actorAdminUserId: string;
  enforcement: "" | ModerationEnforcementAction;
  enforcementFollowUp: EnforcementFollowUpMode;
  reason: string;
  status: string;
};

type SavedQueueKey =
  | "open-unassigned"
  | "assigned-to-me"
  | "assigned"
  | "scam-open"
  | "underage-open"
  | "harassment-open"
  | "warning-active"
  | "verification-required"
  | "temporary-banned"
  | "permanent-banned"
  | "temporary-ban-expiring"
  | "temporary-ban-expired"
  | "verification-follow-up";

const savedQueues: Array<{
  description: string;
  key: SavedQueueKey;
  label: string;
}> = [
  {
    key: "open-unassigned",
    label: "Open unassigned",
    description: "Fresh cases that still need an owner.",
  },
  {
    key: "assigned-to-me",
    label: "Assigned to me",
    description: "Cases owned by the current admin identity.",
  },
  {
    key: "assigned",
    label: "Assigned",
    description: "Cases already claimed by a moderator.",
  },
  {
    key: "scam-open",
    label: "Scam open",
    description: "Open scam cases with the highest trust risk.",
  },
  {
    key: "underage-open",
    label: "Underage open",
    description: "Open age-safety cases that need immediate review.",
  },
  {
    key: "harassment-open",
    label: "Harassment open",
    description: "Open abuse cases that may require quick action.",
  },
  {
    key: "warning-active",
    label: "Warnings",
    description: "Cases with a recorded warning outcome.",
  },
  {
    key: "verification-required",
    label: "Verification required",
    description: "Members who need a stronger trust check before continuing.",
  },
  {
    key: "temporary-banned",
    label: "Temporary bans",
    description: "Time-boxed enforcement outcomes that still need follow-up.",
  },
  {
    key: "permanent-banned",
    label: "Permanent bans",
    description: "Highest-severity enforcement outcomes.",
  },
  {
    key: "temporary-ban-expiring",
    label: "Temp ban expiring",
    description: "Temporary bans that will need review within 24 hours.",
  },
  {
    key: "temporary-ban-expired",
    label: "Temp ban expired",
    description: "Temporary bans that have already elapsed and need follow-up.",
  },
  {
    key: "verification-follow-up",
    label: "Verification follow-up",
    description: "Members still gated behind verification-required outcomes.",
  },
];

function getEnforcementExpiryTimestamp(report: ModerationReport) {
  if (
    report.latest_enforcement?.action !== "temporary_ban" ||
    !report.latest_enforcement.created_at ||
    !report.latest_enforcement.duration_hours
  ) {
    return null;
  }

  const createdAt = new Date(report.latest_enforcement.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return createdAt.getTime() + report.latest_enforcement.duration_hours * 60 * 60 * 1000;
}

function matchesEnforcementFollowUp(
  report: ModerationReport,
  followUpMode: EnforcementFollowUpMode,
) {
  if (!followUpMode) {
    return true;
  }

  if (followUpMode === "verification") {
    return report.latest_enforcement?.action === "verification_required";
  }

  const expiryTimestamp = getEnforcementExpiryTimestamp(report);
  if (!expiryTimestamp) {
    return false;
  }

  const now = Date.now();
  if (followUpMode === "temp-expiring") {
    return expiryTimestamp > now && expiryTimestamp - now <= 24 * 60 * 60 * 1000;
  }

  return expiryTimestamp <= now;
}

async function getModerationData(adminUsername: string): Promise<ModerationData> {
  if (!adminApiToken) {
    return {
      adminUser: null,
      adminUsers: [],
      reports: [] as ModerationReport[],
      blocks: [] as ModerationBlock[],
      isFallback: true,
      configurationError: "Missing ADMIN_API_TOKEN in apps/web environment.",
    };
  }

  try {
    const baseHeaders = {
      "X-Admin-Token": adminApiToken,
      ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
    };
    const [adminUserResponse, adminUsersResponse, reportsResponse, blocksResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/admin-users/me`, {
        cache: "no-store",
        headers: baseHeaders,
      }),
      fetch(`${apiBaseUrl}/admin-users/`, {
        cache: "no-store",
        headers: baseHeaders,
      }),
      fetch(`${apiBaseUrl}/reports/`, {
        cache: "no-store",
        headers: baseHeaders,
      }),
      fetch(`${apiBaseUrl}/blocks/`, {
        cache: "no-store",
        headers: baseHeaders,
      }),
    ]);

    if (!adminUserResponse.ok || !adminUsersResponse.ok || !reportsResponse.ok || !blocksResponse.ok) {
      throw new Error("Moderation API request failed");
    }

    const [adminUser, adminUsers, reports, blocks] = (await Promise.all([
      adminUserResponse.json(),
      adminUsersResponse.json(),
      reportsResponse.json(),
      blocksResponse.json(),
    ])) as [AdminUser, AdminUser[], ModerationReport[], ModerationBlock[]];

    return { adminUser, adminUsers, reports, blocks, isFallback: false, configurationError: null };
  } catch {
    return {
      adminUser: null,
      adminUsers: [],
      reports: fallbackReports,
      blocks: fallbackBlocks,
      isFallback: true,
      configurationError:
        "Live moderation data is unavailable. Confirm apps/api/schema.sql has been reapplied and that the current Basic-auth username exists in public.admin_users.",
    };
  }
}

function buildModerationHref(filters: ModerationSearchParams) {
  const params = new URLSearchParams();

  if (filters.actor) {
    params.set("actor", filters.actor);
  }
  if (filters.enforcement) {
    params.set("enforcement", filters.enforcement);
  }
  if (filters.queue) {
    params.set("queue", filters.queue);
  }
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

function resolveQueueFilters(queue: string, adminUserId: string): QueueFilters {
  switch (queue) {
    case "open-unassigned":
      return {
        assigneeMode: "unassigned" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "",
        status: "open",
      };
    case "assigned-to-me":
      return {
        assigneeMode: "exact" as const,
        assigneeValue: adminUserId,
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
    case "assigned":
      return {
        assigneeMode: "assigned" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
    case "scam-open":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "scam",
        status: "open",
      };
    case "underage-open":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "underage",
        status: "open",
      };
    case "harassment-open":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "harassment",
        status: "open",
      };
    case "warning-active":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "warning",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
    case "verification-required":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "verification_required",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
    case "temporary-banned":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "temporary_ban",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
    case "permanent-banned":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "permanent_ban",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
    case "temporary-ban-expiring":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "temporary_ban",
        enforcementFollowUp: "temp-expiring" as const,
        reason: "",
        status: "",
      };
    case "temporary-ban-expired":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "temporary_ban",
        enforcementFollowUp: "temp-expired" as const,
        reason: "",
        status: "",
      };
    case "verification-follow-up":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "verification_required",
        enforcementFollowUp: "verification" as const,
        reason: "",
        status: "",
      };
    default:
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        reason: "",
        status: "",
      };
  }
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

function matchesActor(report: ModerationReport, actorAdminUserId?: string) {
  if (!actorAdminUserId) {
    return true;
  }

  return Boolean(
    report.events?.some((event) => event.actor_admin_user?.id === actorAdminUserId),
  );
}

function matchesEnforcement(
  report: ModerationReport,
  enforcement?: string,
) {
  if (!enforcement) {
    return true;
  }

  return report.latest_enforcement?.action === enforcement;
}

type ModerationPageProps = {
  searchParams?: Promise<ModerationSearchParams>;
};

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const adminUsername = (await headers()).get("x-admin-username") ?? "";
  const { adminUser, adminUsers, reports, blocks, isFallback, configurationError } = await getModerationData(adminUsername);
  const selectedQueue = resolvedSearchParams.queue?.trim() || "";
  const queueFilters = resolveQueueFilters(selectedQueue, adminUser?.id ?? "");
  const selectedActor = resolvedSearchParams.actor?.trim() || queueFilters.actorAdminUserId;
  const selectedEnforcement = resolvedSearchParams.enforcement?.trim() || queueFilters.enforcement;
  const selectedEnforcementFollowUp: EnforcementFollowUpMode =
    queueFilters.enforcementFollowUp ?? "";
  const selectedStatus = resolvedSearchParams.status?.trim() || queueFilters.status;
  const selectedReason = resolvedSearchParams.reason?.trim() || queueFilters.reason;
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
    if (!matchesActor(report, selectedActor)) {
      return false;
    }
    if (!matchesEnforcement(report, selectedEnforcement)) {
      return false;
    }
    if (!matchesEnforcementFollowUp(report, selectedEnforcementFollowUp)) {
      return false;
    }
    if (queueFilters.assigneeMode === "assigned" && !report.current_assignee) {
      return false;
    }
    if (queueFilters.assigneeMode === "unassigned" && report.current_assignee) {
      return false;
    }
    if (
      queueFilters.assigneeMode === "exact" &&
      report.current_assignee_admin_user_id !== queueFilters.assigneeValue
    ) {
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
  const warningReports = reports.filter((report) => report.latest_enforcement?.action === "warning").length;
  const verificationRequiredReports = reports.filter((report) => report.latest_enforcement?.action === "verification_required").length;
  const temporaryBanReports = reports.filter((report) => report.latest_enforcement?.action === "temporary_ban").length;
  const permanentBanReports = reports.filter((report) => report.latest_enforcement?.action === "permanent_ban").length;
  const temporaryBanExpiringReports = reports.filter((report) => matchesEnforcementFollowUp(report, "temp-expiring")).length;
  const temporaryBanExpiredReports = reports.filter((report) => matchesEnforcementFollowUp(report, "temp-expired")).length;
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
  const activeFilterCount = [selectedQueue, selectedActor, selectedEnforcement, selectedEnforcementFollowUp, selectedStatus, selectedReason, selectedSubject].filter(Boolean).length;

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

      {adminUser ? (
        <section className="rounded-[30px] border border-(--color-line) bg-(--color-surface) px-5 py-4 shadow-(--shadow-sm)">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                Moderator identity
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950 dark:text-stone-100">
                {adminUser.display_name || adminUser.username}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                @{adminUser.username}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900">
                {adminUser.role}
              </span>
            </div>
          </div>
        </section>
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
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined, status: "open" })} className="rounded-3xl bg-(--color-surface-dark) p-5 text-white transition hover:opacity-92">
              <p className="text-sm text-white/58">Open reports</p>
              <p className="mt-3 text-4xl font-semibold">{openReports}</p>
              <p className="mt-3 text-sm text-white/62">Needs first-pass moderator review.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined, status: "reviewing" })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Active reviews</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{activeReviews}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Already escalated beyond intake.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, status: selectedStatus || undefined, subject: selectedSubject || undefined, reason: "scam" })} className="rounded-3xl border border-(--color-line) bg-(--color-accent-soft) p-5 transition hover:opacity-92">
              <p className="text-sm text-slate-600">Scam reports</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950">{scamReports}</p>
              <p className="mt-3 text-sm text-slate-600">Highest-risk trust pattern right now.</p>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: "warning", queue: selectedQueue || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Warnings</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{warningReports}</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: "verification_required", queue: selectedQueue || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Verification required</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{verificationRequiredReports}</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: "temporary_ban", queue: selectedQueue || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Temporary bans</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{temporaryBanReports}</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: "permanent_ban", queue: selectedQueue || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Permanent bans</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{permanentBanReports}</p>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "temporary-ban-expiring", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-amber-800">Temporary bans expiring in 24h</p>
              <p className="mt-3 text-3xl font-semibold text-amber-950">{temporaryBanExpiringReports}</p>
              <p className="mt-2 text-sm text-amber-900">Needs release review or escalation.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "temporary-ban-expired", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-rose-200 bg-rose-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-rose-800">Temporary bans expired</p>
              <p className="mt-3 text-3xl font-semibold text-rose-950">{temporaryBanExpiredReports}</p>
              <p className="mt-2 text-sm text-rose-900">Past due for follow-up.</p>
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
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, status: "open", reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedStatus === "open" && selectedQueue !== "open-unassigned"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Open
                </Link>
                <Link
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, status: "reviewing", reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedStatus === "reviewing"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Reviewing
                </Link>
                <Link
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: "verification_required", queue: selectedQueue || undefined, status: selectedStatus || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedEnforcement === "verification_required"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Verification
                </Link>
                <Link
                  href={buildModerationHref({ actor: selectedActor || undefined, queue: "temporary-ban-expiring", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedQueue === "temporary-ban-expiring"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Expiring bans
                </Link>
                {adminUser ? (
                  <Link
                    href={buildModerationHref({ actor: adminUser.id, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, status: selectedStatus || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      selectedActor === adminUser.id
                        ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                        : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                    }`}
                  >
                    My actions
                  </Link>
                ) : null}
                <Link
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, status: selectedStatus || undefined, reason: "scam", subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedReason === "scam" && selectedQueue !== "scam-open"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Scam
                </Link>
              </div>
            </div>
            {filteredReports.length > 0 ? (
              <ReportFeed
                adminUsers={adminUsers}
                currentAdminUserId={adminUser?.id}
                currentAdminRole={adminUser?.role}
                currentAdminUsername={adminUser?.username ?? adminUsername}
                reports={filteredReports}
              />
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
              Saved queues
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              One-click moderation views
            </h2>
            <div className="mt-6 space-y-3">
              {savedQueues.map((queue) => (
                <Link
                  key={queue.key}
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: queue.key, subject: selectedSubject || undefined })}
                  className={`block rounded-3xl border p-5 transition ${
                    selectedQueue === queue.key
                      ? "border-slate-900 bg-slate-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-slate-950"
                      : "border-(--color-line) bg-(--color-surface-strong) hover:bg-(--color-surface)"
                  }`}
                >
                  <p className="text-sm font-semibold">{queue.label}</p>
                  <p className={`mt-2 text-sm ${selectedQueue === queue.key ? "text-white/72 dark:text-slate-700" : "text-slate-600 dark:text-slate-300"}`}>
                    {queue.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

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
                    href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, subject: offender.userId })}
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
              <li>1. Enforce moderator role boundaries on blocks and future enforcement tools.</li>
              <li>2. Add durable escalation outcomes beyond status changes, like strikes or suspension recommendations.</li>
              <li>3. Move from free-text assignee names to direct admin-user selection.</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
