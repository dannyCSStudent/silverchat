import { NextRequest, NextResponse } from "next/server";

import { getAdminProxyStatus } from "../_lib/proxy";

const upstreamPaths = [
  "/admin-users/me",
  "/admin-users/",
  "/reports/",
  "/blocks/",
] as const;

export async function GET(request: NextRequest) {
  const statuses = await Promise.all(
    upstreamPaths.map((path) => getAdminProxyStatus({ path, request })),
  );
  const ok = statuses.every((status) => status.ok);
  const sampledAt = new Date().toISOString();

  return NextResponse.json(
    {
      ok,
      sampledAt,
      statuses,
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
