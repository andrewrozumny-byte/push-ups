import { NextRequest, NextResponse } from "next/server";
import { getDailyMeme } from "@/lib/memes";
import { getDailyMotivator } from "@/lib/motivators";

export async function GET(request: NextRequest) {
  void request;

  const motivator = getDailyMotivator();
  const meme = getDailyMeme();
  // Той самий getDayIndex() усередині — мем і цитата завжди з одного “дня”
  return NextResponse.json({ ...motivator, meme });
}
