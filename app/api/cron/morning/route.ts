import { NextRequest, NextResponse } from "next/server";
import { getPushupsForDate } from "@/lib/db";
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

function buildBulletList(items: TelegramUserLabel[]): string {
  return items.map((x) => `- ${x.display}`).join("\n");
}

export async function POST(request: NextRequest) {
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  try {
    const now = new Date();
    const formattedDate = formatKyivDate(now);

    const pushupsToday = getPushupsForDate(new Date());
    const remainingDays = Math.max(0, 100 - pushupsToday);

    const missedYesterday = await getYesterdayMissed();

    const missedBlock =
      missedYesterday.length > 0
        ? `\n😬 Вчора не відмітились:\n${buildBulletList(missedYesterday)}`
        : `\n🏆 Вчора всі відмітились! Легенди!`;

    const text =
      `🌅 <b>ДОБРОГО РАНКУ, CREW!</b>\n` +
      `📅 ${formattedDate}\n\n` +
      `💪 Сьогодні норма: <b>${pushupsToday} віджимань</b>\n` +
      `🎯 До мети 100 залишилось: <b>${remainingDays} ${pluralizeDay(remainingDays)}</b>\n` +
      `${missedBlock}\n\n` +
      `Погнали, братове! 🔥`;

    await sendTelegramMessage(text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Morning]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

