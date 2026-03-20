import { NextRequest, NextResponse } from "next/server";
import {
  createCheckin,
  getCheckinByUserAndDate,
  getUserById,
  getUserBySlugAndToken,
} from "@/lib/db";
import { getRandomReaction } from "@/lib/checkinReactions";
import { getKyivDate } from "@/lib/kyivDate";
import { getRandomMotivator } from "@/lib/motivators";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userIdRaw = body?.userId as string | undefined;
    const slug = (body?.slug as string | undefined)?.trim();
    const token = (body?.token as string | undefined)?.trim();

    let userId: string | null = null;
    let userEmoji: string | undefined;
    let userName: string | undefined;

    if (slug && token) {
      const user = await getUserBySlugAndToken(slug, token);
      if (!user) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      userId = user.id;
      userEmoji = user.emoji;
      userName = user.name;
    } else if (userIdRaw) {
      userId = userIdRaw;
    } else {
      return NextResponse.json(
        { error: "Потрібен userId або slug з token" },
        { status: 400 }
      );
    }

    const date = getKyivDate();

    const existing = await getCheckinByUserAndDate(userId, date);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Вже відмічено на цю дату",
          checkin: {
            ...existing,
            created_at:
              existing.created_at instanceof Date
                ? existing.created_at.toISOString()
                : existing.created_at,
          },
        },
        { status: 409 }
      );
    }

    const checkin = await createCheckin(userId, date);
    const motivatorObj = getRandomMotivator();
    const motivator = motivatorObj.source
      ? `${motivatorObj.text} — ${motivatorObj.source}`
      : motivatorObj.text;

    let reactionName = userName;
    if (!reactionName) {
      const u = await getUserById(userId);
      reactionName = u?.name ?? "Учасник";
    }
    try {
      const reaction = getRandomReaction(reactionName);
      await sendTelegramMessage(reaction);
    } catch (err) {
      console.error("[checkin] Telegram reaction failed:", err);
    }

    return NextResponse.json({
      success: true,
      pushups: checkin.pushups_count,
      motivator,
      emoji: userEmoji,
      name: userName,
      checkin: {
        ...checkin,
        created_at: checkin.created_at.toISOString(),
      },
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
