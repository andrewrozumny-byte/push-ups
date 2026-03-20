/**
 * Kyiv-time Sabbath window: from Friday sunset through Saturday sunset (approximate).
 */

import { KYIV_TZ } from "./kyivDate";

const WEEKDAYS_LONG_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** 0 = Sunday … 6 = Saturday, in Europe/Kyiv for `d`. */
export function kyivDayOfWeekSun0(d: Date = new Date()): number {
  const long = new Intl.DateTimeFormat("en-US", {
    timeZone: KYIV_TZ,
    weekday: "long",
  }).format(d);
  return WEEKDAYS_LONG_EN.indexOf(long as (typeof WEEKDAYS_LONG_EN)[number]);
}

/** 1–12, Kyiv calendar month for `d`. */
export function kyivMonth1To12(d: Date = new Date()): number {
  const m = new Intl.DateTimeFormat("en-US", {
    timeZone: KYIV_TZ,
    month: "numeric",
  }).format(d);
  return parseInt(m, 10);
}

function kyivHourMinute(d: Date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KYIV_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10
  );
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );
  return { hour, minute };
}

function parseSunsetHm(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return { hour: h || 0, minute: m || 0 };
}

/** Approximate Kyiv sunset by month (HH:MM). */
export function getSabbathTimes(d: Date = new Date()): {
  start: string;
  end: string;
} {
  const month = kyivMonth1To12(d);
  const sunsetTimes: Record<number, string> = {
    1: "16:30",
    2: "17:30",
    3: "18:30",
    4: "20:00",
    5: "20:30",
    6: "21:00",
    7: "20:30",
    8: "19:30",
    9: "18:30",
    10: "17:30",
    11: "16:30",
    12: "16:00",
  };
  const t = sunsetTimes[month] ?? "18:30";
  return { start: t, end: t };
}

function minutesSinceMidnight(h: number, m: number): number {
  return h * 60 + m;
}

/** True during Shabbat: from Friday sunset through Saturday before sunset. */
export function isSabbath(d: Date = new Date()): boolean {
  const dow = kyivDayOfWeekSun0(d);
  const { hour: sh, minute: sm } = parseSunsetHm(getSabbathTimes(d).start);
  const sunsetM = minutesSinceMidnight(sh, sm);
  const { hour, minute } = kyivHourMinute(d);
  const nowM = minutesSinceMidnight(hour, minute);

  const afterSunsetFriday =
    dow === 5 && nowM >= sunsetM;
  const beforeSunsetSaturday = dow === 6 && nowM < sunsetM;

  return afterSunsetFriday || beforeSunsetSaturday;
}

/** Kyiv calendar is Friday (any time). */
export function isPreSabbath(d: Date = new Date()): boolean {
  return kyivDayOfWeekSun0(d) === 5;
}

/** Kyiv calendar is Saturday. */
export function isSaturday(d: Date = new Date()): boolean {
  return kyivDayOfWeekSun0(d) === 6;
}

/** Friday in Kyiv, and local time is at or after approximate sunset. */
export function isFridayPastSunset(d: Date = new Date()): boolean {
  if (kyivDayOfWeekSun0(d) !== 5) return false;
  const { hour: sh, minute: sm } = parseSunsetHm(getSabbathTimes(d).start);
  const sunsetM = minutesSinceMidnight(sh, sm);
  const { hour, minute } = kyivHourMinute(d);
  const nowM = minutesSinceMidnight(hour, minute);
  return nowM >= sunsetM;
}

export const SABBATH_VERSES_SATURDAY_MORNING = [
  "Пам'ятай день суботній, щоб святити його. — Вих. 20:8",
  "І благословив Бог сьомий день, і освятив його. — Бут. 2:3",
  "Суботи Мої бережіть. — Вих. 31:13",
] as const;

export function pickRandomSaturdayVerse(): string {
  const i = Math.floor(Math.random() * SABBATH_VERSES_SATURDAY_MORNING.length);
  return SABBATH_VERSES_SATURDAY_MORNING[i] ?? SABBATH_VERSES_SATURDAY_MORNING[0];
}

export function escapeTelegramHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build Saturday morning Telegram HTML (no buttons). */
export function buildSaturdaySabbathMorningMessage(d: Date = new Date()): string {
  const verse = escapeTelegramHtmlText(pickRandomSaturdayVerse());
  const sunsetTime = getSabbathTimes(d).end;
  return (
    `🕊 <b>ДОБРА СУБОТА, CREW!</b>\n\n` +
    `Сьогодні — субота, день відпочинку 🙏\n\n` +
    `Відпочивайте, набирайтесь сил!\n` +
    `Сьогоднішні віджимання можна зробити після заходу сонця.\n\n` +
    `🌅 Захід сонця сьогодні о <b>${sunsetTime}</b>\n\n` +
    `📖 <i>"${verse}"</i>\n\n` +
    `Хорошої суботи всім! ✨`
  );
}
