import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "pushups_admin";

function adminPasswordOk(request: NextRequest): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  const provided = (request.headers.get("x-admin-password") ?? "").trim();
  return provided === expected;
}

function isPublicUsersListRead(request: NextRequest, pathname: string): boolean {
  if (!pathname.startsWith("/api/users")) return false;
  // List + enrich: GET /api/users is public (main page for everyone).
  // Mutations (POST/DELETE on collection, PATCH on /api/users/[id]) stay protected below.
  const m = request.method;
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicUsersListRead(request, pathname)) {
    return NextResponse.next();
  }

  // Protect admin APIs: require either an authenticated cookie (set by /api/admin/auth)
  // or a correct x-admin-password header.
  if (
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/admin/init")
  ) {
    const cookieOk = request.cookies.get(ADMIN_COOKIE)?.value === "1";
    const headerOk = adminPasswordOk(request);
    if (!cookieOk && !headerOk) {
      return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/users",
    "/api/users/:path*",
    "/api/admin/init",
    "/api/admin/init/:path*",
  ],
};

