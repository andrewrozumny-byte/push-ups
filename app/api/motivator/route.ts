import { NextRequest, NextResponse } from "next/server";
import { getRandomMotivator, getMotivatorOfDay } from "@/lib/motivators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "random"; // "random" | "daily"

  const motivator =
    mode === "daily" ? getMotivatorOfDay() : getRandomMotivator();
  return NextResponse.json(motivator);
}
