import { headers } from "next/headers";
import Link from "next/link";
import type {
  AdminUser,
  MemberSafetyState,
  ModerationBlock,
  ModerationEnforcementAction,
  ModerationReport,
} from "@repo/types";

import { Hero } from "../components/hero";
import { getModerationAdminHealth, getModerationData } from "./data";
import { AdminHealthPanel } from "./admin-health-panel";
import { DataSourceBadge } from "./data-source-badge";
import { FallbackWarningPanel } from "./fallback-warning-panel";
import { getMemberAttentionSummary } from "./formatters";
import { ReportFeed } from "./report-feed";
import { WorkloadRebalance } from "./workload-rebalance";

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

function canHandleEnforcementHeavyUrgentWork(role?: AdminUser["role"]) {
  return role === "lead" || role === "admin";
}

type ModerationSearchParams = {
  assignee?: string;
  actor?: string;
  enforcement?: string;
  queue?: string;
  safety?: string;
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
  safetyState: "" | MemberSafetyState;
  reason: string;
  status: string;
};

type SavedQueueKey =
  | "open-unassigned"
  | "assigned-to-me"
  | "assigned"
  | "urgent-unassigned"
  | "urgent-assigned"
  | "scam-open"
  | "underage-open"
  | "harassment-open"
  | "warning-active"
  | "verification-required"
  | "temporary-banned"
  | "permanent-banned"
  | "temporary-ban-expiring"
  | "temporary-ban-expired"
  | "verification-follow-up"
  | "attention-needed"
  | "currently-warned"
  | "currently-verification-required"
  | "currently-temporarily-banned"
  | "currently-permanently-banned";

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
    key: "urgent-unassigned",
    label: "Urgent unassigned",
    description: "Attention-needed cases still sitting without an owner.",
  },
  {
    key: "urgent-assigned",
    label: "Urgent assigned",
    description: "Urgent cases that already belong to a moderator.",
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
  {
    key: "attention-needed",
    label: "Attention needed",
    description: "Members whose current state implies urgent or active follow-up.",
  },
  {
    key: "currently-warned",
    label: "Currently warned",
    description: "Members whose current safety state is warned.",
  },
  {
    key: "currently-verification-required",
    label: "Current verification gate",
    description: "Members currently blocked on verification follow-up.",
  },
  {
    key: "currently-temporarily-banned",
    label: "Current temp bans",
    description: "Members with an active temporary restriction.",
  },
  {
    key: "currently-permanently-banned",
    label: "Current permanent bans",
    description: "Members whose current safety state is permanently banned.",
  },
];

function getEnforcementExpiryTimestamp(report: ModerationReport) {
  if (report.latest_enforcement?.action !== "temporary_ban") {
    return null;
  }

  if (report.latest_enforcement_review?.action === "lift_ban") {
    return null;
  }

  const baseCreatedAt =
    report.latest_enforcement_review?.action === "extend_temporary_ban"
      ? report.latest_enforcement_review.created_at
      : report.latest_enforcement.created_at;
  const baseDurationHours =
    report.latest_enforcement_review?.action === "extend_temporary_ban"
      ? report.latest_enforcement_review.duration_hours
      : report.latest_enforcement.duration_hours;

  if (!baseCreatedAt || !baseDurationHours) {
    return null;
  }

  const createdAt = new Date(baseCreatedAt);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return createdAt.getTime() + baseDurationHours * 60 * 60 * 1000;
}

