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
  progressPct: number | null;
};

type UserCardProps = {
  user: DashboardUser;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function UserCard({ user }: UserCardProps) {
  const progressPct = user.progressPct;
  const progress = progressPct == null ? 0 : clamp(progressPct, 0, 100);
  const done = user.checkedInToday;

  const outer = cn(
    "block rounded-2xl p-[1px] transition-all",
    "bg-gradient-to-r from-[#22c55e]/25 via-[#1e1e1e] to-[#f97316]/15",
    done
      ? "hover:shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_0_28px_rgba(34,197,94,0.14)]"
      : "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_28px_rgba(249,115,22,0.06)]"
  );

  return (
    <Link href={`/${user.slug}`} className={outer}>
      <div
        className={cn(
          "rounded-2xl border border-[#1e1e1e] bg-[#111111] p-3 min-h-[80px]",
          done
            ? "border-l-2 border-l-[#22c55e] shadow-[0_0_28px_rgba(34,197,94,0.35)]"
            : "border-l-2 border-l-transparent opacity-90"
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
                  <p className="text-xs text-gray-500">Прогрес</p>
                  <p className="text-xs text-green-400">Новий учасник 🌱</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-500">Прогрес</span>
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
          </div>
        </div>
      </div>
    </Link>
  );
}
