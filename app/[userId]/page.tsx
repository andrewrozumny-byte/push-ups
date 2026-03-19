import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileCheckinButton } from "@/components/ProfileCheckinButton";
import { ProfileProgressGrid } from "@/components/ProfileProgressGrid";
import {
  getCheckinsByUser,
  getUserBySlug,
  PUSHUPS_START_DATE,
} from "@/lib/db";

import { getPenaltyStatus as getPenalty } from "@/lib/penalties";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseISOUTC(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  // Here `userId` param is the slug used in URLs (e.g. /artem).
  const user = await getUserBySlug(userId);
  if (!user) notFound();

  const [checkins, penalty] = await Promise.all([
    getCheckinsByUser(user.id),
    getPenalty(user.id, user.created_at),
  ]);

  const todayStr = todayISO();
  const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
  const checkinByDate: Record<string, number> = {};
  for (const c of checkins) checkinByDate[c.date] = c.pushups_count;

  const bestStreak = (() => {
    const unique = Array.from(new Set(checkins.map((c) => c.date))).sort();
    let best = 0;
    let cur = 0;
    let prev: string | null = null;
    for (const d of unique) {
      if (!prev) {
        cur = 1;
      } else {
        const prevDate = parseISOUTC(prev);
        const dDate = parseISOUTC(d);
        const diffDays = Math.round((dDate.getTime() - prevDate.getTime()) / 86400000);
        cur = diffDays === 1 ? cur + 1 : 1;
      }
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  })();

  const totalDays = checkins.length;

  const startStr = PUSHUPS_START_DATE.toISOString().slice(0, 10);
  const todayUTC = parseISOUTC(todayStr);
  const startUTC = parseISOUTC(startStr);
  const elapsedDays = Math.max(
    1,
    Math.floor((todayUTC.getTime() - startUTC.getTime()) / 86400000) + 1
  );

  const progressPct = Math.round((totalDays / elapsedDays) * 100);

  return (
    <div className="min-h-screen bg-[var(--background)] text-white overflow-x-hidden">
      <div className="px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          ← Все учасники
        </Link>
      </div>

      <div className="px-4 pb-10 pt-4 space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="text-[56px] leading-none">{user.emoji}</div>
              <div>
                <div className="text-xl sm:text-2xl font-bold">{user.name}</div>
                <div className="mt-2 text-sm text-white/70">
                  🔥 {penalty.currentStreak} днів поспіль
                </div>
              </div>
            </div>

            {penalty.level > 0 && (
              <div className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300 text-sm">
                ⚠️ Штраф: рівень {penalty.level}
              </div>
            )}
          </div>
        </section>

        <section>
          <ProfileCheckinButton
            userId={user.id}
            initialCheckedIn={!!todayCheckin}
          />
        </section>

        <section>
          <ProfileProgressGrid
            checkinByDate={checkinByDate}
            todayStr={todayStr}
            days={30}
          />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs text-white/60">Всього днів</div>
            <div className="mt-1 text-2xl font-black">{totalDays}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs text-white/60">Поточна серія</div>
            <div className="mt-1 text-2xl font-black">🔥 {penalty.currentStreak}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs text-white/60">Найкраща серія</div>
            <div className="mt-1 text-2xl font-black">{bestStreak}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs text-white/60">Загальний прогрес</div>
            <div className="mt-1 text-2xl font-black">{progressPct}%</div>
          </div>

          <div
            className={[
              "sm:col-span-2 rounded-2xl border p-4",
              penalty.level > 0
                ? "border-red-500/30 bg-red-500/10"
                : "border-white/10 bg-white/[0.02]",
            ].join(" ")}
          >
            <div
              className={[
                "text-xs",
                penalty.level > 0 ? "text-red-200" : "text-white/60",
              ].join(" ")}
            >
              Статус штрафа
            </div>
            <div
              className={[
                "mt-1 text-lg font-black",
                penalty.level > 0 ? "text-red-200" : "text-white",
              ].join(" ")}
            >
              {penalty.level > 0
                ? `⚠️ Рівень ${penalty.level} (пропуски: ${penalty.missedDays})`
                : "✅ Без штрафів"}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

