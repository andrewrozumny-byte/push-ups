import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/db";
import { buildFridayWeeklySabbathMessage } from "@/lib/fridayWeeklySummary";

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
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

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
