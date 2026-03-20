import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type IdRow = { id: string };

/**
 * Assign magic check-in tokens (Node crypto) to users that don't have one.
 * Call: GET /api/admin/generate-tokens with header x-admin-password
 */
export async function GET(request: NextRequest) {
  const adminPassword = (request.headers.get("x-admin-password") ?? "").trim();
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();

  if (!expected || adminPassword !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await query<IdRow>(
      `SELECT id FROM users WHERE checkin_token IS NULL`
    );

    for (const user of users.rows) {
      const token = randomBytes(32).toString("hex");
      await query(`UPDATE users SET checkin_token = $1 WHERE id = $2`, [
        token,
        user.id,
      ]);
    }

    return NextResponse.json({ ok: true, updated: users.rows.length });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не вдалося згенерувати токени";
    console.error("[generate-tokens]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
