import { NextRequest, NextResponse } from "next/server";
import { getUsers, createUser, deleteUser } from "@/lib/db";

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося завантажити учасників";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body?.name as string)?.trim();
    const slug = (body?.slug as string)?.trim() || slugFromName(name);
    const emoji = (body?.emoji as string)?.trim() || "💪";
    if (!name) {
      return NextResponse.json(
        { error: "Потрібне ім'я" },
        { status: 400 }
      );
    }
    if (!slug) {
      return NextResponse.json(
        { error: "Вкажіть slug або ім'я латиницею" },
        { status: 400 }
      );
    }
    const user = await createUser({ name, slug, emoji });
    return NextResponse.json(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося створити учасника";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Потрібен id" },
        { status: 400 }
      );
    }
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не вдалося видалити учасника";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
