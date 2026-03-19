import { sql } from "@vercel/postgres";

/** Дата старта группы — норма отжиманий растёт с этого дня */
export const PUSHUPS_START_DATE = new Date("2025-01-20");
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

/** Подключение к БД (возвращает sql-клиент @vercel/postgres) */
export function getDb() {
  return sql;
}

/** Норма отжиманий на дату: 25 + количество дней с 2025-01-20 */
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
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      emoji VARCHAR(32) NOT NULL DEFAULT '💪',
      slug VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      pushups_count INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, date)
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date)
  `;
  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON users(slug)
  `;
}

export async function getUsers(): Promise<User[]> {
  const { rows } = await sql`
    SELECT id, name, emoji, slug, created_at FROM users ORDER BY name
  `;
  return rows as User[];
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await sql`
    SELECT id, name, emoji, slug, created_at FROM users WHERE id = ${id}
  `;
  return (rows[0] as User) ?? null;
}

export async function getUserBySlug(slug: string): Promise<User | null> {
  const { rows } = await sql`
    SELECT id, name, emoji, slug, created_at FROM users WHERE slug = ${slug}
  `;
  return (rows[0] as User) ?? null;
}

export async function createUser(data: {
  name: string;
  emoji?: string;
  slug: string;
}): Promise<User> {
  const emoji = data.emoji ?? "💪";
  const { rows } = await sql`
    INSERT INTO users (name, emoji, slug)
    VALUES (${data.name}, ${emoji}, ${data.slug})
    RETURNING id, name, emoji, slug, created_at
  `;
  return rows[0] as User;
}

export async function deleteUser(id: string): Promise<void> {
  await sql`DELETE FROM users WHERE id = ${id}`;
}

export async function getCheckinsByUser(userId: string): Promise<Checkin[]> {
  const { rows } = await sql`
    SELECT id, user_id, date::text AS date, pushups_count, created_at
    FROM checkins
    WHERE user_id = ${userId}
    ORDER BY date DESC
  `;
  return rows as Checkin[];
}

export async function getCheckinByUserAndDate(
  userId: string,
  dateStr: string
): Promise<Checkin | null> {
  const { rows } = await sql`
    SELECT id, user_id, date::text AS date, pushups_count, created_at
    FROM checkins
    WHERE user_id = ${userId} AND date = ${dateStr}::date
  `;
  return (rows[0] as Checkin) ?? null;
}

export async function createCheckin(
  userId: string,
  dateStr: string
): Promise<Checkin> {
  const date = new Date(dateStr + "T12:00:00");
  const pushups_count = getPushupsForDate(date);
  const { rows } = await sql`
    INSERT INTO checkins (user_id, date, pushups_count)
    VALUES (${userId}, ${dateStr}::date, ${pushups_count})
    ON CONFLICT (user_id, date) DO NOTHING
    RETURNING id, user_id, date::text AS date, pushups_count, created_at
  `;
  if (!rows[0]) {
    throw new Error("CHECKIN_EXISTS");
  }
  return rows[0] as Checkin;
}

export async function getProgressAll(): Promise<
  { user_id: string; user_name: string; date: string; pushups_count: number }[]
> {
  const { rows } = await sql`
    SELECT c.user_id, u.name AS user_name, c.date::text AS date, c.pushups_count
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.date DESC, u.name
  `;
  return rows as {
    user_id: string;
    user_name: string;
    date: string;
    pushups_count: number;
  }[];
}

export async function getUsersWithStats(): Promise<UserWithStats[]> {
  const { rows } = await sql`
    WITH last_checkin AS (
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
    ORDER BY u.name
  `;
  return rows as UserWithStats[];
}
