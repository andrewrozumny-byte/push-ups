import { NextRequest, NextResponse } from "next/server";
import { deleteCheckinForUserAndDate } from "@/lib/db";
import { getKyivDate } from "@/lib/daily";

export const dynamic = "force-dynamic";

function requireAdmin(request: NextRequest): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  const provided = (request.headers.get("x-admin-password") ?? "").trim();
  return provided === expected;
}

/** Admin-only: remove today's Kyiv check-in for a user (wrong-person missclick). */
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const userId = (body?.userId as string | undefined)?.trim();
    if (!userId) {
      return NextResponse.json({ error: "Потрібен userId" }, { status: 400 });
    }

    const todayStr = getKyivDate();
    const removed = await deleteCheckinForUserAndDate(userId, todayStr);
    if (!removed) {
      return NextResponse.json(
        { error: "Немає відмітки на сьогодні" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка";
    console.error("[revert-checkin-today]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
