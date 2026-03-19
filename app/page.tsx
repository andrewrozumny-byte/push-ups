import Link from "next/link";
import { DailyMotivator } from "@/components/DailyMotivator";
import { UserCard } from "@/components/UserCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUsersWithStats } from "@/lib/db";
import { getCheckinByUserAndDate } from "@/lib/db";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function HomePage() {
  const users = await getUsersWithStats();
  const today = todayISO();

  const checkedInMap: Record<string, boolean> = {};
  await Promise.all(
    users.map(async (u) => {
      const c = await getCheckinByUserAndDate(u.id, today);
      checkedInMap[u.id] = !!c;
    })
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Push-ups Tracker</h1>
        <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Админка
        </Link>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <DailyMotivator />

        <section>
          <h2 className="text-lg font-medium mb-3">Участники</h2>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Пока никого нет. Добавьте участников в{" "}
              <Link href="/admin" className="underline">
                админке
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {users.map((user) => (
                <li key={user.id}>
                  <UserCard
                    user={user}
                    checkedInToday={!!checkedInMap[user.id]}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
