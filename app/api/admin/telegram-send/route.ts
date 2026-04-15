import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const TELEGRAM_MAX_MESSAGE = 4096;

function requireAdmin(request: NextRequest): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  const provided = (request.headers.get("x-admin-password") ?? "").trim();
  return provided === expected;
}

/** Admin-only: send arbitrary plain text to the configured Telegram group chat. */
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";
  if (!token || !chatId) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не налаштовано" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Потрібен непорожній текст повідомлення" },
        { status: 400 }
      );
    }
    if (trimmed.length > TELEGRAM_MAX_MESSAGE) {
      return NextResponse.json(
        {
          error: `Текст завдовгий (макс. ${TELEGRAM_MAX_MESSAGE} символів для Telegram)`,
        },
        { status: 400 }
      );
    }

    await sendTelegramMessage(trimmed);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[admin telegram-send]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
