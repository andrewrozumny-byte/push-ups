import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";

/**
 * GET /api/init — ініціалізація БД (створення таблиць якщо не існують).
 * Запустити один раз після деплою або при першому запуску.
 */
export async function GET() {
  try {
    await initDb();
    return NextResponse.json({
      ok: true,
      message: "Базу даних ініціалізовано (таблиці створено за потреби)",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Помилка ініціалізації";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
