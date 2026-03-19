import { cn } from "@/lib/utils";
import { getPushupsForYmd } from "@/lib/db";
import {
  addCalendarDays,
  endOfWeekSundayKyiv,
  KYIV_TZ,
  startOfWeekMondayKyiv,
  utcInstantForKyivYmd,
} from "@/lib/kyivDate";

type ProfileProgressGridProps = {
  checkinByDate: Record<string, number>;
  todayStr: string; // YYYY-MM-DD (Kyiv)
  days: number; // 30
};

function formatDateUk(dateStr: string) {
  const t = utcInstantForKyivYmd(dateStr);
  return t.toLocaleDateString("uk-UA", {
    timeZone: KYIV_TZ,
    day: "2-digit",
    month: "short",
  });
}

export function ProfileProgressGrid({
  checkinByDate,
  todayStr,
  days,
}: ProfileProgressGridProps) {
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
      <div className="flex items-center justify-between mb-3">
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
                    className="w-3.5 h-3.5 rounded-[3px] bg-transparent opacity-0"
                  />
                );
              }

              const checked = Object.prototype.hasOwnProperty.call(
                checkinByDate,
                dateStr
              );
              const isFuture = dateStr > todayStr;

              const expected = getPushupsForYmd(dateStr);

              const title = `${formatDateUk(dateStr)} — ${expected} віджимань`;

              const cellClass = cn(
                "w-3.5 h-3.5 rounded-[3px] border transition-colors",
                isFuture
                  ? "bg-[#38bdf8]/40 border-[#38bdf8]/30"
                  : checked
                    ? "bg-[#22c55e] border-[#22c55e]/70"
                    : "bg-white/10 border-white/10"
              );

              return (
                <div
                  key={key}
                  className={cellClass}
                  title={title}
                  aria-label={title}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