function matchesEnforcementFollowUp(
  report: ModerationReport,
  followUpMode: EnforcementFollowUpMode,
) {
  if (!followUpMode) {
    return true;
  }

  if (followUpMode === "verification") {
    return (
      report.latest_enforcement?.action === "verification_required" &&
      report.latest_enforcement_review?.action !== "verification_completed"
    );
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

function buildModerationHref(filters: ModerationSearchParams) {
  const params = new URLSearchParams();

  if (filters.assignee) {
    params.set("assignee", filters.assignee);
  }
  if (filters.actor) {
    params.set("actor", filters.actor);
  }
  if (filters.enforcement) {
    params.set("enforcement", filters.enforcement);
  }
  if (filters.safety) {
    params.set("safety", filters.safety);
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
        reason: "",
        status: "",
      };
    case "urgent-unassigned":
      return {
        assigneeMode: "unassigned" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "",
        reason: "",
        status: "",
      };
    case "urgent-assigned":
      return {
        assigneeMode: "assigned" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
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
        safetyState: "",
        reason: "",
        status: "",
      };
    case "attention-needed":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "",
        reason: "",
        status: "",
      };
    case "currently-warned":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "warned",
        reason: "",
        status: "",
      };
    case "currently-verification-required":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "verification_required",
        reason: "",
        status: "",
      };
    case "currently-temporarily-banned":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "temporarily_banned",
        reason: "",
        status: "",
      };
    case "currently-permanently-banned":
      return {
        assigneeMode: "any" as const,
        assigneeValue: "",
        actorAdminUserId: "",
        enforcement: "",
        enforcementFollowUp: "",
        safetyState: "permanently_banned",
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
        safetyState: "",
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

function matchesSafetyState(
  report: ModerationReport,
  safetyState?: string,
) {
  if (!safetyState) {
    return true;
  }

  return report.member_safety_state?.state === safetyState;
}

function isAttentionQueueMatch(report: ModerationReport, openReportCount: number) {
  return (
    getMemberAttentionSummary({
      currentSafetyState: report.member_safety_state,
      openReportCount,
    }).title !== "No immediate action needed"
  );
}

type ModerationPageProps = {
  searchParams?: Promise<ModerationSearchParams>;
};

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestHeaders = await headers();
  const adminUsername = requestHeaders.get("x-admin-username") ?? "";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const webBaseUrl = `${proto}://${host}`;
  const [
    {
      adminUser,
      adminUsers,
      reports,
      blocks,
      isFallback,
      configurationError,
      proxyStatuses,
    },
    adminHealth,
  ] = await Promise.all([
    getModerationData(adminUsername, webBaseUrl),
    getModerationAdminHealth(adminUsername, webBaseUrl),
  ]);
  const openReportCountByUserId = reports.reduce<Record<string, number>>(
    (accumulator, report) => {
      if ((report.status ?? "open") === "open") {
        accumulator[report.reported_user_id] =
          (accumulator[report.reported_user_id] ?? 0) + 1;
      }
      return accumulator;
    },
    {},
  );
  const selectedQueue = resolvedSearchParams.queue?.trim() || "";
  const queueFilters = resolveQueueFilters(selectedQueue, adminUser?.id ?? "");
  const selectedAssignee = resolvedSearchParams.assignee?.trim() || queueFilters.assigneeValue;
  const selectedActor = resolvedSearchParams.actor?.trim() || queueFilters.actorAdminUserId;
  const selectedEnforcement = resolvedSearchParams.enforcement?.trim() || queueFilters.enforcement;
  const selectedEnforcementFollowUp: EnforcementFollowUpMode =
    queueFilters.enforcementFollowUp ?? "";
  const selectedSafety = resolvedSearchParams.safety?.trim() || queueFilters.safetyState;
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
    if (!matchesSafetyState(report, selectedSafety)) {
      return false;
    }
    if (!matchesEnforcementFollowUp(report, selectedEnforcementFollowUp)) {
      return false;
    }
    if (
      selectedAssignee &&
      report.current_assignee_admin_user_id !== selectedAssignee
    ) {
      return false;
    }
    if (
      ["attention-needed", "urgent-unassigned", "urgent-assigned"].includes(selectedQueue) &&
      !isAttentionQueueMatch(
        report,
        openReportCountByUserId[report.reported_user_id] ?? 0,
      )
    ) {
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
      !selectedAssignee &&
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
  const currentlyWarnedReports = reports.filter((report) => report.member_safety_state?.state === "warned").length;
  const currentlyVerificationRequiredReports = reports.filter((report) => report.member_safety_state?.state === "verification_required").length;
  const currentlyTemporaryBannedReports = reports.filter((report) => report.member_safety_state?.state === "temporarily_banned").length;
  const currentlyPermanentBannedReports = reports.filter((report) => report.member_safety_state?.state === "permanently_banned").length;
  const temporaryBanExpiringReports = reports.filter((report) => matchesEnforcementFollowUp(report, "temp-expiring")).length;
  const temporaryBanExpiredReports = reports.filter((report) => matchesEnforcementFollowUp(report, "temp-expired")).length;
  const urgentUnassignedReports = reports.filter(
    (report) =>
      !report.current_assignee &&
      isAttentionQueueMatch(
        report,
        openReportCountByUserId[report.reported_user_id] ?? 0,
      ),
  ).length;
  const urgentAssignedReports = reports.filter(
    (report) =>
      Boolean(report.current_assignee) &&
      isAttentionQueueMatch(
        report,
        openReportCountByUserId[report.reported_user_id] ?? 0,
      ),
  ).length;
  const membersNeedingAttention = Object.values(
    reports.reduce<
      Record<
        string,
        {
          attention: ReturnType<typeof getMemberAttentionSummary>;
          label: string;
          lastSeenAt: string;
          openReportCount: number;
          reportCount: number;
          userId: string;
        }
      >
    >((accumulator, report) => {
      const userId = report.reported_user_id;
      const existing = accumulator[userId];
      const openReportCount = reports.filter(
        (candidate) =>
          candidate.reported_user_id === userId &&
          (candidate.status ?? "open") === "open",
      ).length;
      const attention = getMemberAttentionSummary({
        currentSafetyState: report.member_safety_state,
        openReportCount,
      });

      if (attention.title === "No immediate action needed") {
        if (!existing) {
          accumulator[userId] = {
            attention,
            label: profileLabel(report.reported_profile),
            lastSeenAt: report.created_at ?? "",
            openReportCount,
            reportCount: 1,
            userId,
          };
        }
        return accumulator;
      }

      const nextItem = {
        attention,
        label: profileLabel(report.reported_profile),
        lastSeenAt: report.created_at ?? "",
        openReportCount,
        reportCount: existing ? existing.reportCount + 1 : 1,
        userId,
      };

      if (!existing) {
        accumulator[userId] = nextItem;
        return accumulator;
      }

      const toneRank = { rose: 3, amber: 2, slate: 1, emerald: 0 };
      const existingRank = toneRank[existing.attention.tone];
      const nextRank = toneRank[nextItem.attention.tone];

      if (
        nextRank > existingRank ||
        (nextRank === existingRank &&
          new Date(nextItem.lastSeenAt || 0).getTime() >
            new Date(existing.lastSeenAt || 0).getTime())
      ) {
        accumulator[userId] = nextItem;
        return accumulator;
      }

      existing.openReportCount = Math.max(existing.openReportCount, openReportCount);
      existing.reportCount += 1;
      if (
        new Date(nextItem.lastSeenAt || 0).getTime() >
        new Date(existing.lastSeenAt || 0).getTime()
      ) {
        existing.lastSeenAt = nextItem.lastSeenAt;
      }
      return accumulator;
    }, {}),
  )
    .filter((member) => member.attention.title !== "No immediate action needed")
    .sort((left, right) => {
      const toneRank = { rose: 3, amber: 2, slate: 1, emerald: 0 };
      const toneDelta = toneRank[right.attention.tone] - toneRank[left.attention.tone];
      if (toneDelta !== 0) {
        return toneDelta;
      }
      return new Date(right.lastSeenAt || 0).getTime() - new Date(left.lastSeenAt || 0).getTime();
    })
    .slice(0, 6);
  const attentionNeededCount = membersNeedingAttention.length;
  const moderatorWorkloads = adminUsers
    .map((candidate) => {
      const assignedReports = reports.filter(
        (report) => report.current_assignee_admin_user_id === candidate.id,
      );
      const openAssignedCount = assignedReports.filter(
        (report) => (report.status ?? "open") === "open",
      ).length;
      const urgentAssignedCount = assignedReports.filter((report) =>
        isAttentionQueueMatch(
          report,
          openReportCountByUserId[report.reported_user_id] ?? 0,
        ),
      ).length;

      return {
        adminUser: candidate,
        openAssignedCount,
        totalAssignedCount: assignedReports.length,
        urgentAssignedCount,
        urgentCases: assignedReports
          .filter((report) =>
            isAttentionQueueMatch(
              report,
              openReportCountByUserId[report.reported_user_id] ?? 0,
            ),
          )
          .map((report) => ({
            attentionTitle: getMemberAttentionSummary({
              currentSafetyState: report.member_safety_state,
              openReportCount: openReportCountByUserId[report.reported_user_id] ?? 0,
            }).title,
            memberLabel: profileLabel(report.reported_profile),
            reason: report.reason,
            reportId: report.id,
          })),
      };
    })
    .sort((left, right) => {
      if (right.urgentAssignedCount !== left.urgentAssignedCount) {
        return right.urgentAssignedCount - left.urgentAssignedCount;
      }
      if (right.openAssignedCount !== left.openAssignedCount) {
        return right.openAssignedCount - left.openAssignedCount;
      }
      return right.totalAssignedCount - left.totalAssignedCount;
    });
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
  const activeFilterCount = [selectedQueue, selectedAssignee, selectedActor, selectedEnforcement, selectedEnforcementFollowUp, selectedSafety, selectedStatus, selectedReason, selectedSubject].filter(Boolean).length;

  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <Hero
        eyebrow="Moderation"
        title="Triage reports and block signals before live video expands."
        copy="This first ops view reads the safety events already stored in FastAPI and Supabase so moderators can see trust pressure forming early."
      />

      <FallbackWarningPanel
        configurationError={configurationError}
        proxyStatuses={proxyStatuses}
      />

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

      <AdminHealthPanel health={adminHealth} />

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
            <DataSourceBadge isFallback={isFallback} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, reason: selectedReason || undefined, safety: selectedSafety || undefined, subject: selectedSubject || undefined, status: "open" })} className="rounded-3xl bg-(--color-surface-dark) p-5 text-white transition hover:opacity-92">
              <p className="text-sm text-white/58">Open reports</p>
              <p className="mt-3 text-4xl font-semibold">{openReports}</p>
              <p className="mt-3 text-sm text-white/62">Needs first-pass moderator review.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, reason: selectedReason || undefined, safety: selectedSafety || undefined, subject: selectedSubject || undefined, status: "reviewing" })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Active reviews</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{activeReviews}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Already escalated beyond intake.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, status: selectedStatus || undefined, safety: selectedSafety || undefined, subject: selectedSubject || undefined, reason: "scam" })} className="rounded-3xl border border-(--color-line) bg-(--color-accent-soft) p-5 transition hover:opacity-92">
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

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "currently-warned", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)">
              <p className="text-sm text-slate-500 dark:text-slate-400">Currently warned</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{currentlyWarnedReports}</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "currently-verification-required", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-amber-800">Current verification gate</p>
              <p className="mt-3 text-3xl font-semibold text-amber-950">{currentlyVerificationRequiredReports}</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "currently-temporarily-banned", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-rose-200 bg-rose-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-rose-800">Current temp bans</p>
              <p className="mt-3 text-3xl font-semibold text-rose-950">{currentlyTemporaryBannedReports}</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "currently-permanently-banned", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-rose-300 bg-rose-100 p-5 transition hover:opacity-92">
              <p className="text-sm text-rose-900">Current permanent bans</p>
              <p className="mt-3 text-3xl font-semibold text-rose-950">{currentlyPermanentBannedReports}</p>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "attention-needed", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-rose-200 bg-rose-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-rose-800">Members needing attention</p>
              <p className="mt-3 text-3xl font-semibold text-rose-950">{attentionNeededCount}</p>
              <p className="mt-2 text-sm text-rose-900">Any member with an active follow-up, restriction, or unresolved case.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "urgent-unassigned", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-amber-800">Urgent unassigned reports</p>
              <p className="mt-3 text-3xl font-semibold text-amber-950">{urgentUnassignedReports}</p>
              <p className="mt-2 text-sm text-amber-900">Immediate follow-up cases still waiting for an owner.</p>
            </Link>
            <Link href={buildModerationHref({ actor: selectedActor || undefined, queue: "urgent-assigned", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })} className="rounded-3xl border border-rose-200 bg-rose-50 p-5 transition hover:opacity-92">
              <p className="text-sm text-rose-800">Urgent assigned reports</p>
              <p className="mt-3 text-3xl font-semibold text-rose-950">{urgentAssignedReports}</p>
              <p className="mt-2 text-sm text-rose-900">Urgent workload already sitting with moderators.</p>
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
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, safety: selectedSafety || undefined, status: "open", reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedStatus === "open" && selectedQueue !== "open-unassigned"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Open
                </Link>
                <Link
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, safety: selectedSafety || undefined, status: "reviewing", reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedStatus === "reviewing"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Reviewing
                </Link>
                <Link
                  href={buildModerationHref({ actor: selectedActor || undefined, queue: selectedQueue || undefined, safety: "verification_required", status: selectedStatus || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedSafety === "verification_required"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Current safety gate
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
                  href={buildModerationHref({ actor: selectedActor || undefined, queue: "attention-needed", reason: selectedReason || undefined, subject: selectedSubject || undefined, status: selectedStatus || undefined })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedQueue === "attention-needed"
                      ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-slate-950"
                      : "border border-(--color-line) bg-(--color-surface) text-slate-700 hover:bg-(--color-chip-muted) dark:text-stone-100"
                  }`}
                >
                  Attention needed
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
                    href={buildModerationHref({ actor: adminUser.id, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, safety: selectedSafety || undefined, status: selectedStatus || undefined, reason: selectedReason || undefined, subject: selectedSubject || undefined })}
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
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: selectedQueue || undefined, safety: selectedSafety || undefined, status: selectedStatus || undefined, reason: "scam", subject: selectedSubject || undefined })}
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
              Team workload
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Moderator ownership snapshot
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Enforcement-heavy urgent work should stay with `lead` or `admin` moderators.
            </p>
            <div className="mt-6 space-y-3">
              {moderatorWorkloads.length > 0 ? (
                moderatorWorkloads.map((workload) => (
                  <div
                    key={workload.adminUser.id}
                    className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                          {workload.adminUser.display_name || workload.adminUser.username}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {workload.adminUser.role}
                          </span>
                          {canHandleEnforcementHeavyUrgentWork(workload.adminUser.role) ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                              Enforcement-ready
                            </span>
                          ) : (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                              Review-only for urgent enforcement
                            </span>
                          )}
                        </div>
                      </div>
                      {adminUser?.id === workload.adminUser.id ? (
                        <Link
                          href={buildModerationHref({ assignee: workload.adminUser.id })}
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-stone-100 dark:text-slate-950"
                        >
                          My queue
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <Link
                        href={buildModerationHref({ assignee: workload.adminUser.id })}
                        className="rounded-2xl bg-(--color-surface) px-3 py-4 transition hover:bg-(--color-chip-muted)"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Assigned
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-stone-100">
                          {workload.totalAssignedCount}
                        </p>
                      </Link>
                      <Link
                        href={buildModerationHref({ assignee: workload.adminUser.id, status: "open" })}
                        className="rounded-2xl bg-(--color-surface) px-3 py-4 transition hover:bg-(--color-chip-muted)"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Open
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-stone-100">
                          {workload.openAssignedCount}
                        </p>
                      </Link>
                      <Link
                        href={buildModerationHref({ assignee: workload.adminUser.id, queue: "urgent-assigned" })}
                        className="rounded-2xl bg-(--color-surface) px-3 py-4 transition hover:bg-(--color-chip-muted)"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Urgent
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-rose-950">
                          {workload.urgentAssignedCount}
                        </p>
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={buildModerationHref({ assignee: workload.adminUser.id })}
                        className="rounded-full border border-(--color-line) bg-(--color-surface) px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-(--color-chip-muted) dark:text-stone-100"
                      >
                        View assigned
                      </Link>
                      <Link
                        href={buildModerationHref({ assignee: workload.adminUser.id, queue: "urgent-assigned" })}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-900 transition hover:opacity-92"
                      >
                        View urgent
                      </Link>
                    </div>
                    <WorkloadRebalance
                      adminUsers={adminUsers}
                      adminWorkloads={moderatorWorkloads.map((candidateWorkload) => ({
                        adminUserId: candidateWorkload.adminUser.id,
                        openAssignedCount: candidateWorkload.openAssignedCount,
                        totalAssignedCount: candidateWorkload.totalAssignedCount,
                        urgentAssignedCount: candidateWorkload.urgentAssignedCount,
                      }))}
                      currentAdminRole={adminUser?.role}
                      fromAdminUserId={workload.adminUser.id}
                      fromAdminUserLabel={
                        workload.adminUser.display_name || workload.adminUser.username
                      }
                      urgentCases={workload.urgentCases}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No moderator workload to show yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Attention now
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Members who need action first
            </h2>
            <div className="mt-6 space-y-3">
              {membersNeedingAttention.length > 0 ? (
                membersNeedingAttention.map((member) => (
                  <Link
                    key={member.userId}
                    href={`/moderation/members/${member.userId}`}
                    className="block rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5 transition hover:bg-(--color-surface)"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">
                          {member.label}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {member.attention.title}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          member.attention.tone === "rose"
                            ? "bg-rose-100 text-rose-900"
                            : member.attention.tone === "amber"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {member.openReportCount} open
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {member.attention.detail}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Last report {formatDate(member.lastSeenAt)}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-(--color-line) bg-(--color-surface-strong) p-5 text-sm text-slate-600 dark:text-slate-300">
                  No members currently need immediate moderation follow-up.
                </div>
              )}
            </div>
          </div>

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
                  href={buildModerationHref({ actor: selectedActor || undefined, enforcement: selectedEnforcement || undefined, queue: queue.key, safety: selectedSafety || undefined, subject: selectedSubject || undefined })}
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
                    href={`/moderation/members/${offender.userId}`}
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
                      <Link href={`/moderation/members/${block.blocker_user_id}`} className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950">
                        {profileLabel(block.blocker_profile)}
                      </Link>{" "}
                      blocked{" "}
                      <Link href={`/moderation/members/${block.blocked_user_id}`} className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950">
                        {profileLabel(block.blocked_profile)}
                      </Link>
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
