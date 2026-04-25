import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileProgressGrid } from "@/components/ProfileProgressGrid";
import { ProfileStatsClient } from "@/components/ProfileStatsClient";
import {
  getCheckinsByUser,
  getUserBySlug,
} from "@/lib/db";

import { getPenaltyStatus as getPenalty } from "@/lib/penalties";
import {
  countSaturdaysBetweenInclusive,
  diffCalendarDays,
  getKyivDate,
} from "@/lib/kyivDate";
import { isSaturday } from "@/lib/sabbath";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  // Here `userId` param is the slug used in URLs (e.g. /artem).
  const user = await getUserBySlug(userId);
  if (!user) notFound();

  const [checkins, penalty] = await Promise.all([
    getCheckinsByUser(user.id),
    getPenalty(user.id, user.created_at),
  ]);

  const todayStr = getKyivDate();
  const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
  const checkinByDate: Record<string, number> = {};
  for (const c of checkins) checkinByDate[c.date] = c.pushups_count;

  const bestStreak = (() => {
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
  })();

  const totalDays = checkins.length;

  const createdStr = getKyivDate(user.created_at);

  const daysSinceRegistrationRaw = diffCalendarDays(createdStr, todayStr) + 1;
  const daysSinceRegistration = Number.isFinite(daysSinceRegistrationRaw)
    ? Math.max(1, daysSinceRegistrationRaw)
    : 1;

  const saturdaysInWindow = countSaturdaysBetweenInclusive(
    createdStr,
    todayStr
  );
  const totalPossibleDays = Math.max(
    1,
    daysSinceRegistration - saturdaysInWindow
  );

  const completedDays = checkins.filter(
    (c) => c.date >= createdStr && c.date <= todayStr
  ).length;

  const progressPct =
    daysSinceRegistration < 3
      ? null
      : Math.max(
          0,
          Math.min(
            100,
            Math.round((completedDays / totalPossibleDays) * 100)
          )
        );

  const isSaturdayRest = isSaturday(new Date());

  return (
    <div className="min-h-screen bg-[var(--background)] text-white overflow-x-hidden">
      <div className="px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          ← Все учасники
        </Link>
      </div>

      <div className="px-4 pb-10 pt-4 space-y-4">
        <ProfileStatsClient
          userId={user.id}
          emoji={user.emoji}
          name={user.name}
          initialCheckedIn={!!todayCheckin}
          initialPenalty={penalty}
          initialTotalDays={totalDays}
          initialBestStreak={bestStreak}
          initialProgressPct={progressPct}
          isSaturdayRest={isSaturdayRest}
        />

        <section>
          <ProfileProgressGrid
            checkinByDate={checkinByDate}
            todayStr={todayStr}
            days={30}
          />
        </section>

      </div>
    </div>
  );
}

