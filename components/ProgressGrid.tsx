"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

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
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
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
    const today = new Date();
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
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
        Последние {daysToShow} дней
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
