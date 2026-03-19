import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileProgressGrid } from "@/components/ProfileProgressGrid";
import { ProfileStatsClient } from "@/components/ProfileStatsClient";
import {
  getCheckinsByUser,
  getUserBySlug,
} from "@/lib/db";

import { getPenaltyStatus as getPenalty } from "@/lib/penalties";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseISOUTC(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

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

  const todayStr = todayISO();
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
        const prevDate = parseISOUTC(prev);
        const dDate = parseISOUTC(d);
        const diffDays = Math.round((dDate.getTime() - prevDate.getTime()) / 86400000);
        cur = diffDays === 1 ? cur + 1 : 1;
      }
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  })();

  const totalDays = checkins.length;

  const todayUTC = parseISOUTC(todayStr);
  const createdStr = user.created_at.toISOString().slice(0, 10);
  const createdUTC = parseISOUTC(createdStr);

  const daysSinceRegistrationRaw =
    Math.floor((todayUTC.getTime() - createdUTC.getTime()) / 86400000) + 1;
  const daysSinceRegistration = Number.isFinite(daysSinceRegistrationRaw)
    ? Math.max(1, daysSinceRegistrationRaw)
    : 1;

  const progressPct =
    daysSinceRegistration < 3
      ? null
      : Math.max(
          0,
          Math.min(
            100,
            Math.round((totalDays / daysSinceRegistration) * 100)
          )
        );

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

