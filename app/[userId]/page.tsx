import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProgressGrid } from "@/components/ProgressGrid";
import { CheckinButton } from "@/components/CheckinButton";
import { getUserById, getCheckinsByUser, getCheckinByUserAndDate } from "@/lib/db";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type PageProps = { params: Promise<{ userId: string }> };

export default async function UserPage({ params }: PageProps) {
  const { userId } = await params;
  const user = await getUserById(userId);
  if (!user) notFound();

  const [checkins, todayCheckin] = await Promise.all([
    getCheckinsByUser(userId),
    getCheckinByUserAndDate(userId, todayISO()),
  ]);

  const checkinDates = checkins.map((c) => c.date);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4 flex items-center justify-between">
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          ← Назад
        </Link>
      </header>

      <main className="container max-w-xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <p className="text-muted-foreground text-sm">
            Всього днів з віджиманнями: {checkins.length}
          </p>
        </div>

        <CheckinButton
          userId={user.id}
          checkedIn={!!todayCheckin}
          userName={user.name}
        />

        <ProgressGrid checkinDates={checkinDates} daysToShow={28} />
      </main>
    </div>
  );
}
