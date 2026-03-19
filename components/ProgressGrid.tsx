"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  addCalendarDays,
  formatKyivYmdLongUk,
  getKyivDate,
  getPushupsNormForYmd,
  KYIV_TZ,
  utcInstantForKyivYmd,
} from "@/lib/kyivDate";

type DayCell = {
  date: string;
  label: string;
  checked: boolean;
};

type ProgressGridProps = {
  checkinDates: string[]; // YYYY-MM-DD
  daysToShow?: number;
  compact?: boolean;
};

function formatDay(dateStr: string): string {
  const t = utcInstantForKyivYmd(dateStr);
  return t.toLocaleDateString("uk-UA", {
    timeZone: KYIV_TZ,
    day: "numeric",
    month: "short",
  });
}

function HoverTooltip({
  dateStr,
  pushups,
}: {
  dateStr: string;
  pushups: number;
}) {
  const line = `${pushups} віджимань`;
  return (
    <div
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[min(220px,calc(100vw-2rem))] -translate-x-1/2"
      role="tooltip"
    >
      <div className="rounded-lg bg-[#1a1a1a] px-3 py-2 text-center text-xs leading-snug text-white shadow-lg">
        <div className="font-medium text-white/95">
          {formatKyivYmdLongUk(dateStr)}
        </div>
        <div className="mt-1 text-white/90">{line}</div>
      </div>
      <div
        className="mx-auto h-0 w-0 border-x-[7px] border-x-transparent border-t-[8px] border-t-[#1a1a1a]"
        aria-hidden
      />
    </div>
  );
}

export function ProgressGrid({
  checkinDates,
  daysToShow = 28,
  compact = false,
}: ProgressGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const set = useMemo(
    () => new Set(checkinDates.map((d) => d.slice(0, 10))),
    [checkinDates]
  );

  const cells: DayCell[] = useMemo(() => {
    const result: DayCell[] = [];
    const todayYmd = getKyivDate();
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = addCalendarDays(todayYmd, -(daysToShow - 1 - i));
      result.push({
        date,
        label: formatDay(date),
        checked: set.has(date),
      });
    }
    return result;
  }, [daysToShow, set]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Останні {daysToShow} днів
      </p>
      <div
        className={cn(
          "grid gap-1",
          compact ? "grid-cols-7 sm:grid-cols-14" : "grid-cols-7 sm:grid-cols-14"
        )}
      >
        {cells.map((cell) => {
          const pushups = getPushupsNormForYmd(cell.date);
          const title = `${formatKyivYmdLongUk(cell.date)} — ${pushups} віджимань`;
          return (
            <div
              key={cell.date}
              className="relative z-0 flex justify-center"
              onMouseEnter={() => setHovered(cell.date)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                title={title}
                className={cn(
                  "w-full rounded-md border text-center transition-colors",
                  compact ? "p-1 text-[10px]" : "p-2 text-xs",
                  cell.checked
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-muted bg-muted/30 text-muted-foreground"
                )}
              >
                {compact ? (cell.checked ? "✓" : "·") : cell.label}
              </div>
              {hovered === cell.date ? (
                <HoverTooltip dateStr={cell.date} pushups={pushups} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
