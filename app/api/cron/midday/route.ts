import { NextRequest, NextResponse } from "next/server";
import { getKyivDate } from "@/lib/daily";
import { getUsers } from "@/lib/db";
import { kyivDayOfWeekSun0 } from "@/lib/sabbath";
import {
  formatKyivDate,
  getTodayCheckins,
  getTodayMissed,
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

function buildMissedList(items: TelegramUserLabel[], startIndex = 0): string {
  return items
    .map((x, i) => {
      const idx = startIndex + i;
      const msg = idx % 2 === 0 ? "давай, ще не пізно!" : "підгазуй! 💨";
      return `- ${x.emoji} ${x.display} — ${msg}`;
    })
    .join("\n");
}

export async function GET(request: NextRequest) {
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  const preview =
    request.nextUrl.searchParams.get("preview") === "true" ||
    request.nextUrl.searchParams.get("preview") === "1";

  try {
    const today = new Date();
    const dayOfWeek = kyivDayOfWeekSun0(today);
    if (dayOfWeek === 6) {
      if (preview) {
        return NextResponse.json({
          ok: true,
          message: "(денний крон пропущено — субота)",
          skipped: "saturday - sabbath day",
        });
      }
      return NextResponse.json({
        ok: true,
        skipped: "saturday - sabbath day",
      });
    }

    const formattedDate = formatKyivDate(today);

    const [todayCheckins, todayMissed] = await Promise.all([
      getTodayCheckins(),
      getTodayMissed(),
    ]);

    const todayStr = getKyivDate(today);
    const eligibleNotNewCount = (await getUsers()).filter((u) => {
      const createdStr = getKyivDate(u.created_at);
      return createdStr < todayStr;
    }).length;

    const allDone = eligibleNotNewCount > 0 && todayMissed.length === 0;

    let text = `☀️ <b>ДЕННА ПЕРЕВІРКА!</b>\n📅 ${formattedDate}\n\n`;

    if (allDone) {
      text += `🎉 УСІ ВЖЕ ВІДМІТИЛИСЬ! Crew рвуть! 💪`;
      if (preview) {
        return NextResponse.json({ ok: true, message: text });
      }
      await sendTelegramMessage(text);
      return NextResponse.json({ ok: true });
    }

    const doneBlock =
      `✅ <b>Вже відмітились (молодці!):</b>\n` +
      (todayCheckins.length > 0
        ? todayCheckins
            .map((x) => `- ${x.emoji} ${x.display} — ${x.pushups} 💪`)
            .join("\n")
        : "- (немає)");

    const missedBlock =
      todayMissed.length > 0
        ? `\n⏳ <b>Ще не відмітились:</b>\n${buildMissedList(todayMissed)}`
        : "";

    text += doneBlock + missedBlock;

    if (preview) {
      return NextResponse.json({ ok: true, message: text });
    }
    await sendTelegramMessage(text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка відправки";
    console.error("[Telegram Midday]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

