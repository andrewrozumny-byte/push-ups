import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";

/**
 * GET /api/init — инициализация БД (создание таблиц если не существуют).
 * Запустить один раз после деплоя или при первом запуске.
 */
export async function GET() {
  try {
    await initDb();
    return NextResponse.json({
      ok: true,
      message: "Database initialized (tables created if not exist)",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Init failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
