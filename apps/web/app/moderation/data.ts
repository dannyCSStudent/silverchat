import type { AdminUser, ModerationBlock, ModerationReport } from "@repo/types";

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
  proxyStatuses: Array<{
    detail: string;
    durationMs: number | null;
    ok: boolean;
    path: string;
    status: number | null;
  }>;
};

type ProxyStatus = ModerationData["proxyStatuses"][number];

export type ModerationAdminHealth = {
  ok: boolean;
  statuses: ProxyStatus[];
};

async function fetchAdminProxyJson<T>(
  webBaseUrl: string,
  path: string,
  headers: Record<string, string>,
): Promise<{ data: T | null; proxyStatus: ProxyStatus }> {
  try {
    const response = await fetch(`${webBaseUrl}${path}`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        data: null,
        proxyStatus: {
          path,
          ok: false,
          status: response.status,
          durationMs: null,
          detail: text || `Request failed with ${response.status}.`,
        },
      };
    }

    return {
      data: (await response.json()) as T,
      proxyStatus: {
        path,
        ok: true,
        status: response.status,
        durationMs: null,
        detail: "ok",
      },
    };
  } catch (error) {
    return {
      data: null,
      proxyStatus: {
        path,
        ok: false,
        status: null,
        durationMs: null,
        detail: error instanceof Error ? error.message : "Unexpected proxy failure.",
      },
    };
  }
}

export async function getModerationData(
  adminUsername: string,
  webBaseUrl: string,
): Promise<ModerationData> {
  if (!adminApiToken) {
    return {
      adminUser: null,
      adminUsers: [],
      reports: [],
      blocks: [],
      isFallback: true,
      configurationError: "Missing ADMIN_API_TOKEN in apps/web environment.",
      proxyStatuses: [],
    };
  }

  const baseHeaders: Record<string, string> = {
    ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
  };
  const [adminUserResult, adminUsersResult, reportsResult, blocksResult] =
    await Promise.all([
      fetchAdminProxyJson<AdminUser>(webBaseUrl, "/api/admin/me", baseHeaders),
      fetchAdminProxyJson<AdminUser[]>(
        webBaseUrl,
        "/api/admin/admin-users",
        baseHeaders,
      ),
      fetchAdminProxyJson<ModerationReport[]>(
        webBaseUrl,
        "/api/admin/reports",
        baseHeaders,
      ),
      fetchAdminProxyJson<ModerationBlock[]>(
        webBaseUrl,
        "/api/admin/blocks",
        baseHeaders,
      ),
    ]);
  const proxyStatuses = [
    adminUserResult.proxyStatus,
    adminUsersResult.proxyStatus,
    reportsResult.proxyStatus,
    blocksResult.proxyStatus,
  ];

  if (
    adminUserResult.data &&
    adminUsersResult.data &&
    reportsResult.data &&
    blocksResult.data
  ) {
    return {
      adminUser: adminUserResult.data,
      adminUsers: adminUsersResult.data,
      reports: reportsResult.data,
      blocks: blocksResult.data,
      isFallback: false,
      configurationError: null,
      proxyStatuses,
    };
  }

  const failedProxyPaths = proxyStatuses
    .filter((proxyStatus) => !proxyStatus.ok)
    .map((proxyStatus) => proxyStatus.path)
    .join(", ");

  return {
    adminUser: null,
    adminUsers: [],
    reports: fallbackReports,
    blocks: fallbackBlocks,
    isFallback: true,
    configurationError: failedProxyPaths
      ? `Live moderation data is unavailable. Failed admin routes: ${failedProxyPaths}.`
      : "Live moderation data is unavailable. Confirm the admin proxy routes are healthy, apps/api/schema.sql has been applied, and the current Basic-auth username exists in public.admin_users.",
    proxyStatuses,
  };
}

export async function getModerationAdminHealth(
  adminUsername: string,
  webBaseUrl: string,
): Promise<ModerationAdminHealth> {
  const headers: Record<string, string> = {
    ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
  };

  try {
    const response = await fetch(`${webBaseUrl}/api/admin/health`, {
      cache: "no-store",
      headers,
    });
    const payload = (await response.json()) as ModerationAdminHealth;

    return {
      ok: response.ok && payload.ok,
      statuses: payload.statuses ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      statuses: [
        {
          path: "/api/admin/health",
          ok: false,
          status: null,
          durationMs: null,
          detail: error instanceof Error ? error.message : "Unexpected health check failure.",
        },
      ],
    };
  }
}
