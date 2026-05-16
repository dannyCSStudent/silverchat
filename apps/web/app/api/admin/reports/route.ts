import { NextRequest } from "next/server";

import { proxyAdminRequest } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  return proxyAdminRequest({
    path: "/reports/",
    request,
  });
}
