import { NextRequest, NextResponse } from "next/server";
import { getKyivDate } from "@/lib/daily";
import { getPushupsForYmd, getUsers, type User } from "@/lib/db";
import { addCalendarDays } from "@/lib/kyivDate";
import { checkAndSendPenaltyAlarm } from "@/lib/penaltyAlarm";
import { getPenaltyStatus } from "@/lib/penalties";
import { kyivDayOfWeekSun0 } from "@/lib/sabbath";
import {
  buildTodayMissedPenaltyLines,
  formatKyivDate,
  formatProgressBar,
  getTodayCheckins,
  getTodayMissed,
  getMonthProgress,
  getWeekProgress,
  type TelegramUserLabel,
} from "@/lib/telegramStats";

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
    const dayOfWeek = kyivDayOfWeekSun0(now);
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return NextResponse.json({
        ok: true,
        skipped: "friday/saturday",
      });
    }

    const formattedDate = formatKyivDate(now);

    const [todayCheckins, todayMissed, weekProgress, monthProgress, allUsers] =
      await Promise.all([
        getTodayCheckins(),
        getTodayMissed(),
        getWeekProgress(),
        getMonthProgress(),
        getUsers(),
      ]);

    const usersById = new Map(allUsers.map((u) => [u.id, u] as const));
    if (!preview) {
      for (const u of allUsers) {
        const penalty = await getPenaltyStatus(u.id, u.created_at);
        await checkAndSendPenaltyAlarm(u.name, penalty.missedDays, penalty.level);
      }
    }

    const todayStr = getKyivDate(now);
    const eligibleNotNewCount = allUsers.filter((u) => {
      const createdStr = getKyivDate(u.created_at);
      return createdStr < todayStr;
    }).length;

    const allDone =
      eligibleNotNewCount > 0 && todayMissed.length === 0;

    const tomorrowPushups = getPushupsForYmd(addCalendarDays(todayStr, 1));

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
          ? await buildTodayMissedPenaltyLines(todayMissed, usersById)
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

    if (preview) {
      return NextResponse.json({ ok: true, message: text });
    }
    await sendTelegramMessage(text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Evening]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

