import { getCheckinsByUser, type User } from "@/lib/db";
import { getCrewWeekRangeForKyivDate } from "@/lib/daily";
import { addCalendarDays, diffCalendarDays, getKyivDate } from "@/lib/kyivDate";
import { escapeTelegramHtmlText, getSabbathTimes } from "@/lib/sabbath";

export type WeekUserStat = {
  user: User;
  /** Distinct check-in days from crew week start through today (shown as X/7). */
  checkedDays: number;
  /** Check-in on every calendar day from crew week start through today. */
  perfectSoFar: boolean;
};

async function computeUserWeekStat(
  user: User,
  weekStart: string,
  todayStr: string,
  daysElapsed: number
): Promise<WeekUserStat> {
  const checkins = await getCheckinsByUser(user.id);
  const dates = new Set(checkins.map((c) => c.date));

  let checkedDays = 0;
  let perfectSoFar = true;
  for (let i = 0; i < daysElapsed; i++) {
    const ymd = addCalendarDays(weekStart, i);
    if (ymd > todayStr) break;
    if (dates.has(ymd)) {
      checkedDays++;
    } else {
      perfectSoFar = false;
    }
  }

  return {
    user,
    checkedDays,
    perfectSoFar,
  };
}

/**
 * Weekly recap + transition to Shabbat (HTML for Telegram).
 * Call on Friday after sunset (Kyiv).
 */
export async function buildFridayWeeklySabbathMessage(
  allUsers: User[],
  now: Date = new Date()
): Promise<string> {
  const todayStr = getKyivDate(now);
  const { weekNumber, rangeStart: weekStart, rangeEnd: weekEnd } =
    getCrewWeekRangeForKyivDate(now);
  const sunsetTime = getSabbathTimes(now).end;

  const daysElapsed = Math.min(
    7,
    Math.max(1, diffCalendarDays(weekStart, todayStr) + 1)
  );

  const stats: WeekUserStat[] = [];
  for (const u of allUsers) {
    stats.push(await computeUserWeekStat(u, weekStart, todayStr, daysElapsed));
  }

  const perfect = stats.filter((s) => s.perfectSoFar);
  const maxChecked = Math.max(0, ...stats.map((s) => s.checkedDays));
  const leaders = stats.filter((s) => s.checkedDays === maxChecked && maxChecked > 0);
  leaders.sort((a, b) => a.user.name.localeCompare(b.user.name, "uk"));

  let leaderLine = "—";
  if (leaders.length === 1) {
    leaderLine = `${leaders[0].user.emoji} <b>${escapeTelegramHtmlText(leaders[0].user.name)}</b> (${leaders[0].checkedDays}/7)`;
  } else if (leaders.length > 1) {
    leaderLine = leaders
      .map(
        (s) =>
          `${s.user.emoji} ${escapeTelegramHtmlText(s.user.name)} (${s.checkedDays}/7)`
      )
      .join(", ");
  }

  const starsBlock =
    perfect.length > 0
      ? perfect
          .map(
            (s) =>
              `- ${s.user.emoji} ${escapeTelegramHtmlText(s.user.name)} — ${s.checkedDays}/7`
          )
          .join("\n")
      : "- (немає)";

  const statsBlock = stats
    .map(
      (s) =>
        `- ${s.user.emoji} ${escapeTelegramHtmlText(s.user.name)} — ${s.checkedDays}/7 днів`
    )
    .join("\n");

  const verse = escapeTelegramHtmlText(
    "Той, що зберігає суботу від скверни... Я введу їх на святу гору Мою. — Іс. 56:6-7"
  );

  return (
    `🌇 <b>ТИЖНЕВИЙ ПІДСУМОК!</b>\n` +
    `📅 Тиждень <b>${weekNumber}</b> (${weekStart} … ${weekEnd})\n\n` +
    `✅ <b>Відмінники тижня (без пропусків з початку тижня групи):</b>\n` +
    `${starsBlock}\n\n` +
    `📊 <b>Статистика тижня:</b>\n` +
    `${statsBlock}\n\n` +
    `🏆 <b>Лідер тижня:</b> ${leaderLine}\n\n` +
    `Сонце заходить о <b>${sunsetTime}</b> — субота починається!\n` +
    `Відпочиньте, ви заслужили 🙏\n\n` +
    `📖 <i>"${verse}"</i>\n\n` +
    `Хорошої суботи! 🕊✨`
  );
}
