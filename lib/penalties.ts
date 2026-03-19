/**
 * Логика штрафов за пропущенные дни.
 * Можно расширить: штраф за день без отжиманий, накопление долга и т.д.
 */

import { getCheckinsByUser } from "@/lib/db";

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

function isoDateUTC(d: Date): string {
  // YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

/**
 * Считает:
 * - currentStreak: серия дней с чек-ином, заканчивающаяся сегодня
 * - missedDays: пропуски подряд, заканчивающиеся сегодня
 * - level: уровень штрафа по missedDays
 */
export async function getPenaltyStatus(
  userId: string
): Promise<PenaltyStatus> {
  // Важно: за "сегодня" и streak/missed считаем по одной и той же логике даты (UTC).
  const today = new Date();
  const todayStr = isoDateUTC(today);

  const checkins = await getCheckinsByUser(userId);
  const checkinDates = new Set(checkins.map((c) => c.date));

  // streak: считаем назад, пока есть чек-ины
  let currentStreak = 0;
  if (checkinDates.has(todayStr)) {
    let cursor = new Date(todayStr + "T00:00:00.000Z");
    while (checkinDates.has(isoDateUTC(cursor))) {
      currentStreak++;
      cursor = addDaysUTC(cursor, -1);
    }
  }

  // missedDays: считаем назад, пока нет чек-инов
  let missedDays = 0;
  let cursor = new Date(todayStr + "T00:00:00.000Z");
  while (!checkinDates.has(isoDateUTC(cursor))) {
    missedDays++;
    cursor = addDaysUTC(cursor, -1);
    // страховка от бесконечного цикла при пустой истории
    if (missedDays > 3650) break;
  }

  const level = getPenaltyLevelFromMissedDays(missedDays);

  return { level, currentStreak, missedDays };
}
