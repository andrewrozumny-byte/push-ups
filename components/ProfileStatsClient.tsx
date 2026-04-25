"use client";

import { useCallback, useMemo, useState } from "react";
import type { PenaltyStatus } from "@/lib/penalties";
import { ProfileCheckinButton } from "@/components/ProfileCheckinButton";
import { diffCalendarDays } from "@/lib/kyivDate";

type ProfileStatsClientProps = {
  userId: string;
  emoji: string;
  name: string;
  initialCheckedIn: boolean;

  initialPenalty: PenaltyStatus;
  initialTotalDays: number;
  initialBestStreak: number;
  initialProgressPct: number | null;
  /** Kyiv Saturday: no check-in (Sabbath rest). */
  isSaturdayRest?: boolean;
};

function computeBestStreak(checkins: Array<{ date: string }>): number {
  const unique = Array.from(new Set(checkins.map((c) => c.date))).sort();
  let best = 0;
  let cur = 0;
  let prev: string | null = null;

  for (const d of unique) {
    if (!prev) {
      cur = 1;
    } else {
      const gap = diffCalendarDays(prev, d);
      cur = gap === 1 ? cur + 1 : 1;
    }
    best = Math.max(best, cur);
    prev = d;
  }

  return best;
}

async function fetchProgress(userId: string) {
  const res = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as unknown;
    let message = `HTTP ${res.status}`;
    if (data && typeof data === "object") {
      const maybeErr = (data as Record<string, unknown>).error;
      if (typeof maybeErr === "string" && maybeErr.trim()) {
        message = maybeErr;
      }
    }
    throw new Error(message);
  }
  return (await res.json()) as {
    checkins: Array<{ date: string; pushups_count: number }>;
    streak: number;
    penalty: PenaltyStatus;
    progressPct: number | null;
  };
}

function pluralDays(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
    return "дні";
  return "днів";
}

export function ProfileStatsClient({
  userId,
  emoji,
  name,
  initialCheckedIn,
  initialPenalty,
  initialTotalDays,
  initialBestStreak,
  initialProgressPct,
  isSaturdayRest = false,
}: ProfileStatsClientProps) {
  const [penalty, setPenalty] = useState<PenaltyStatus>(initialPenalty);
  const [totalDays, setTotalDays] = useState(initialTotalDays);
  const [bestStreak, setBestStreak] = useState(initialBestStreak);
  const [progressPct, setProgressPct] = useState<number | null>(initialProgressPct);
  const [loadingStats, setLoadingStats] = useState(false);

  const statusCardClassName = useMemo(
    () =>
      [
        "sm:col-span-2 rounded-2xl border p-4",
        penalty.level > 0
          ? "border-red-500/30 bg-red-500/10"
          : "border-white/10 bg-white/[0.02]",
      ].join(" "),
    [penalty.level]
  );

  const refetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchProgress(userId);

      const newTotalDays = data.checkins.length;
      setTotalDays(newTotalDays);
      setBestStreak(computeBestStreak(data.checkins));
      setProgressPct(data.progressPct ?? null);
      setPenalty(data.penalty);
    } catch (e) {
      console.error("[ProfileStatsClient] refetch failed", e);
    } finally {
      setLoadingStats(false);
    }
  }, [userId]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="text-[56px] leading-none">{emoji}</div>
            <div>
              <div className="text-xl sm:text-2xl font-bold">{name}</div>
              <div className="mt-2 text-sm text-white/70">
                🔥 {penalty.currentStreak} {pluralDays(penalty.currentStreak)} поспіль
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
          userId={userId}
          initialCheckedIn={initialCheckedIn}
          onModalClosed={refetchStats}
          isSaturdayRest={isSaturdayRest}
        />
        {loadingStats ? (
          <div className="mt-2 text-xs text-white/60">Оновлюємо статистику...</div>
        ) : null}
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
          <div className="mt-1 text-2xl font-black">
            {progressPct == null ? "Новий учасник 🌱" : `${progressPct}%`}
          </div>
        </div>

        <div className={statusCardClassName}>
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
  );
}

