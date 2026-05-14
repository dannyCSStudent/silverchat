import type { AdminUser } from "@repo/types";

export const ENFORCEMENT_HEAVY_TITLES = new Set([
  "Verification follow-up needed",
  "Temporary ban follow-up overdue",
  "Temporary ban expiring soon",
  "Temporary restriction active",
  "Permanent restriction active",
]);

export type ModeratorWorkloadSnapshot = {
  adminUserId: string;
  openAssignedCount: number;
  totalAssignedCount: number;
  urgentAssignedCount: number;
};

export function roleRank(role?: AdminUser["role"]) {
  if (role === "admin") {
    return 3;
  }
  if (role === "lead") {
    return 2;
  }

  return 1;
}

export function requiresElevatedCapability(attentionTitles: string[]) {
  return attentionTitles.some((title) => ENFORCEMENT_HEAVY_TITLES.has(title));
}

export function rankAssignmentTargets(args: {
  adminUsers: AdminUser[];
  adminWorkloads: ModeratorWorkloadSnapshot[];
  excludeAdminUserId?: string;
  minimumRoleRank?: number;
  preferredAdminUserId?: string;
}) {
  const {
    adminUsers,
    adminWorkloads,
    excludeAdminUserId,
    minimumRoleRank = 1,
    preferredAdminUserId,
  } = args;

  const rankedTargets = adminUsers
    .filter((adminUser) => adminUser.id !== excludeAdminUserId)
    .filter((adminUser) => roleRank(adminUser.role) >= minimumRoleRank)
    .map((adminUser) => {
      const workload = adminWorkloads.find(
        (candidateWorkload) => candidateWorkload.adminUserId === adminUser.id,
      );

      return {
        adminUser,
        openAssignedCount: workload?.openAssignedCount ?? 0,
        totalAssignedCount: workload?.totalAssignedCount ?? 0,
        urgentAssignedCount: workload?.urgentAssignedCount ?? 0,
      };
    })
    .sort((left, right) => {
      if (left.urgentAssignedCount !== right.urgentAssignedCount) {
        return left.urgentAssignedCount - right.urgentAssignedCount;
      }
      if (left.openAssignedCount !== right.openAssignedCount) {
        return left.openAssignedCount - right.openAssignedCount;
      }
      if (left.totalAssignedCount !== right.totalAssignedCount) {
        return left.totalAssignedCount - right.totalAssignedCount;
      }
      if (preferredAdminUserId) {
        if (left.adminUser.id === preferredAdminUserId) {
          return -1;
        }
        if (right.adminUser.id === preferredAdminUserId) {
          return 1;
        }
      }
      return 0;
    });

  const topTarget = rankedTargets[0];

  return rankedTargets.map((target) => {
    const isPreferred = preferredAdminUserId === target.adminUser.id;
    const tiesTopLoad =
      topTarget &&
      target.urgentAssignedCount === topTarget.urgentAssignedCount &&
      target.openAssignedCount === topTarget.openAssignedCount &&
      target.totalAssignedCount === topTarget.totalAssignedCount;

    let recommendationReason = "lightest available target";
    if (minimumRoleRank >= 2) {
      recommendationReason = "lightest capable lead/admin target";
    }
    if (isPreferred && tiesTopLoad) {
      recommendationReason =
        minimumRoleRank >= 2
          ? "preferred capable admin among equally light targets"
          : "preferred admin among equally light targets";
    }

    return {
      ...target,
      recommendationReason,
    };
  });
}
