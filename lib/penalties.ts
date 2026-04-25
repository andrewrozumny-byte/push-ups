/**
 * Логика штрафов за пропущенные дни.
 * Можно расширить: штраф за день без отжиманий, накопление долга и т.д.
 */

import { getCheckinsByUser } from "@/lib/db";
import {
  addCalendarDays,
  diffCalendarDays,
  getKyivDate,
  kyivDayOfWeekSun0ForYmd,
  pushupsStartYmd,
} from "@/lib/kyivDate";

export const PENALTY_PER_MISSED_DAY = 1;

export type PenaltyRule = {
  missedDays: number;
  penaltyPoints: number;
  description: string;
};

/** Правила штрафов (пример: за N пропусков — M штрафных очков) */
export const PENALTY_RULES: PenaltyRule[] = [
  { missedDays: 1, penaltyPoints: 1, description: "1 пропуск = 1 штраф" },
  { missedDays: 3, penaltyPoints: 5, description: "3 подряд = 5 штрафов" },
  { missedDays: 7, penaltyPoints: 15, description: "неделя без отжиманий = 15 штрафов" },
];

/**
 * Вычисляет уровень штрафа по пропускам подряд.
 * Правило (как в ТЗ):
 * - 3 дня подряд = уровень 1
 * - второй раз 3 дня = уровень 2
 * - третий раз 3 дня = уровень 3
 */
export function getPenaltyLevelFromMissedDays(missedDays: number): 0 | 1 | 2 | 3 {
  if (missedDays < 3) return 0;
  // missedDays: 3..5 => 1, 6..8 => 2, 9+ => 3
  return Math.min(3, Math.floor(missedDays / 3)) as 0 | 1 | 2 | 3;
}

export type PenaltyStatus = {
  level: 0 | 1 | 2 | 3;
  currentStreak: number;
  missedDays: number;
};

/**
 * Считает:
 * - currentStreak: серия дней с чек-ином, заканчивающаяся сегодня (Kyiv)
 * - missedDays: пропуски подряд, заканчивающиеся сегодня (Kyiv)
 * - level: уровень штрафа по missedDays
 */
export async function getPenaltyStatus(
  userId: string,
  createdAt: Date | string
): Promise<PenaltyStatus> {
  const todayStr = getKyivDate();

  const createdAtDate =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(createdAtDate.getTime())) {
    return { level: 0, currentStreak: 0, missedDays: 0 };
  }

  const createdYmd = getKyivDate(createdAtDate);
  const firstObligationYmd = addCalendarDays(createdYmd, 1);
  const startYmd = pushupsStartYmd();
  const startCalcYmd =
    firstObligationYmd >= startYmd ? firstObligationYmd : startYmd;

  const checkins = await getCheckinsByUser(userId);
  const checkinDates = new Set(checkins.map((c) => c.date));

  let currentStreak = 0;
  /** Saturday is rest — streak continues across it without requiring a check-in. */
  let streakAnchor = todayStr;
  if (kyivDayOfWeekSun0ForYmd(todayStr) === 6 && !checkinDates.has(todayStr)) {
    streakAnchor = addCalendarDays(todayStr, -1);
  }
  if (checkinDates.has(streakAnchor)) {
    let cursor = streakAnchor;
    while (cursor >= startCalcYmd) {
      if (checkinDates.has(cursor)) {
        currentStreak++;
        cursor = addCalendarDays(cursor, -1);
        continue;
      }
      if (kyivDayOfWeekSun0ForYmd(cursor) === 6) {
        cursor = addCalendarDays(cursor, -1);
        continue;
      }
      break;
    }
  }

  let missedDays = 0;
  let cursor = todayStr;
  while (cursor >= startCalcYmd) {
    if (kyivDayOfWeekSun0ForYmd(cursor) === 6) {
      cursor = addCalendarDays(cursor, -1);
      continue;
    }
    if (checkinDates.has(cursor)) break;
    missedDays++;
    cursor = addCalendarDays(cursor, -1);
  }

  const daysSinceRegistration = diffCalendarDays(createdYmd, todayStr) + 1;

  const computedLevel = getPenaltyLevelFromMissedDays(missedDays);
  const level: 0 | 1 | 2 | 3 = daysSinceRegistration >= 3 ? computedLevel : 0;

  return { level, currentStreak, missedDays };
}
