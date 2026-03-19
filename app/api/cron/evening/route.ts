import { NextRequest, NextResponse } from "next/server";
import { getPushupsForDate, getUsers } from "@/lib/db";
import {
  formatKyivDate,
  formatProgressBar,
  getConsecutiveMisses,
  getTodayCheckins,
  getTodayMissed,
  getMonthProgress,
  getWeekProgress,
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

function buildTagLine(user: TelegramUserLabel): string {
  return `${user.emoji} ${user.display}`;
}

async function buildMissedLines(missed: TelegramUserLabel[]) {
  const lines: string[] = [];
  for (const u of missed) {
    const misses = await getConsecutiveMisses(u.userId);
    const n = Math.max(1, misses);
    const ordinal =
      n === 1 ? "1-й день без відмітки" : `${n}-й день підряд`;
    const suffix =
      n >= 3 ? ` — ${ordinal} 🚨 ШТРАФ!` : ` — ${ordinal} ⚠️`;
    lines.push(`- ${u.emoji} ${u.display}${suffix}`);
  }
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  try {
    const now = new Date();
    const formattedDate = formatKyivDate(now);

    const [todayCheckins, todayMissed, weekProgress, monthProgress] =
      await Promise.all([
        getTodayCheckins(),
        getTodayMissed(),
        getWeekProgress(),
        getMonthProgress(),
      ]);

    const todayStr = now.toISOString().slice(0, 10);
    const eligibleNotNewCount = (await getUsers()).filter((u) => {
      const createdStr = u.created_at.toISOString().slice(0, 10);
      return createdStr < todayStr;
    }).length;

    const allDone = eligibleNotNewCount > 0 && todayMissed.length === 0;

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowPushups = getPushupsForDate(tomorrow);

    const progressBlock =
      `\n📊 <b>Загальний прогрес crew:</b>\n` +
      `Тиждень: ${formatProgressBar(weekProgress)}\n` +
      `Місяць: ${formatProgressBar(monthProgress)}`;

    const footer =
      `\n\nЗавтра: <b>${tomorrowPushups} віджимань</b> 💪\n` +
      `Бог дає сили на кожен день! 🙏`;

    let body: string;

    if (allDone) {
      body = `🏆 <b>ІДЕАЛЬНИЙ ДЕНЬ!</b> Усі відмітились!`;
    } else {
      const goodBlock =
        `✅ <b>Молодці сьогодні:</b>\n` +
        (todayCheckins.length > 0
          ? todayCheckins
              .map((x) => `- ${buildTagLine(x)} — ${x.pushups} 💪`)
              .join("\n")
          : "- (немає)");

      const missedLines =
        todayMissed.length > 0
          ? await buildMissedLines(todayMissed)
          : "- (немає)";

      const missedBlock = `❌ <b>Не відмітились сьогодні:</b>\n${missedLines}`;

      body = `${goodBlock}\n\n${missedBlock}`;
    }

    const text =
      `🌙 <b>ПІДСУМОК ДНЯ!</b>\n` +
      `📅 ${formattedDate}\n\n` +
      body +
      progressBlock +
      footer;

    await sendTelegramMessage(text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Evening]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

