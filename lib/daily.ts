import { diffCalendarDays, getKyivDate } from "./kyivDate";

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
