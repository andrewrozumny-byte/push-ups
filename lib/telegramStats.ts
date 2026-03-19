import { getCheckinsByUser, getPushupsForDate, getUsers, type User } from "@/lib/db";

export type TelegramUserLabel = {
  userId: string;
  display: string; // @username or name
  name: string;
  emoji: string;
  telegram_username: string | null;
};

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function maxDayStr(a: string, b: string) {
  return a >= b ? a : b;
}

function daysInclusive(fromStr: string, toStr: string): number {
  const from = new Date(`${fromStr}T00:00:00.000Z`);
  const to = new Date(`${toStr}T00:00:00.000Z`);
  if (to.getTime() < from.getTime()) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

export function formatProgressBar(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const total = 10;
  const filled = Math.max(0, Math.min(total, Math.round(clamped / 10)));
  const empty = total - filled;
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${clamped}%`;
}

function toLabel(user: User): TelegramUserLabel {
  const u = user.telegram_username?.trim() || "";
  const display = u ? (u.startsWith("@") ? u : `@${u}`) : user.name;
  return {
    userId: user.id,
    display,
    name: user.name,
    emoji: user.emoji,
    telegram_username: user.telegram_username ?? null,
  };
}

function createdBeforeOrOnDay(user: User, dayStr: string) {
  const createdStr = isoDateUTC(user.created_at);
  return createdStr <= dayStr;
}

function createdBeforeDayStrict(user: User, dayStr: string) {
  const createdStr = isoDateUTC(user.created_at);
  return createdStr < dayStr;
}

export async function getTodayCheckins(): Promise<
  Array<TelegramUserLabel & { pushups: number }>
> {
  const today = new Date();
  const todayStr = isoDateUTC(today);

  const users = await getUsers();
  const results = await Promise.all(
    users.map(async (user) => {
      const checkins = await getCheckinsByUser(user.id);
      const todayCheckin = checkins.find((c) => c.date === todayStr);
      if (!todayCheckin) return null;
      return { ...toLabel(user), pushups: todayCheckin.pushups_count };
    })
  );

  return results.filter(Boolean) as Array<TelegramUserLabel & { pushups: number }>;
}

export async function getYesterdayMissed(): Promise<TelegramUserLabel[]> {
  const yesterdayStr = isoDateUTC(addDaysUTC(new Date(), -1));

  const users = await getUsers();
  const results = await Promise.all(
    users.map(async (user) => {
      if (!createdBeforeOrOnDay(user, yesterdayStr)) return null;
      const checkins = await getCheckinsByUser(user.id);
      const did = checkins.some((c) => c.date === yesterdayStr);
      if (did) return null;
      return toLabel(user);
    })
  );

  return results.filter(Boolean) as TelegramUserLabel[];
}

export async function getTodayMissed(): Promise<TelegramUserLabel[]> {
  const todayStr = isoDateUTC(new Date());

  const users = await getUsers();
  const results = await Promise.all(
    users.map(async (user) => {
      // Exclude users created today: they "joined today" so no missed day yet.
      if (!createdBeforeDayStrict(user, todayStr)) return null;
      const checkins = await getCheckinsByUser(user.id);
      const did = checkins.some((c) => c.date === todayStr);
      if (did) return null;
      return toLabel(user);
    })
  );

  return results.filter(Boolean) as TelegramUserLabel[];
}

export async function getConsecutiveMisses(userId: string): Promise<number> {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return 0;

  const checkins = await getCheckinsByUser(userId);
  const checkinDates = new Set(checkins.map((c) => c.date));

  const todayStr = isoDateUTC(new Date());
  const createdStr = isoDateUTC(user.created_at);

  let missed = 0;
  let cursor = todayStr;
  while (cursor >= createdStr) {
    if (checkinDates.has(cursor)) break;
    missed++;
    const d = new Date(`${cursor}T00:00:00.000Z`);
    cursor = isoDateUTC(addDaysUTC(d, -1));
  }
  return missed;
}

async function computeProgress(fromStr: string, toStr: string): Promise<number> {
  const users = await getUsers();

  let possible = 0;
  let actual = 0;

  // sequential to reduce DB pressure
  for (const user of users) {
    const createdStr = isoDateUTC(user.created_at);
    const eligibleStart = maxDayStr(createdStr, fromStr);
    const eligibleDays = daysInclusive(eligibleStart, toStr);
    possible += eligibleDays;
    if (eligibleDays <= 0) continue;

    const checkins = await getCheckinsByUser(user.id);
    actual += checkins.filter((c) => c.date >= fromStr && c.date <= toStr).length;
  }

  if (possible <= 0) return 0;
  return Math.round((actual / possible) * 100);
}

export async function getWeekProgress(): Promise<number> {
  const todayStr = isoDateUTC(new Date());
  const fromStr = isoDateUTC(addDaysUTC(new Date(`${todayStr}T00:00:00.000Z`), -6));
  return computeProgress(fromStr, todayStr);
}

export async function getMonthProgress(): Promise<number> {
  const todayStr = isoDateUTC(new Date());
  const fromStr = isoDateUTC(addDaysUTC(new Date(`${todayStr}T00:00:00.000Z`), -29));
  return computeProgress(fromStr, todayStr);
}

export function formatKyivDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";

  const weekdayCap = weekday ? weekday[0].toUpperCase() + weekday.slice(1) : "";
  return `${weekdayCap}, ${day} ${month} ${year}`;
}

export function pluralizeDay(count: number): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "дні";
  return "днів";
}

export function getTodayPushupsCount(): number {
  return getPushupsForDate(new Date());
}

