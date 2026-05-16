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

  return NextResponse.json(
    {
      ok,
      statuses,
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
