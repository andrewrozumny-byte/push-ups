import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function getAdminPassword(request: NextRequest): string {
  return (request.headers.get("x-admin-password") ?? "").trim();
}

function requireAdmin(request: NextRequest): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  return getAdminPassword(request) === expected;
}

/**
 * One-time (or repeat-safe): assign magic check-in tokens to users that don't have one.
 * Call: GET /api/admin/generate-tokens with header x-admin-password
 */
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  try {
    const result = await query(
      `UPDATE users
       SET checkin_token = encode(gen_random_bytes(32), 'hex')
       WHERE checkin_token IS NULL`
    );
    const updated = result.rowCount ?? 0;
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не вдалося згенерувати токени";
    console.error("[generate-tokens]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
