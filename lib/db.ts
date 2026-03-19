import { timingSafeEqual } from "crypto";
import { Pool } from "pg";
import type { QueryResult, QueryResultRow } from "pg";
import { diffCalendarDays, getKyivDate, pushupsStartYmd } from "./kyivDate";

export {
  addCalendarDays,
  diffCalendarDays,
  getKyivDate,
  pushupsStartYmd,
} from "./kyivDate";

const DEFAULT_START_DATE = "2025-01-20";

/** Дата старта группы — норма отжиманий растёт с этого дня */
export const PUSHUPS_START_DATE = new Date(
  process.env.NEXT_PUBLIC_START_DATE ?? DEFAULT_START_DATE
);
export const PUSHUPS_START_COUNT = 25;

export type User = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  telegram_username: string | null;
  created_at: Date;
};

export type Checkin = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  pushups_count: number;
  created_at: Date;
};

export type UserWithStats = User & {
  total_checkins: number;
  streak_days: number;
  last_checkin: string | null;
};

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is missing. Set it in .env.local/.env.");
  }
  pool = new Pool({ connectionString });
  return pool;
}

/**
 * Parameterized query helper.
 * Use it for all DB reads/writes.
 * Retries on cold-start / transient upstream failures (e.g. Prisma Postgres free tier).
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const maxRetries = 3;
  const poolInstance = getPool();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await poolInstance.connect();
      try {
        const result = await client.query<T>(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn(`DB attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry: 300ms → 600ms → 900ms (300 * attempt)
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }

  throw new Error("DB: max retries exceeded");
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error("Invalid date value returned from DB");
}

/** Норма отжиманий для календарного дня YYYY-MM-DD (логіка Kyiv / дата старту з env). */
export function getPushupsForYmd(ymd: string): number {
  const diff = diffCalendarDays(pushupsStartYmd(), ymd);
  if (diff < 0) return PUSHUPS_START_COUNT;
  return PUSHUPS_START_COUNT + diff;
}

/** Норма отжиманий на дату: 25 + дні від дати старту за календарем Kyiv. */
export function getPushupsForDate(date: Date): number {
  return getPushupsForYmd(getKyivDate(date));
}

/** Инициализация таблиц (создание если не существуют) */
export async function initDb() {
  await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      emoji VARCHAR(32) NOT NULL DEFAULT '💪',
      slug VARCHAR(255) NOT NULL UNIQUE,
      telegram_username VARCHAR(64),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // For already-existing installations: add column if it wasn't created yet.
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64)
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS checkin_token VARCHAR(64)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      pushups_count INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    )
  `);

  await query(
    `CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date)`
  );
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON users(slug)`);
}

type UserRow = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  telegram_username: unknown;
  created_at: unknown;
  checkin_token?: unknown;
};

type CheckinRow = {
  id: string;
  user_id: string;
  date: string;
  pushups_count: number;
  created_at: unknown;
};

type ProgressRow = {
  user_id: string;
  user_name: string;
  date: string;
  pushups_count: number;
};

type UsersWithStatsRow = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  telegram_username: unknown;
  created_at: unknown;
  total_checkins: number;
  last_checkin: string | null;
  streak_days: number;
};

export async function getUsers(): Promise<User[]> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, telegram_username, created_at FROM users ORDER BY name`
  );
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
  }));
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, telegram_username, created_at FROM users WHERE id = $1`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
  };
}

export async function getUserBySlug(slug: string): Promise<User | null> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, telegram_username, created_at FROM users WHERE slug = $1`,
    [slug]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
  };
}

/**
 * Magic-link auth: slug + hex token. Uses SHA-256 compare of UTF-8 bytes (constant length for hex).
 */
export async function getUserBySlugAndToken(
  slug: string,
  token: string
): Promise<User | null> {
  const trimmedSlug = slug?.trim();
  const trimmedToken = token?.trim();
  if (!trimmedSlug || !trimmedToken) return null;

  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, telegram_username, created_at, checkin_token
     FROM users WHERE slug = $1`,
    [trimmedSlug]
  );
  const row = res.rows[0];
  if (!row) return null;

  const stored =
    row.checkin_token != null ? String(row.checkin_token).trim() : "";
  if (!stored || stored.length !== trimmedToken.length) return null;

  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(stored, "hex");
    b = Buffer.from(trimmedToken, "hex");
  } catch {
    return null;
  }
  if (a.length !== b.length || a.length !== 32 || !timingSafeEqual(a, b)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
  };
}

export type UserWithCheckinToken = User & { checkin_token: string | null };

