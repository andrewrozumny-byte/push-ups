import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "pushups_admin";

function adminPasswordOk(request: NextRequest): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  const provided = (request.headers.get("x-admin-password") ?? "").trim();
  return provided === expected;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/api/users/:path*", "/api/admin/init/:path*"],
};

