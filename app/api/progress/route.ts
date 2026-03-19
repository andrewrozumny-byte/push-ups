import { NextRequest, NextResponse } from "next/server";
import { getCheckinsByUser, getUserById } from "@/lib/db";
import { getPenaltyStatus } from "@/lib/penalties";

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

    const todayStr = isoDateUTC(new Date());
    const createdStr = isoDateUTC(user.created_at);

    // Inclusive count: created day counts as "day 1", and today counts too.
    const createdUTC = new Date(`${createdStr}T00:00:00.000Z`);
    const todayUTC = new Date(`${todayStr}T00:00:00.000Z`);
    const daysSinceRegistrationRaw =
      Math.floor((todayUTC.getTime() - createdUTC.getTime()) / 86400000) + 1;
    const daysSinceRegistration = Number.isFinite(daysSinceRegistrationRaw)
      ? Math.max(1, daysSinceRegistrationRaw)
      : 1;

    // For users registered less than 3 days ago, don't show progress percent.
    const progressPct =
      daysSinceRegistration < 3
        ? null
        : Math.max(
            0,
            Math.min(
              100,
              Math.round((checkins.length / daysSinceRegistration) * 100)
            )
          );

    return NextResponse.json({
      checkins,
      streak: penalty.currentStreak,
      penalty,
      progressPct,
      daysSinceRegistration,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося завантажити прогрес";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
