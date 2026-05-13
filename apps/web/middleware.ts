import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = ["/moderation", "/api/admin"];

type AdminCredential = {
  password: string;
  username: string;
};

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getConfiguredAdmins(): AdminCredential[] {
  const credentialsJson = process.env.ADMIN_WEB_CREDENTIALS_JSON?.trim();
  if (credentialsJson) {
    try {
      const parsed = JSON.parse(credentialsJson) as Record<string, unknown>;

      return Object.entries(parsed)
        .filter(([, password]) => typeof password === "string" && password.length > 0)
        .map(([username, password]) => ({
          username,
          password: String(password),
        }));
    } catch {
      return [];
    }
  }

  const username = process.env.ADMIN_WEB_USERNAME;
  const password = process.env.ADMIN_WEB_PASSWORD;
  if (!username || !password) {
    return [];
  }

  return [{ username, password }];
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const admins = getConfiguredAdmins();

  if (admins.length === 0) {
    return new NextResponse("Admin web credentials are not configured.", {
      status: 503,
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SilverChat Admin"' },
    });
  }

  const encodedCredentials = authorization.slice("Basic ".length);
  const decodedCredentials = atob(encodedCredentials);
  const separatorIndex = decodedCredentials.indexOf(":");
  const suppliedUsername =
    separatorIndex >= 0 ? decodedCredentials.slice(0, separatorIndex) : decodedCredentials;
  const suppliedPassword =
    separatorIndex >= 0 ? decodedCredentials.slice(separatorIndex + 1) : "";

  const matchingAdmin = admins.find(
    (admin) =>
      suppliedUsername === admin.username && suppliedPassword === admin.password,
  );

  if (!matchingAdmin) {
    return new NextResponse("Invalid admin credentials.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SilverChat Admin"' },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-username", matchingAdmin.username);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/moderation/:path*", "/api/admin/:path*"],
};
