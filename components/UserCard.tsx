"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardUser = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  checkedInToday: boolean;
  streak: number;
  penaltyLevel: 0 | 1 | 2 | 3;
  progressPct: number;
};

type UserCardProps = {
  user: DashboardUser;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function UserCard({ user }: UserCardProps) {
  const progress = clamp(user.progressPct ?? 0, 0, 100);

  const cardClass = cn(
    "block rounded-2xl border p-4 transition-all",
    user.checkedInToday
      ? "border-[#22c55e]/70 bg-[#22c55e]/10 shadow-[0_0_0_1px_rgba(34,197,94,0.08)]"
      : "border-white/10 bg-white/[0.02] opacity-80"
  );

  return (
    <Link href={`/${user.slug}`} className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-[26px] leading-none">{user.emoji}</div>
          <div>
            <div className="text-base sm:text-lg font-bold">{user.name}</div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span
                className={cn(
                  user.checkedInToday ? "text-[#22c55e]" : "text-white/50"
                )}
              >
                {user.checkedInToday ? "✅" : "⏳"}
              </span>
              <span className={cn(user.streak > 0 ? "text-[#fb923c]" : "text-white/50")}>
                🔥 {user.streak}
              </span>
            </div>
          </div>
        </div>

        {user.penaltyLevel > 0 && (
          <div className="shrink-0 text-sm font-semibold text-red-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>Lv.{user.penaltyLevel}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Прогрес</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              user.checkedInToday ? "bg-[#22c55e]" : "bg-[#f97316]"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
