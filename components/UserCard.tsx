"use client";

import Link from "next/link";
import { diffCalendarDays, getKyivDate } from "@/lib/kyivDate";
import { cn } from "@/lib/utils";

type DashboardUser = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  created_at?: string;
  checkedInToday: boolean;
  streak: number;
  penaltyLevel: 0 | 1 | 2 | 3;
  progressPct: number | null;
  missedDays: number;
};

type UserCardProps = {
  user: DashboardUser;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function daysSinceJoined(createdAt: string | undefined): number | null {
  if (createdAt == null || createdAt === "") return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const todayStr = getKyivDate();
  const createdStr = getKyivDate(d);
  const raw = diffCalendarDays(createdStr, todayStr) + 1;
  return Number.isFinite(raw) ? raw : null;
}

function getMissedStreak(missedDays: number) {
  return [
    {
      active: missedDays >= 1,
      color:
        missedDays >= 3
          ? "bg-red-500"
          : missedDays >= 2
            ? "bg-orange-500"
            : "bg-yellow-400",
    },
    {
      active: missedDays >= 2,
      color: missedDays >= 3 ? "bg-red-500" : "bg-orange-500",
    },
    { active: missedDays >= 3, color: "bg-red-500" },
  ] as const;
}

export function UserCard({ user }: UserCardProps) {
  const progressPct = user.progressPct;
  const progress = progressPct == null ? 0 : clamp(progressPct, 0, 100);
  const done = user.checkedInToday;
  const missedDays = user.missedDays ?? 0;

  const outer = cn(
    "block rounded-2xl p-[1px] transition-all",
    "bg-gradient-to-r from-[#22c55e]/25 via-[#1e1e1e] to-[#f97316]/15",
    done
      ? "hover:shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_0_28px_rgba(34,197,94,0.14)]"
      : "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_28px_rgba(249,115,22,0.06)]"
  );

  const innerBorder = done
    ? "border-green-500/50 shadow-lg shadow-green-500/20"
    : missedDays >= 3
      ? "border-red-500/50 shadow-md shadow-red-500/20 animate-pulse"
      : missedDays === 2
        ? "border-orange-500/50 shadow-md shadow-orange-500/20"
        : missedDays === 1
          ? "border-yellow-500/50 shadow-md shadow-yellow-500/20"
          : "border-gray-800";

  const dots = missedDays > 0 ? getMissedStreak(missedDays) : [];
  const joinedDays = daysSinceJoined(user.created_at);
  const newMemberLabel =
    joinedDays != null && joinedDays < 3
      ? `Новий учасник 🌱 (${joinedDays} дн.)`
      : "Новий учасник 🌱";

  const progressLabel = (
    <span
      className="cursor-help text-gray-500"
      title="Відсоток днів коли відмітився з моменту вступу в групу"
    >
      Прогрес виконання ℹ️
    </span>
  );

  return (
    <Link href={`/${user.slug}`} className={outer}>
      <div
        className={cn(
          "rounded-2xl border bg-[#111111] p-3 min-h-[80px] transition-shadow",
          innerBorder,
          done ? "" : "opacity-95"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[28px] leading-none"
            aria-hidden
          >
            {user.emoji}
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <p className="text-base font-bold text-white truncate">{user.name}</p>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  done
                    ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]"
                    : "border-[#1e1e1e] bg-[#1e1e1e]/40 text-white/80"
                )}
              >
                {done ? "Відмітився ✅" : "⏳ Не відмітився"}
              </span>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-2 py-0.5 text-xs font-extrabold text-[#f97316]">
                🔥 {user.streak}
              </span>
              {user.penaltyLevel > 0 && (
                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-0.5 text-xs font-extrabold text-[#ef4444]">
                  ⚠️ {user.penaltyLevel}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-1">
              {progressPct == null ? (
                <>
                  <p className="text-xs">{progressLabel}</p>
                  <p className="text-xs text-green-400">{newMemberLabel}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {progressLabel}
                    <span className="shrink-0 font-medium text-white/80">{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1e1e1e]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        done ? "bg-[#22c55e]" : "bg-[#22c55e]/70"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {dots.length > 0 ? (
              <div className="mt-2 flex gap-1.5" aria-label="Серія пропусків">
                {dots.map((dot, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full",
                      dot.active ? dot.color : "bg-gray-700"
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
