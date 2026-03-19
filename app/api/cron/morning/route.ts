import { NextRequest, NextResponse } from "next/server";
import { getDayIndex } from "@/lib/daily";
import { getPushupsForDate, getUsersWithCheckinTokens } from "@/lib/db";
import { getDailyMeme } from "@/lib/memes";
import { getDailyMotivator } from "@/lib/motivators";
import {
  formatKyivDate,
  getYesterdayMissed,
  pluralizeDay,
  type TelegramUserLabel,
} from "@/lib/telegramStats";

async function requireCronAuth(request: NextRequest): Promise<boolean> {
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim();

  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const provided = auth.slice("Bearer ".length).trim();
    if (cronSecret && provided === cronSecret) return true;
  }

  const providedAdmin = (request.headers.get("x-admin-password") ?? "").trim();
  return !!adminPassword && providedAdmin === adminPassword;
}

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; url: string }>>;
};

async function sendTelegramMorningMemePhoto(photoUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: "🌅 Ранковий мем для мотивації 💪",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram sendPhoto failed: ${res.status} ${body}`);
  }
}

async function sendTelegramMessage(text: string, replyMarkup?: InlineKeyboard) {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set");
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (
    replyMarkup?.inline_keyboard &&
    replyMarkup.inline_keyboard.length > 0
  ) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}

function buildBulletList(items: TelegramUserLabel[]): string {
  return items.map((x) => `- ${x.emoji} ${x.display}`).join("\n");
}

export async function GET(request: NextRequest) {
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  try {
    const now = new Date();
    const formattedDate = formatKyivDate(now);
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

    const pushupsToday = getPushupsForDate(new Date());
    const remainingDays = Math.max(0, 100 - pushupsToday);
    const motivator = getDailyMotivator();
    const quoteHtml = motivator.quote
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const missedYesterday = await getYesterdayMissed();

    const users = await getUsersWithCheckinTokens();
    const inline_keyboard =
      baseUrl.length > 0
        ? users
            .filter((u) => u.checkin_token)
            .map((user) => {
              const label = `${user.emoji} ${user.name} — Відмітитись! 💪`;
              const text =
                label.length > 64 ? `${label.slice(0, 61)}…` : label;
              return [
                {
                  text,
                  url: `${baseUrl}/magic/${encodeURIComponent(user.slug)}?token=${encodeURIComponent(user.checkin_token!)}`,
                },
              ];
            })
        : [];

    const missedBlock =
      missedYesterday.length > 0
        ? `\n😬 <b>Вчора не відмітились:</b>\n${buildBulletList(missedYesterday)}`
        : `\n🏆 <b>Вчора всі відмітились!</b> Легенди!`;

    const text =
      `🌅 <b>ДОБРОГО РАНКУ, CREW!</b>\n` +
      `📅 ${formattedDate}\n\n` +
      `💪 Сьогодні норма: <b>${pushupsToday} віджимань</b>\n` +
      `🎯 До мети 100 залишилось: <b>${remainingDays} ${pluralizeDay(remainingDays)}</b>\n` +
      `\n🙏 <i>"${quoteHtml}"</i>\n` +
      `${missedBlock}\n\n` +
      `Погнали, братове! 🔥`;

    if (!baseUrl) {
      console.warn(
        "[Telegram Morning] NEXT_PUBLIC_APP_URL missing, skipping meme photo"
      );
    } else {
      void getDayIndex();
      const photoUrl = `${baseUrl}/memes/${getDailyMeme()}`;
      await sendTelegramMorningMemePhoto(photoUrl);
    }

    await sendTelegramMessage(text, { inline_keyboard });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Morning]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