/** For server/cron only — includes magic link token (never expose on public dashboard API). */
export async function getUsersWithCheckinTokens(): Promise<UserWithCheckinToken[]> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, telegram_username, created_at, checkin_token
     FROM users
     ORDER BY name`
  );
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
    checkin_token:
      row.checkin_token != null ? String(row.checkin_token) : null,
  }));
}

export async function createUser(data: {
  name: string;
  emoji?: string;
  slug: string;
  telegram_username?: string | null;
  checkin_token: string;
}): Promise<User> {
  const emoji = data.emoji ?? "💪";
  const telegram_username =
    (data.telegram_username ?? null)?.toString().trim().replace(/^@/, "") ??
    null;
  const res = await query<UserRow>(
    `INSERT INTO users (name, emoji, slug, telegram_username, checkin_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, emoji, slug, telegram_username, created_at`,
    [data.name, emoji, data.slug, telegram_username, data.checkin_token]
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error("USER_CREATE_FAILED");
  }
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
  };
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    emoji: string;
    slug: string;
    telegram_username?: string | null;
  }
): Promise<User> {
  const telegram_username =
    (data.telegram_username ?? null)?.toString().trim().replace(/^@/, "") ??
    null;

  const res = await query<UserRow>(
    `UPDATE users
     SET name = $1,
         emoji = $2,
         slug = $3,
         telegram_username = $4
     WHERE id = $5
     RETURNING id, name, emoji, slug, telegram_username, created_at`,
    [data.name, data.emoji, data.slug, telegram_username, id]
  );

  const row = res.rows[0];
  if (!row) throw new Error("USER_NOT_FOUND");

  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
  };
}

export async function deleteUser(id: string): Promise<void> {
  await query(`DELETE FROM users WHERE id = $1`, [id]);
}

export async function getCheckinsByUser(userId: string): Promise<Checkin[]> {
  const res = await query<CheckinRow>(
    `SELECT
      id,
      user_id,
      date::text AS date,
      pushups_count,
      created_at
     FROM checkins
     WHERE user_id = $1
     ORDER BY date DESC`,
    [userId]
  );

  return res.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    pushups_count: row.pushups_count,
    created_at: toDate(row.created_at),
  }));
}

export async function getCheckinByUserAndDate(
  userId: string,
  dateStr: string
): Promise<Checkin | null> {
  const res = await query<CheckinRow>(
    `SELECT
      id,
      user_id,
      date::text AS date,
      pushups_count,
      created_at
     FROM checkins
     WHERE user_id = $1 AND date = $2::date`,
    [userId, dateStr]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    pushups_count: row.pushups_count,
    created_at: toDate(row.created_at),
  };
}

export async function createCheckin(
  userId: string,
  dateStr: string
): Promise<Checkin> {
  const pushups_count = getPushupsForYmd(dateStr);

  const res = await query<CheckinRow>(
    `INSERT INTO checkins (user_id, date, pushups_count)
     VALUES ($1, $2::date, $3)
     ON CONFLICT (user_id, date) DO NOTHING
     RETURNING
       id,
       user_id,
       date::text AS date,
       pushups_count,
       created_at`,
    [userId, dateStr, pushups_count]
  );

  const row = res.rows[0];
  if (!row) {
    throw new Error("CHECKIN_EXISTS");
  }

  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    pushups_count: row.pushups_count,
    created_at: toDate(row.created_at),
  };
}

export async function getProgressAll(): Promise<
  ProgressRow[]
> {
  const res = await query<ProgressRow>(
    `SELECT
      c.user_id,
      u.name AS user_name,
      c.date::text AS date,
      c.pushups_count
     FROM checkins c
     JOIN users u ON u.id = c.user_id
     ORDER BY c.date DESC, u.name`
  );
  return res.rows;
}

export async function getUsersWithStats(): Promise<UserWithStats[]> {
  const res = await query<UsersWithStatsRow>(
    `WITH last_checkin AS (
      SELECT user_id, MAX(date)::text AS last_date
      FROM checkins
      GROUP BY user_id
    ),
    totals AS (
      SELECT user_id, COUNT(*)::int AS total_checkins
      FROM checkins
      GROUP BY user_id
    )
    SELECT
      u.id,
      u.name,
      u.emoji,
      u.slug,
      u.telegram_username,
      u.created_at,
      COALESCE(t.total_checkins, 0) AS total_checkins,
      lc.last_date AS last_checkin,
      0 AS streak_days
    FROM users u
    LEFT JOIN totals t ON t.user_id = u.id
    LEFT JOIN last_checkin lc ON lc.user_id = u.id
    ORDER BY u.name`
  );

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    telegram_username:
      row.telegram_username != null ? String(row.telegram_username) : null,
    created_at: toDate(row.created_at),
    total_checkins: row.total_checkins,
    streak_days: row.streak_days,
    last_checkin: row.last_checkin,
  }));
}
