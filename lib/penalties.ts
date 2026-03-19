/**
 * Логика штрафов за пропущенные дни.
 * Можно расширить: штраф за день без отжиманий, накопление долга и т.д.
 */

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
 * Вычисляет количество пропущенных дней между двумя датами (исключая выходные по желанию).
 * dateFrom, dateTo — строки YYYY-MM-DD.
 */
export function getMissedDays(
  dateFrom: string,
  dateTo: string,
  options?: { excludeWeekends?: boolean }
): number {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (from > to) return 0;
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    if (options?.excludeWeekends) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    } else {
      count++;
    }
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Возвращает штрафные очки за пропуск N дней подряд.
 */
export function getPenaltyForMissedDays(missedDays: number): number {
  if (missedDays <= 0) return 0;
  let points = 0;
  for (const rule of PENALTY_RULES) {
    if (missedDays >= rule.missedDays) {
      points = Math.max(points, rule.penaltyPoints);
    }
  }
  return points > 0 ? points : missedDays * PENALTY_PER_MISSED_DAY;
}
