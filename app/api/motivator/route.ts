import { NextRequest, NextResponse } from "next/server";
import { getMotivatorOfDay } from "@/lib/motivators";

export async function GET(request: NextRequest) {
  void request;

  const now = new Date();
  const dayIndexUTC = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000
  );

  const motivator = getMotivatorOfDay(dayIndexUTC);
  // Одинаков для всех в рамках одного дня
  return NextResponse.json(motivator);
}
