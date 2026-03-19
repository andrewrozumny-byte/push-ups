import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "pushups_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(request: NextRequest) {
  const body = await request.json();
  const password = body?.password ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!expected) {
    return NextResponse.json(
      { error: "Пароль адміна не налаштовано" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const ok = !!expected && cookie === "1";
  return NextResponse.json({ ok });
}
