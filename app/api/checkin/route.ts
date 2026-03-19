import { NextRequest, NextResponse } from "next/server";
import { createCheckin, getCheckinByUserAndDate } from "@/lib/db";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId as string | undefined;
    const date = (body?.date as string) || todayISO();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const existing = await getCheckinByUserAndDate(userId, date);
    if (existing) {
      return NextResponse.json(
        { error: "Already checked in for this date", checkin: existing },
        { status: 409 }
      );
    }

    const checkin = await createCheckin(userId, date);
    return NextResponse.json(checkin);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkin failed";
    if (message === "CHECKIN_EXISTS") {
      return NextResponse.json(
        { error: "Already checked in for this date" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date") || todayISO();

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  const checkin = await getCheckinByUserAndDate(userId, date);
  return NextResponse.json({ checkedIn: !!checkin, checkin: checkin ?? null });
}
