import { NextRequest, NextResponse } from "next/server";
import { getDayIndex } from "@/lib/daily";
import { getPushupsForDate, getUsersWithCheckinTokens } from "@/lib/db";
import { getDailyMeme } from "@/lib/memes";
import { getDailyMotivator } from "@/lib/motivators";
import { buildSaturdaySabbathMorningMessage, isSaturday } from "@/lib/sabbath";
import {
  formatKyivDate,
  getYesterdayMissed,
  pluralizeDay,
  type TelegramUserLabel,
} from "@/lib/telegramStats";

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
  const adminPassword = request.headers.get("x-admin-password");
  const authHeader = request.headers.get("authorization");

  console.log("ADMIN_PASSWORD exists:", !!process.env.ADMIN_PASSWORD);
  console.log("Password match:", adminPassword === process.env.ADMIN_PASSWORD);

  const isValid =
    adminPassword === process.env.ADMIN_PASSWORD ||
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preview =
    request.nextUrl.searchParams.get("preview") === "true" ||
    request.nextUrl.searchParams.get("preview") === "1";

  try {
    const now = new Date();

    if (isSaturday(now)) {
      const sabbathMessage = buildSaturdaySabbathMorningMessage(now);
      if (preview) {
        return NextResponse.json({ ok: true, message: sabbathMessage });
      }
      await sendTelegramMessage(sabbathMessage);
      return NextResponse.json({ ok: true, mode: "sabbath" });
    }

    const formattedDate = formatKyivDate(now);
    const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL ?? "";
    /** No trailing slash — URLs built as base + '/magic/' + slug + ... */
    const baseUrl = appUrlRaw.replace(/\/$/, "");

    const pushupsToday = getPushupsForDate(new Date());
    const remainingDays = Math.max(0, 100 - pushupsToday);
    const motivator = getDailyMotivator();
    const quoteHtml = motivator.quote
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const missedYesterday = await getYesterdayMissed();

    const users = await getUsersWithCheckinTokens();
    console.log(
      "Users with tokens:",
      users.map((u) => ({ name: u.name, hasToken: !!u.checkin_token }))
    );

    void getDayIndex();

    const usersWithTokens = users.filter((u) => u.checkin_token);
    const inline_keyboard: InlineKeyboard["inline_keyboard"] =
      baseUrl.length > 0
        ? usersWithTokens.map((user) => {
            const label =
              user.emoji + " " + user.name + " — Відмітитись! 💪";
            const btnText =
              label.length > 64 ? label.slice(0, 61) + "…" : label;
            const url =
              baseUrl +
              "/" +
              user.slug;
            return [{ text: btnText, url }];
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

    if (preview) {
      const memeUrl = baseUrl
        ? `${baseUrl}/memes/${getDailyMeme()}`
        : "(NEXT_PUBLIC_APP_URL не задано)";
      const previewMessage =
        `--- sendPhoto (мем) ---\n` +
        `photo: ${memeUrl}\n` +
        `caption: 🌅 Ранковий мем для мотивації 💪\n\n` +
        `--- sendMessage (текст) ---\n` +
        `${text}\n\n` +
        `--- reply_markup.inline_keyboard ---\n` +
        `${JSON.stringify(inline_keyboard, null, 2)}`;
      return NextResponse.json({ ok: true, message: previewMessage });
    }

    if (!baseUrl) {
      console.warn(
        "[Telegram Morning] NEXT_PUBLIC_APP_URL missing, skipping meme photo"
      );
    } else {
      const photoUrl = `${baseUrl}/memes/${getDailyMeme()}`;
      await sendTelegramMorningMemePhoto(photoUrl);
    }

    const replyMarkup: InlineKeyboard | undefined =
      inline_keyboard.length > 0 ? { inline_keyboard } : undefined;

    await sendTelegramMessage(text, replyMarkup);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Morning]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

