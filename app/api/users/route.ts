import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  deleteUser,
  diffCalendarDays,
  getCheckinsByUser,
  getKyivDate,
  getPushupsForDate,
  getUsers,
} from "@/lib/db";
import { getPenaltyStatus } from "@/lib/penalties";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getAdminPassword(request: NextRequest): string {
  return (request.headers.get("x-admin-password") ?? "").trim();
}

function requireAdmin(request: NextRequest): string | null {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return null;
  const provided = getAdminPassword(request);
  return provided === expected ? provided : null;
}

export async function GET() {
  try {
    const todayStr = getKyivDate();
    const pushupsToday = getPushupsForDate(new Date());

    const users = await getUsers();

    const enriched = await Promise.all(
      users.map(async (u) => {
        const checkins = await getCheckinsByUser(u.id);
        const checkedInToday = checkins.some((c) => c.date === todayStr);

        const createdStr = getKyivDate(u.created_at);
        const daysSinceRegistrationRaw =
          diffCalendarDays(createdStr, todayStr) + 1;
        const daysSinceRegistration = Number.isFinite(
          daysSinceRegistrationRaw
        )
          ? Math.max(1, daysSinceRegistrationRaw)
          : 1;

        const completedDays = checkins.filter(
          (c) => c.date >= createdStr && c.date <= todayStr
        ).length;

        const progressPct =
          daysSinceRegistration < 3
            ? null
            : Math.max(
                0,
                Math.min(
                  100,
                  Math.round((completedDays / daysSinceRegistration) * 100)
                )
              );

        const penalty = await getPenaltyStatus(u.id, u.created_at);
        // Consecutive Kyiv-calendar days without check-in ending today; 0 if відмітка сьогодні
        const missedDays = checkedInToday ? 0 : penalty.missedDays;

        return {
          ...u,
          checkedInToday,
          pushupsToday,
          streak: penalty.currentStreak,
          penaltyLevel: penalty.level,
          missedDays,
          progressPct,
        };
      })
    );

    return NextResponse.json(enriched, { headers: NO_STORE_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося завантажити учасників";
    if (message.toLowerCase().includes("upstream database")) {
      return NextResponse.json(
        {
          error: "Database warming up, please retry in a moment",
          retry: true,
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminOk = requireAdmin(request);
  if (!adminOk) {
    return NextResponse.json(
      { error: "Немає доступу" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const name = (body?.name as string | undefined)?.trim();
    const slug = (body?.slug as string | undefined)?.trim() || (name ? slugFromName(name) : "");
    const emoji = ((body?.emoji as string | undefined) ?? "💪").trim();
    const telegram_username = (body?.telegram_username as string | undefined)?.trim() || null;

    if (!name) return NextResponse.json({ error: "Потрібне ім'я" }, { status: 400 });
    if (!slug) return NextResponse.json({ error: "Вкажіть slug або ім'я латиницею" }, { status: 400 });

    const user = await createUser({ name, slug, emoji, telegram_username });
    return NextResponse.json(user, { headers: NO_STORE_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося створити учасника";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminOk = requireAdmin(request);
  if (!adminOk) {
    return NextResponse.json(
      { error: "Немає доступу" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    let id: string | null = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = (body?.id as string | undefined) ?? null;
    }

    if (!id) return NextResponse.json({ error: "Потрібен id" }, { status: 400 });

    await deleteUser(id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося видалити учасника";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
