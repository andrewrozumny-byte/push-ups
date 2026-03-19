import { NextRequest, NextResponse } from "next/server";
import { getCheckinsByUser, getUserById } from "@/lib/db";
import { getPenaltyStatus } from "@/lib/penalties";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Потрібен userId" }, { status: 400 });
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
    }

    const [checkins, penalty] = await Promise.all([
      getCheckinsByUser(userId),
      getPenaltyStatus(userId, user.created_at),
    ]);

    return NextResponse.json({
      checkins,
      streak: penalty.currentStreak,
      penalty,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося завантажити прогрес";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
