import { getCheckinsByUser, getUsers, type User } from "@/lib/db";
import {
  addCalendarDays,
  diffCalendarDays,
  getKyivDate,
  kyivDayOfWeekSun0ForYmd,
  pushupsStartYmd,
  formatKyivYmdLongUk,
} from "@/lib/kyivDate";
import { escapeTelegramHtmlText } from "@/lib/sabbath";

export type SaturdayWeekUserStat = {
  user: User;
  checked: number;
  denom: number;
};

/**
 * Week for Saturday sunset recap: Sun–Fri before this Kyiv Saturday (6 days, Sat excluded).
 */
export function getSaturdayWeekSunToFri(now: Date = new Date()): {
  saturdayYmd: string;
  sundayYmd: string;
  fridayYmd: string;
  weekNumber: number;
} {
  const saturdayYmd = getKyivDate(now);
  const sundayYmd = addCalendarDays(saturdayYmd, -6);
  const fridayYmd = addCalendarDays(saturdayYmd, -1);

  const anchor = pushupsStartYmd();
  let firstSunday = anchor;
  for (let i = 0; i < 7; i++) {
    if (kyivDayOfWeekSun0ForYmd(firstSunday) === 0) break;
    firstSunday = addCalendarDays(firstSunday, 1);
  }

  const diff = diffCalendarDays(firstSunday, sundayYmd);
  const weekNumber = diff < 0 ? 1 : Math.floor(diff / 7) + 1;

  return { saturdayYmd, sundayYmd, fridayYmd, weekNumber };
}

async function computeUserWeekStat(
  user: User,
  sundayYmd: string,
  fridayYmd: string
): Promise<SaturdayWeekUserStat> {
  const joinYmd = getKyivDate(user.created_at);
  const startNorm = pushupsStartYmd();
  const eligibleStart = [sundayYmd, joinYmd, startNorm].reduce((a, b) =>
    a >= b ? a : b
  );
  const eligibleEnd = fridayYmd;

  if (eligibleStart > eligibleEnd) {
    return { user, checked: 0, denom: 0 };
  }

  const denom = diffCalendarDays(eligibleStart, eligibleEnd) + 1;
  const checkins = await getCheckinsByUser(user.id);
  const dates = new Set(checkins.map((c) => c.date));

  let checked = 0;
  let cur = eligibleStart;
  while (cur <= eligibleEnd) {
    if (dates.has(cur)) checked++;
    cur = addCalendarDays(cur, 1);
  }

  return { user, checked, denom };
}

function statLineEmoji(checked: number, denom: number): string {
  if (denom <= 0) return "—";
  if (checked === denom) return "✅ Ідеальний тиждень!";
  if (checked >= denom - 1) return "💪";
  if (checked >= 4) return "😬";
  return "😬";
}

function personalPraiseBlock(
  emoji: string,
  nameEsc: string,
  checked: number,
  denom: number
): string {
  if (denom <= 0) {
    return `🌱 ${emoji} ${nameEsc} — цей тиждень ще не зараховуємо повністю, але ти вже в грі! Наступного тижня — повна сила! 💪`;
  }
  if (checked === denom) {
    return (
      `🏆 ${emoji} ${nameEsc} — ідеальний тиждень! ${checked} з ${denom} днів! ` +
      `Залізна дисципліна, пишаємось! Так тримати наступного тижня! 💪🔥`
    );
  }
  if (checked === denom - 1 && denom >= 2) {
    return (
      `💪 ${emoji} ${nameEsc} — відмінний тиждень! ${checked} з ${denom} днів! ` +
      `Один пропуск не рахується — ти молодець! Наступного тижня — ідеал! ⚡`
    );
  }
  if (checked === 4 && denom >= 5) {
    return (
      `👊 ${emoji} ${nameEsc} — непоганий тиждень, ${checked} з ${denom}. ` +
      `Є куди рости! Наступного тижня — більше! 🎯`
    );
  }
  if (checked <= 3) {
    return (
      `😬 ${emoji} ${nameEsc} — ${checked} з ${denom}... Бабуся краще відтискується! ` +
      `Прокидаємось наступного тижня! 💪😂`
    );
  }
  return (
    `👊 ${emoji} ${nameEsc} — тиждень ${checked} з ${denom}. Є запас по силі — ` +
    `додамо консистентності наступного тижня! 🎯`
  );
}

function leaderFromStats(stats: SaturdayWeekUserStat[]): SaturdayWeekUserStat | null {
  const positive = stats.filter((s) => s.denom > 0);
  if (positive.length === 0) return null;
  const sorted = [...positive].sort((a, b) => {
    const ra = a.checked / a.denom;
    const rb = b.checked / b.denom;
    if (rb !== ra) return rb - ra;
    if (b.checked !== a.checked) return b.checked - a.checked;
    return a.user.name.localeCompare(b.user.name, "uk");
  });
  return sorted[0] ?? null;
}

/**
 * Saturday sunset: weekly Sun–Fri stats + leader + personal blocks (HTML, one message).
 */
export async function buildSaturdayWeeklySabbathMessage(
  now: Date = new Date()
): Promise<string> {
  const { sundayYmd, fridayYmd, weekNumber } = getSaturdayWeekSunToFri(now);
  const rangeLabel = `${formatKyivYmdLongUk(sundayYmd)} — ${formatKyivYmdLongUk(fridayYmd)}`;

  const allUsers = await getUsers();
  const stats: SaturdayWeekUserStat[] = [];
  for (const u of allUsers) {
    stats.push(await computeUserWeekStat(u, sundayYmd, fridayYmd));
  }

  const statsBlock = stats
    .map((s) => {
      const name = escapeTelegramHtmlText(s.user.name);
      if (s.denom <= 0) {
        return `- ${s.user.emoji} ${name} — —`;
      }
      return `- ${s.user.emoji} ${name} — ${s.checked}/${s.denom} ${statLineEmoji(s.checked, s.denom)}`;
    })
    .join("\n");

  const leader = leaderFromStats(stats);
  const leaderLine = leader
    ? `${leader.user.emoji} ${escapeTelegramHtmlText(leader.user.name)}`
    : "—";

  const personalBlocks = stats
    .filter((s) => s.denom > 0)
    .map((s) => {
      const nameEsc = escapeTelegramHtmlText(s.user.name);
      return personalPraiseBlock(s.user.emoji, nameEsc, s.checked, s.denom);
    });

  const personalSection =
    personalBlocks.length > 0
      ? `\n---\n${personalBlocks.join("\n---\n")}`
      : "";

  return (
    `🌆 <b>СУБОТА ЗАКІНЧИЛАСЬ! ПІДСУМОК ТИЖНЯ!</b>\n` +
    `📅 Тиждень <b>${weekNumber}</b> (${rangeLabel})\n\n` +
    `📊 <b>Статистика тижня:</b>\n` +
    `${statsBlock}\n\n` +
    `🏆 <b>Лідер тижня:</b> ${leaderLine}` +
    personalSection
  );
}
