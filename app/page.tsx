"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DailyMotivator } from "@/components/DailyMotivator";
import { UserCard } from "@/components/UserCard";

type DashboardUser = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  created_at: unknown;
  checkedInToday: boolean;
  pushupsToday: number;
  streak: number;
  penaltyLevel: 0 | 1 | 2 | 3;
  missedDays: number;
  progressPct: number;
};

const CREW_START_COUNT = 25;
const DEFAULT_START_DATE = "2025-01-20";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTodayRuUkUkz(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "long", year: "numeric" });
}

function getPushupsTodayClientUTC(dateStr: string): number {
  // Optional override: set NEXT_PUBLIC_TODAY_NORM=26 to force today's norm (e.g. in .env.local)
  const override = process.env.NEXT_PUBLIC_TODAY_NORM;
  if (override != null && override !== "") {
    const n = Number(override);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const startDate = (process.env.NEXT_PUBLIC_START_DATE ?? DEFAULT_START_DATE).replace(/_/g, "-");
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const today = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(today.getTime())) {
    return CREW_START_COUNT;
  }
  const diffMs = today.getTime() - start.getTime();
  const diffDays = diffMs < 0 ? 0 : Math.floor(diffMs / 86400000);
  const value = CREW_START_COUNT + diffDays;
  return Number.isFinite(value) ? value : CREW_START_COUNT;
}

export default function HomePage() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const todayStr = useMemo(() => todayISO(), []);

  const pushupsTodayFallback = useMemo(
    () => getPushupsTodayClientUTC(todayStr),
    [todayStr]
  );

  const pushupsTodayRaw = users[0]?.pushupsToday ?? pushupsTodayFallback;
  const pushupsToday = Number.isFinite(pushupsTodayRaw) ? pushupsTodayRaw : CREW_START_COUNT;

  const fetchUsers = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch("/api/users", { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DashboardUser[];
      setUsers(data);
    } catch {
      // If refresh fails, keep the last good snapshot.
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const id = window.setInterval(fetchUsers, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#22c55e] to-transparent" />

      <header className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[34px] leading-[1.05] font-black tracking-tight">
              💪 PUSH-UPS CREW
            </div>
            <div className="mt-2 text-sm text-white/70">
              {formatTodayRuUkUkz(todayStr)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs text-white/60">Сьогодні норма</div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-[48px] font-black leading-[1] text-[#22c55e]">
                {pushupsToday}
              </div>
              <div className="pb-2 text-sm text-white/80 font-semibold">
                віджимань
              </div>
            </div>
          </div>

          <DailyMotivator />
        </div>
      </header>

      <main className="px-4 pb-10">
        <section className="mt-2">
          <div className="text-sm text-white/60 mb-3">
            Учасники
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white/70 text-sm">
              Завантаження...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white/70 text-sm">
              Немає учасників. Додайте їх у <Link href="/admin" className="underline">адмінці</Link>.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="px-4 pb-6 text-xs text-white/50">
        <Link href="/admin" className="hover:text-white transition-colors">
          Адмінка
        </Link>
      </footer>
    </div>
  );
}
