import type { AdminUser, ModerationBlock, ModerationReport } from "@repo/types";

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

export type ModerationData = {
  adminUser: AdminUser | null;
  adminUsers: AdminUser[];
  reports: ModerationReport[];
  blocks: ModerationBlock[];
  isFallback: boolean;
  configurationError: string | null;
};

export async function getModerationData(
  adminUsername: string,
): Promise<ModerationData> {
  if (!adminApiToken) {
    return {
      adminUser: null,
      adminUsers: [],
      reports: [],
      blocks: [],
      isFallback: true,
      configurationError: "Missing ADMIN_API_TOKEN in apps/web environment.",
    };
  }

  try {
    const baseHeaders = {
      "X-Admin-Token": adminApiToken,
      ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
    };
    const [adminUserResponse, adminUsersResponse, reportsResponse, blocksResponse] =
      await Promise.all([
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

    if (
      !adminUserResponse.ok ||
      !adminUsersResponse.ok ||
      !reportsResponse.ok ||
      !blocksResponse.ok
    ) {
      throw new Error("Moderation API request failed");
    }

    const [adminUser, adminUsers, reports, blocks] = (await Promise.all([
      adminUserResponse.json(),
      adminUsersResponse.json(),
      reportsResponse.json(),
      blocksResponse.json(),
    ])) as [AdminUser, AdminUser[], ModerationReport[], ModerationBlock[]];

    return {
      adminUser,
      adminUsers,
      reports,
      blocks,
      isFallback: false,
      configurationError: null,
    };
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
