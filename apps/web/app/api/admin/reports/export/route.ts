import { NextRequest } from "next/server";

import { proxyAdminRequest } from "../../_lib/proxy";

export async function POST(request: NextRequest) {
  return proxyAdminRequest({
    method: "POST",
    path: "/reports/export",
    request,
  });
}
