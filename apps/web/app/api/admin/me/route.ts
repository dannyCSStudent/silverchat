import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";
const adminApiToken = process.env.ADMIN_API_TOKEN;

export async function GET(request: NextRequest) {
  if (!adminApiToken) {
    return NextResponse.json(
      { detail: "Missing ADMIN_API_TOKEN in apps/web environment." },
      { status: 503 },
    );
  }

  const adminUsername = request.headers.get("x-admin-username");
  const response = await fetch(`${apiBaseUrl}/admin-users/me`, {
    method: "GET",
    headers: {
      "X-Admin-Token": adminApiToken,
      ...(adminUsername ? { "X-Admin-Username": adminUsername } : {}),
    },
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
