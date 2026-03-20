import { NextRequest, NextResponse } from "next/server";
import { getPushupsForDate, getUsersWithCheckinTokens } from "@/lib/db";

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

/** After Saturday sunset Kyiv: optional check-in + magic link buttons. */
export async function GET(request: NextRequest) {
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  const preview =
    request.nextUrl.searchParams.get("preview") === "true" ||
    request.nextUrl.searchParams.get("preview") === "1";

  try {
    const now = new Date();
    const pushups = getPushupsForDate(now);
    const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const baseUrl = appUrlRaw.replace(/\/$/, "");

    const users = await getUsersWithCheckinTokens();
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
              "/magic/" +
              user.slug +
              "?token=" +
              user.checkin_token;
            return [{ text: btnText, url }];
          })
        : [];

    const text =
      `🌆 <b>СУБОТА ЗАКІНЧИЛАСЬ!</b>\n\n` +
      `Сонце зайшло — нова тижня починається! 💪\n\n` +
      `Хто хоче — може відмітитись і відробити сьогоднішні <b>${pushups} віджимань</b>!\n\n` +
      `Погнали з новими силами! 🔥`;

    if (preview) {
      const previewMessage =
        `${text}\n\n--- reply_markup.inline_keyboard ---\n` +
        `${JSON.stringify(inline_keyboard, null, 2)}`;
      return NextResponse.json({ ok: true, message: previewMessage });
    }

    const replyMarkup: InlineKeyboard | undefined =
      inline_keyboard.length > 0 ? { inline_keyboard } : undefined;

    await sendTelegramMessage(text, replyMarkup);
    return NextResponse.json({ ok: true, mode: "saturday-sunset" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Saturday sunset]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
