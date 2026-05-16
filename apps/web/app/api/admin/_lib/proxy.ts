import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";
const adminApiToken = process.env.ADMIN_API_TOKEN;

export type AdminProxyStatus = {
  detail: string;
  durationMs: number | null;
  ok: boolean;
  path: string;
  status: number | null;
};

type ProxyAdminRequestArgs = {
  method?: "GET" | "POST" | "PATCH";
  path: string;
  request: NextRequest;
};

export async function getAdminProxyStatus(args: {
  path: string;
  request: NextRequest;
}): Promise<AdminProxyStatus> {
  const startedAt = Date.now();

  if (!adminApiToken) {
    return {
      path: args.path,
      ok: false,
      status: 503,
      durationMs: Date.now() - startedAt,
      detail: "Missing ADMIN_API_TOKEN in apps/web environment.",
    };
  }

  try {
    const adminUsername = args.request.headers.get("x-admin-username");
    const response = await fetch(`${apiBaseUrl}${args.path}`, {
      method: "GET",
      headers: {
        "X-Admin-Token": adminApiToken,
        ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        path: args.path,
        ok: false,
        status: response.status,
        durationMs: Date.now() - startedAt,
        detail: text || `Request failed with ${response.status}.`,
      };
    }

    return {
      path: args.path,
      ok: true,
      status: response.status,
      durationMs: Date.now() - startedAt,
      detail: "ok",
    };
  } catch (error) {
    return {
      path: args.path,
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : "Unexpected proxy failure.",
    };
  }
}

export async function proxyAdminRequest({
  method = "GET",
  path,
  request,
}: ProxyAdminRequestArgs) {
  if (!adminApiToken) {
    return NextResponse.json(
      { detail: "Missing ADMIN_API_TOKEN in apps/web environment." },
      { status: 503 },
    );
  }

  const adminUsername = request.headers.get("x-admin-username");
  const body =
    method === "POST" || method === "PATCH" ? await request.text() : undefined;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      "X-Admin-Token": adminApiToken,
      ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
