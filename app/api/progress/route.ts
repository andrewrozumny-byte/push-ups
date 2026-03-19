import { NextResponse } from "next/server";
import { getProgressAll, getUsersWithStats } from "@/lib/db";

export async function GET() {
  try {
    const [progress, usersWithStats] = await Promise.all([
      getProgressAll(),
      getUsersWithStats(),
    ]);
    return NextResponse.json({
      progress,
      users: usersWithStats,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося завантажити прогрес";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
