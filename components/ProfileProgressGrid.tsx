import { cn } from "@/lib/utils";
import { getPushupsForDate } from "@/lib/db";

type ProfileProgressGridProps = {
  checkinByDate: Record<string, number>;
  todayStr: string; // YYYY-MM-DD
  days: number; // 30
};

function isoUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, delta: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function startOfMondayUTC(date: Date) {
  const day = date.getUTCDay(); // 0..6 (Sun..Sat)
  const mondayIndex = (day + 6) % 7; // Mon => 0
  return addDaysUTC(date, -mondayIndex);
}

function endOfSundayUTC(date: Date) {
  const day = date.getUTCDay(); // 0..6
  const mondayIndex = (day + 6) % 7;
  const daysToSunday = 6 - mondayIndex;
  return addDaysUTC(date, daysToSunday);
}

function formatDateUk(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "short",
  });
}

export function ProfileProgressGrid({
  checkinByDate,
  todayStr,
  days,
}: ProfileProgressGridProps) {
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const pastStart = addDaysUTC(today, -(days - 1));
  const pastStartStr = isoUTC(pastStart);

  const rangeStart = startOfMondayUTC(pastStart);
  const rangeEnd = endOfSundayUTC(today);

  const weeks: string[][] = [];
  let cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isoUTC(addDaysUTC(cursor, i)));
    }
    weeks.push(week);
    cursor = addDaysUTC(cursor, 7);
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

              const expected = getPushupsForDate(
                new Date(`${dateStr}T00:00:00.000Z`)
              );

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

