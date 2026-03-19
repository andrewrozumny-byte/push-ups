import { Pool } from "pg";
import type { QueryResult, QueryResultRow } from "pg";

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
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error("Invalid date value returned from DB");
}

/** Норма отжиманий на дату: 25 + количество дней с даты старта */
export function getPushupsForDate(date: Date): number {
  const start = new Date(PUSHUPS_START_DATE);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diffTime = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return PUSHUPS_START_COUNT;
  return PUSHUPS_START_COUNT + diffDays;
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
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
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
  created_at: unknown;
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
  created_at: unknown;
  total_checkins: number;
  last_checkin: string | null;
  streak_days: number;
};

export async function getUsers(): Promise<User[]> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, created_at FROM users ORDER BY name`
  );
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    created_at: toDate(row.created_at),
  }));
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, created_at FROM users WHERE id = $1`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    created_at: toDate(row.created_at),
  };
}

export async function getUserBySlug(slug: string): Promise<User | null> {
  const res = await query<UserRow>(
    `SELECT id, name, emoji, slug, created_at FROM users WHERE slug = $1`,
    [slug]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    slug: row.slug,
    created_at: toDate(row.created_at),
  };
}

export async function createUser(data: {
  name: string;
  emoji?: string;
  slug: string;
}): Promise<User> {
  const emoji = data.emoji ?? "💪";
  const res = await query<UserRow>(
    `INSERT INTO users (name, emoji, slug)
     VALUES ($1, $2, $3)
     RETURNING id, name, emoji, slug, created_at`,
    [data.name, emoji, data.slug]
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
  const date = new Date(dateStr + "T12:00:00");
  const pushups_count = getPushupsForDate(date);

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
    created_at: toDate(row.created_at),
    total_checkins: row.total_checkins,
    streak_days: row.streak_days,
    last_checkin: row.last_checkin,
  }));
}
