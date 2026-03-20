import {
  addCalendarDays,
  diffCalendarDays,
  getKyivDate,
  pushupsStartYmd,
} from "./kyivDate";

/** Re-export: Kyiv calendar “today” for stats / check-ins (resets at Kyiv midnight). */
export { getKyivDate } from "./kyivDate";

/**
 * Shared calendar index for daily meme + motivator (Kyiv “today”).
 * Increments by 1 each Kyiv calendar day (e.g. 19 Mar vs 20 Mar → different index).
 * Anchor before app launch so index stays non-negative for real dates.
 */
export function getDayIndex(): number {
  const anchor = "2025-01-01";
  return diffCalendarDays(anchor, getKyivDate());
}

/**
 * 1-based week since group start (`NEXT_PUBLIC_START_DATE` / {@link pushupsStartYmd}).
 * Week 1 = days 0–6 from start (inclusive), Kyiv calendar.
 */
export function getWeekSinceStart(d: Date = new Date()): number {
  const startYmd = pushupsStartYmd();
  const todayYmd = getKyivDate(d);
  const daysSinceStart = diffCalendarDays(startYmd, todayYmd);
  if (daysSinceStart < 0) return 1;
  return Math.floor(daysSinceStart / 7) + 1;
}

/** Current “crew week” as 7-day block aligned to start date (Kyiv YYYY-MM-DD). */
export function getCrewWeekRangeForKyivDate(d: Date = new Date()): {
  weekNumber: number;
  rangeStart: string;
  rangeEnd: string;
} {
  const startYmd = pushupsStartYmd();
  const todayYmd = getKyivDate(d);
  const daysSinceStart = diffCalendarDays(startYmd, todayYmd);
  if (daysSinceStart < 0) {
    return {
      weekNumber: 1,
      rangeStart: startYmd,
      rangeEnd: addCalendarDays(startYmd, 6),
    };
  }
  const weekIndex0 = Math.floor(daysSinceStart / 7);
  const weekNumber = weekIndex0 + 1;
  const rangeStart = addCalendarDays(startYmd, weekIndex0 * 7);
  const rangeEnd = addCalendarDays(rangeStart, 6);
  return { weekNumber, rangeStart, rangeEnd };
}
