import { NextRequest, NextResponse } from "next/server";
import { createCheckin, getCheckinByUserAndDate } from "@/lib/db";
import { getRandomMotivator } from "@/lib/motivators";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId as string | undefined;
    const date = todayISO();

    if (!userId) {
      return NextResponse.json(
        { error: "Потрібен userId" },
        { status: 400 }
      );
    }

    const existing = await getCheckinByUserAndDate(userId, date);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Вже відмічено на цю дату", checkin: existing },
        { status: 409 }
      );
    }

    const checkin = await createCheckin(userId, date);
    const motivatorObj = getRandomMotivator();
    const motivator = motivatorObj.source
      ? `${motivatorObj.text} — ${motivatorObj.source}`
      : motivatorObj.text;

    return NextResponse.json({
      success: true,
      pushups: checkin.pushups_count,
      motivator,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відмітки";
    if (message === "CHECKIN_EXISTS") {
      return NextResponse.json(
        { success: false, error: "Вже відмічено на цю дату" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
