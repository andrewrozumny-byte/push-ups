import { getCheckinsByUser, type User } from "@/lib/db";
import {
  addCalendarDays,
  diffCalendarDays,
  firstFridayOnOrAfter,
  getKyivDate,
  pushupsStartYmd,
} from "@/lib/kyivDate";
import { escapeTelegramHtmlText, getSabbathTimes } from "@/lib/sabbath";

export type WeekUserStat = {
  user: User;
  /** Distinct check-in days in the Friday–Friday window (shown as X/denom). */
  checkedDays: number;
  /** Max days this user could have checked in (7, or fewer if joined mid-week). */
  denom: number;
  /** Check-in on every eligible calendar day in the window. */
  perfectSoFar: boolean;
};

/**
 * Friday sunset week: last Kyiv Friday through the Thursday before this Friday.
 * Label range is lastFriday … thisFriday (today when cron runs on Friday).
 */
function getFridayWeekWindow(now: Date): {
  weekNumber: number;
  lastFridayYmd: string;
  thisFridayYmd: string;
  statsStartYmd: string;
  statsEndYmd: string;
} {
  const thisFridayYmd = getKyivDate(now);
  const lastFridayYmd = addCalendarDays(thisFridayYmd, -7);
  const statsStartYmd = lastFridayYmd;
  const statsEndYmd = addCalendarDays(lastFridayYmd, 6);

  const anchorFriday = firstFridayOnOrAfter(pushupsStartYmd());
  const diffFromAnchor = diffCalendarDays(anchorFriday, lastFridayYmd);
  const weekNumber =
    diffFromAnchor < 0 ? 1 : Math.floor(diffFromAnchor / 7) + 1;

  return {
    weekNumber,
    lastFridayYmd,
    thisFridayYmd,
    statsStartYmd,
    statsEndYmd,
  };
}

async function computeUserWeekStat(
  user: User,
  statsStartYmd: string,
  statsEndYmd: string
): Promise<WeekUserStat> {
  const checkins = await getCheckinsByUser(user.id);
  const dates = new Set(checkins.map((c) => c.date));
  const joinYmd = getKyivDate(user.created_at);

  const effectiveStart =
    statsStartYmd >= joinYmd ? statsStartYmd : joinYmd;

  let denom = 0;
  if (effectiveStart <= statsEndYmd) {
    denom = Math.min(
      7,
      diffCalendarDays(effectiveStart, statsEndYmd) + 1
    );
  }

  let checkedDays = 0;
  let perfectSoFar = denom > 0;
  for (let i = 0; i < denom; i++) {
    const ymd = addCalendarDays(effectiveStart, i);
    if (ymd > statsEndYmd) break;
    if (dates.has(ymd)) {
      checkedDays++;
    } else {
      perfectSoFar = false;
    }
  }

  return {
    user,
    checkedDays,
    denom,
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
  const {
    weekNumber,
    lastFridayYmd,
    thisFridayYmd,
    statsStartYmd,
    statsEndYmd,
  } = getFridayWeekWindow(now);
  const sunsetTime = getSabbathTimes(now).end;

  const stats: WeekUserStat[] = [];
  for (const u of allUsers) {
    stats.push(await computeUserWeekStat(u, statsStartYmd, statsEndYmd));
  }

  const perfect = stats.filter((s) => s.perfectSoFar && s.denom === 7);
  const maxChecked = Math.max(0, ...stats.map((s) => s.checkedDays));
  const leaders = stats.filter((s) => s.checkedDays === maxChecked && maxChecked > 0);
  leaders.sort((a, b) => a.user.name.localeCompare(b.user.name, "uk"));

  const fmtScore = (s: WeekUserStat) =>
    s.denom === 0 ? "0" : `${s.checkedDays}/${s.denom}`;

  let leaderLine = "—";
  if (leaders.length === 1) {
    leaderLine = `${leaders[0].user.emoji} <b>${escapeTelegramHtmlText(leaders[0].user.name)}</b> (${fmtScore(leaders[0])})`;
  } else if (leaders.length > 1) {
    leaderLine = leaders
      .map(
        (s) =>
          `${s.user.emoji} ${escapeTelegramHtmlText(s.user.name)} (${fmtScore(s)})`
      )
      .join(", ");
  }

  const starsBlock =
    perfect.length > 0
      ? perfect
          .map(
            (s) =>
              `- ${s.user.emoji} ${escapeTelegramHtmlText(s.user.name)} — 7/7`
          )
          .join("\n")
      : "- (немає)";

  const statsBlock = stats
    .map(
      (s) =>
        `- ${s.user.emoji} ${escapeTelegramHtmlText(s.user.name)} — ${fmtScore(s)} днів`
    )
    .join("\n");

  const verse = escapeTelegramHtmlText(
    "Той, що зберігає суботу від скверни... Я введу їх на святу гору Мою. — Іс. 56:6-7"
  );

  return (
    `🌇 <b>ТИЖНЕВИЙ ПІДСУМОК!</b>\n` +
    `📅 Тиждень <b>${weekNumber}</b> (${lastFridayYmd} … ${thisFridayYmd})\n\n` +
    `✅ <b>Відмінники тижня (без пропусків за всі 7 днів тижня):</b>\n` +
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
