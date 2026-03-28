/**
 * Calendar logic in Europe/Kyiv so "today" flips at Kyiv midnight, not UTC.
 * Safe to import from client components (no Node/pg).
 */

/** IANA id (Kyiv; legacy alias Europe/Kiev also resolves in most runtimes). */
export const KYIV_TZ = "Europe/Kyiv";

const DEFAULT_PUSHUPS_START_YMD = "2025-01-20";

/** YYYY-MM-DD for the given instant in Kyiv. */
export function getKyivDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: KYIV_TZ });
}

/** Start date for pushup norm (NEXT_PUBLIC_START_DATE), normalized to YYYY-MM-DD. */
export function pushupsStartYmd(): string {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_START_DATE
      : undefined;
  return (raw ?? DEFAULT_PUSHUPS_START_YMD).replace(/_/g, "-").slice(0, 10);
}

/** Whole calendar days between two YYYY-MM-DD strings (civil dates). */
export function diffCalendarDays(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  if ([y1, m1, d1, y2, m2, d2].some((n) => !Number.isFinite(n))) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((t2 - t1) / 86400000);
}

/** Add signed calendar days to a YYYY-MM-DD (civil date arithmetic). */
export function addCalendarDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d));
  x.setUTCDate(x.getUTCDate() + delta);
  const yyyy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Find a UTC instant whose Kyiv calendar date equals `ymd`. */
export function utcInstantForKyivYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  let t = Date.UTC(y, m - 1, d, 6, 0, 0);
  for (let i = 0; i < 72; i++) {
    if (getKyivDate(new Date(t)) === ymd) return new Date(t);
    t += 3600000;
  }
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

const WEEKDAYS_LONG_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function kyivWeekdaySun0(inst: Date): number {
  const long = new Intl.DateTimeFormat("en-US", {
    timeZone: KYIV_TZ,
    weekday: "long",
  }).format(inst);
  return WEEKDAYS_LONG_EN.indexOf(long as (typeof WEEKDAYS_LONG_EN)[number]);
}

/** First Kyiv calendar Friday on or after `ymd` (YYYY-MM-DD). */
export function firstFridayOnOrAfter(ymd: string): string {
  const inst = utcInstantForKyivYmd(ymd);
  const dow = kyivWeekdaySun0(inst);
  const daysToFriday = (5 - dow + 7) % 7;
  return addCalendarDays(ymd, daysToFriday);
}

/** Monday (ISO) of the week that contains this Kyiv calendar day. */
export function startOfWeekMondayKyiv(ymd: string): string {
  const inst = utcInstantForKyivYmd(ymd);
  const sun0 = kyivWeekdaySun0(inst);
  const daysFromMonday = (sun0 + 6) % 7;
  return addCalendarDays(ymd, -daysFromMonday);
}

/** Sunday of the week that contains this Kyiv calendar day. */
export function endOfWeekSundayKyiv(ymd: string): string {
  return addCalendarDays(startOfWeekMondayKyiv(ymd), 6);
}

const CREW_START_COUNT = 25;

/** Client/server: today's norm from env start date (Kyiv "today"). */
export function getPushupsNormForYmd(
  ymd: string,
  startCount = CREW_START_COUNT,
  startYmd = pushupsStartYmd()
): number {
  const diff = diffCalendarDays(startYmd, ymd);
  if (diff < 0) return startCount;
  return startCount + diff;
}

/** Long Ukrainian label for a Kyiv calendar day. */
export function formatKyivYmdLongUk(ymd: string): string {
  const t = utcInstantForKyivYmd(ymd);
  return t.toLocaleDateString("uk-UA", {
    timeZone: KYIV_TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
