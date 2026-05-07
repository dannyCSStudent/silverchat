import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = ["/moderation", "/api/admin"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_WEB_USERNAME;
  const password = process.env.ADMIN_WEB_PASSWORD;

  if (!username || !password) {
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

  if (suppliedUsername !== username || suppliedPassword !== password) {
    return new NextResponse("Invalid admin credentials.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SilverChat Admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/moderation/:path*", "/api/admin/:path*"],
};
