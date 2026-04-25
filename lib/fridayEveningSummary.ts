import { getUsers } from "@/lib/db";
import { getKyivDate } from "@/lib/kyivDate";
import { getSabbathTimes } from "@/lib/sabbath";
import {
  buildTodayMissedPenaltyLines,
  formatKyivDate,
  getTodayCheckins,
  getTodayMissed,
  type TelegramUserLabel,
} from "@/lib/telegramStats";

function buildTagLine(user: TelegramUserLabel): string {
  return `${user.emoji} ${user.display}`;
}

/**
 * Friday ~sunset Kyiv: same shape as daily evening summary (no weekly stats, no buttons).
 */
export async function buildFridayEveningSabbathMessage(
  now: Date = new Date()
): Promise<string> {
  const formattedDate = formatKyivDate(now);
  const sunsetTime = getSabbathTimes(now).end;

  const [todayCheckins, todayMissed, allUsers] = await Promise.all([
    getTodayCheckins(),
    getTodayMissed(),
    getUsers(),
  ]);

  const usersById = new Map(allUsers.map((u) => [u.id, u] as const));
  const todayStr = getKyivDate(now);
  const eligibleNotNewCount = allUsers.filter((u) => {
    const createdStr = getKyivDate(u.created_at);
    return createdStr < todayStr;
  }).length;

  const allDone = eligibleNotNewCount > 0 && todayMissed.length === 0;

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

  return (
    `🌇 <b>ВЕЧІРНІЙ ПІДСУМОК!</b>\n` +
    `📅 ${formattedDate}\n\n` +
    `${body}\n\n` +
    `Сонце заходить о <b>${sunsetTime}</b> — субота починається!\n` +
    `Завтра відпочиваємо 🕊`
  );
}
