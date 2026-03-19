"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  addCalendarDays,
  endOfWeekSundayKyiv,
  formatKyivYmdLongUk,
  getPushupsNormForYmd,
  startOfWeekMondayKyiv,
} from "@/lib/kyivDate";

type ProfileProgressGridProps = {
  checkinByDate: Record<string, number>;
  todayStr: string; // YYYY-MM-DD (Kyiv)
  days: number; // 30
};

function CellTooltip({
  dateStr,
  pushupsLabel,
}: {
  dateStr: string;
  pushupsLabel: string;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[min(240px,calc(100vw-2rem))] -translate-x-1/2"
      role="tooltip"
    >
      <div className="rounded-lg bg-[#1a1a1a] px-3 py-2 text-center text-xs leading-snug text-white shadow-lg">
        <div className="font-medium text-white/95">
          {formatKyivYmdLongUk(dateStr)}
        </div>
        <div className="mt-1 text-white/90">{pushupsLabel}</div>
      </div>
      <div
        className="mx-auto h-0 w-0 border-x-[7px] border-x-transparent border-t-[8px] border-t-[#1a1a1a]"
        aria-hidden
      />
    </div>
  );
}

export function ProfileProgressGrid({
  checkinByDate,
  todayStr,
  days,
}: ProfileProgressGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const pastStartStr = addCalendarDays(todayStr, -(days - 1));

  const rangeStart = startOfWeekMondayKyiv(pastStartStr);
  const rangeEnd = endOfWeekSundayKyiv(todayStr);

  const weeks: string[][] = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addCalendarDays(cursor, i));
    }
    weeks.push(week);
    cursor = addCalendarDays(cursor, 7);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Прогрес</div>
        <div className="text-xs text-white/60">Наведи — дата і норма</div>
      </div>

      <div className="pb-1">
        <div className="grid grid-cols-7 gap-1">
          {weeks.flatMap((week, weekIndex) =>
            week.map((dateStr, dayIndex) => {
              const key = `${weekIndex}-${dayIndex}-${dateStr}`;
              if (dateStr < pastStartStr) {
                return (
                  <div
                    key={key}
                    className="h-3.5 w-3.5 rounded-[3px] bg-transparent opacity-0"
                  />
                );
              }

              const checked = Object.prototype.hasOwnProperty.call(
                checkinByDate,
                dateStr
              );
              const isFuture = dateStr > todayStr;
              const expected = getPushupsNormForYmd(dateStr);
              const doneCount = checkinByDate[dateStr];
              const pushupsLabel =
                doneCount != null
                  ? `${doneCount} віджимань (виконано)`
                  : `Норма: ${expected} віджимань`;

              const title = `${formatKyivYmdLongUk(dateStr)} — ${pushupsLabel}`;

              const cellClass = cn(
                "h-3.5 w-3.5 rounded-[3px] border transition-colors",
                isFuture
                  ? "border-[#38bdf8]/30 bg-[#38bdf8]/40"
                  : checked
                    ? "border-[#22c55e]/70 bg-[#22c55e]"
                    : "border-white/10 bg-white/10"
              );

              return (
                <div
                  key={key}
                  className="relative z-0 flex justify-center"
                  onMouseEnter={() => setHovered(dateStr)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className={cellClass}
                    title={title}
                    aria-label={title}
                  />
                  {hovered === dateStr ? (
                    <CellTooltip dateStr={dateStr} pushupsLabel={pushupsLabel} />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
