import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  deleteUser,
  getCheckinsByUser,
  PUSHUPS_START_COUNT,
  PUSHUPS_START_DATE,
  getUsers,
} from "@/lib/db";
import { getPenaltyStatus } from "@/lib/penalties";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
    const todayStr = todayISO();
    const startStr = PUSHUPS_START_DATE.toISOString().slice(0, 10);

    const todayUTC = new Date(`${todayStr}T00:00:00.000Z`);
    const startUTC = new Date(`${startStr}T00:00:00.000Z`);
    const diffMs = todayUTC.getTime() - startUTC.getTime();
    const diffDays = diffMs < 0 ? 0 : Math.floor(diffMs / 86400000);
    const elapsedDays = diffDays + 1;
    const pushupsToday = PUSHUPS_START_COUNT + diffDays;

    const users = await getUsers();

    const enriched = await Promise.all(
      users.map(async (u) => {
        const checkins = await getCheckinsByUser(u.id);
        const checkedInToday = checkins.some((c) => c.date === todayStr);
        const completedDays = checkins.filter(
          (c) => c.date >= startStr && c.date <= todayStr
        ).length;

        const progressPct =
          elapsedDays > 0
            ? Math.round((completedDays / elapsedDays) * 100)
            : 0;

        const penalty = await getPenaltyStatus(u.id, u.created_at);

        return {
          ...u,
          checkedInToday,
          pushupsToday,
          streak: penalty.currentStreak,
          penaltyLevel: penalty.level,
          missedDays: penalty.missedDays,
          progressPct,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося завантажити учасників";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminOk = requireAdmin(request);
  if (!adminOk) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = (body?.name as string | undefined)?.trim();
    const slug = (body?.slug as string | undefined)?.trim() || (name ? slugFromName(name) : "");
    const emoji = ((body?.emoji as string | undefined) ?? "💪").trim();

    if (!name) return NextResponse.json({ error: "Потрібне ім'я" }, { status: 400 });
    if (!slug) return NextResponse.json({ error: "Вкажіть slug або ім'я латиницею" }, { status: 400 });

    const user = await createUser({ name, slug, emoji });
    return NextResponse.json(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося створити учасника";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminOk = requireAdmin(request);
  if (!adminOk) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося видалити учасника";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
