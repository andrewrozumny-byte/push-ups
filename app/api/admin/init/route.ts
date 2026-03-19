import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initDb } from "@/lib/db";

const ADMIN_COOKIE = "pushups_admin";

export async function POST() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE)?.value;
  if (cookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await initDb();
    return NextResponse.json({ ok: true, message: "Tables created" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Init failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
