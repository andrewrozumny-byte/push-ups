import { NextRequest, NextResponse } from "next/server";
import { query, updateUser } from "@/lib/db";

function requireAdmin(request: NextRequest): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  const provided = (request.headers.get("x-admin-password") ?? "").trim();
  return provided === expected;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminOk = requireAdmin(request);
  if (!adminOk) {
    return NextResponse.json({ error: "Немає доступу" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Потрібен id" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = (body?.name as string | undefined)?.trim();
    const slug = (body?.slug as string | undefined)?.trim();
    const emoji = (body?.emoji as string | undefined)?.trim();
    const telegram_username = (body?.telegram_username as
      | string
      | undefined)?.trim();

    if (!name) {
      return NextResponse.json({ error: "Введіть імʼя" }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json(
        { error: "Slug обовʼязковий" },
        { status: 400 }
      );
    }
    if (!emoji) {
      return NextResponse.json({ error: "Emoji обовʼязковий" }, { status: 400 });
    }

    // Slug uniqueness check (excluding current user).
    const existing = await query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE slug = $1 AND id <> $2
       LIMIT 1`,
      [slug, id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Цей slug вже зайнятий" },
        { status: 409 }
      );
    }

    const updated = await updateUser(id, {
      name,
      slug,
      emoji,
      telegram_username: telegram_username || null,
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося змінити учасника";
    const status = message === "USER_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

