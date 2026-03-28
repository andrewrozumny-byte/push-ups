import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/db";
import { buildFridayWeeklySabbathMessage } from "@/lib/fridayWeeklySummary";

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}

/** Friday ~sunset Kyiv: weekly recap + greeting before Shabbat. */
export async function GET(request: NextRequest) {
  const adminPassword = request.headers.get("x-admin-password");
  const authHeader = request.headers.get("authorization");

  const isValid =
    adminPassword === process.env.ADMIN_PASSWORD ||
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Cron triggered:", new Date().toISOString());

  const preview =
    request.nextUrl.searchParams.get("preview") === "true" ||
    request.nextUrl.searchParams.get("preview") === "1";

  try {
    const now = new Date();
    const users = await getUsers();
    const text = await buildFridayWeeklySabbathMessage(users, now);

    if (preview) {
      return NextResponse.json({ ok: true, message: text });
    }

    await sendTelegramMessage(text);
    return NextResponse.json({ ok: true, mode: "friday-sunset-weekly" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Friday sunset]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
