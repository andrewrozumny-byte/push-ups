"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  addCalendarDays,
  getKyivDate,
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

export function ProgressGrid({
  checkinDates,
  daysToShow = 28,
  compact = false,
}: ProgressGridProps) {
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
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={cell.label}
            className={cn(
              "rounded-md border text-center transition-colors",
              compact ? "p-1 text-[10px]" : "p-2 text-xs",
              cell.checked
                ? "border-primary bg-primary/20 text-primary"
                : "border-muted bg-muted/30 text-muted-foreground"
            )}
          >
            {compact ? (cell.checked ? "✓" : "·") : cell.label}
          </div>
        ))}
      </div>
    </div>
  );
}
