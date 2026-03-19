"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type AdminUser = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  checkedInToday: boolean;
  pushupsToday: number;
  streak: number;
  penaltyLevel: 0 | 1 | 2 | 3;
  missedDays: number;
  progressPct: number;
};

const EMOJIS = ["💪", "🔥", "⚡", "🎯", "🦾", "👊", "🏋️‍♂️", "🚀"] as const;

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const ADMIN_PASSWORD_KEY = "pushups_admin_password";

function getSessionPassword(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  } catch {
    return null;
  }
}

function setSessionPassword(password: string) {
  try {
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
  } catch {
    // ignore
  }
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string>(() => getSessionPassword() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState<(typeof EMOJIS)[number]>("💪");
  const [newSlug, setNewSlug] = useState("");

  const storedPassword = useMemo(() => adminPassword, [adminPassword]);

  useEffect(() => {
    let isMounted = true;

    const tryAuth = async () => {
      const pwd = storedPassword ?? "";
      if (!pwd) return;

      // Validate via server endpoint (it will also set cookie).
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });

      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean };

      if (isMounted && data.ok === true) {
        setAdminAuthed(true);
      }
    };

    tryAuth();

    return () => {
      isMounted = false;
    };
  }, [storedPassword]);

  const refreshUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: {
          "x-admin-password": storedPassword ?? "",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AdminUser[];
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    if (!adminAuthed) return;
    refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuthed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean };

      if (!res.ok || data.ok !== true) {
        setError("Неправильний пароль");
        return;
      }

      setSessionPassword(password);
      setAdminPassword(password);
      setAdminAuthed(true);
    } finally {
      setLoading(false);
    }
  };

  const adminHeader = useMemo(() => {
    return { "x-admin-password": storedPassword ?? "" };
  }, [storedPassword]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    if (!getAppUrl()) {
      setError("Не задано NEXT_PUBLIC_APP_URL (потрібно для генерації посилань профілю).");
      return;
    }

    const slug = (newSlug || slugify(name)).trim();
    if (!slug) {
      setError("Slug обовʼязковий");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeader },
        body: JSON.stringify({ name, slug, emoji: newEmoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setUsers((prev) => [...prev, data as AdminUser]);

      const addedSlug = (data as AdminUser).slug;
      const base = getAppUrl();
      setProfileLink(`Посилання для ${name}: ${base}/${addedSlug}`);

      setNewName("");
      setNewSlug("");
      setNewEmoji("💪");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setLoading(false);
    }
  };

  const [profileLink, setProfileLink] = useState<string>("");

  const copyProfileLink = async () => {
    const link = profileLink.split(" ").pop() ?? "";
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      // small feedback without extra UI
      setProfileLink((prev) => prev.replace(":", " (скопійовано):"));
    } catch {
      alert("Не вдалося скопіювати");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Видалити учасника? Усі відмітки теж будуть видалені.")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
        headers: adminHeader,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setLoading(false);
    }
  };

  // Weekly/best/penalty stats computed on client by fetching progress per user
  const [statsLoading, setStatsLoading] = useState(false);
  const [totalCheckinsResolved, setTotalCheckinsResolved] = useState<number>(0);
  const [bestWeek, setBestWeek] = useState<AdminUser | null>(null);
  const [whoMissedToday, setWhoMissedToday] = useState<AdminUser[]>([]);

  const computeStats = async () => {
    setStatsLoading(true);
    setError("");
    try {
      type ProgressCheckin = { date: string; pushups_count: number };

      const today = new Date().toISOString().slice(0, 10);
      const todayUTC = new Date(`${today}T00:00:00.000Z`);
      const start = new Date(todayUTC);
      start.setUTCDate(start.getUTCDate() - 6);
      const startStr = start.toISOString().slice(0, 10);

      const progressPromises = users.map(async (u) => {
        const res = await fetch(`/api/progress?userId=${u.id}`);
        if (!res.ok) return { userId: u.id, checkins: [] as ProgressCheckin[] };
        const data = (await res.json()) as { checkins: ProgressCheckin[] };
        return { userId: u.id, checkins: data.checkins };
      });

      const progressResults = await Promise.all(progressPromises);

      let total = 0;
      let best: { userId: string; sum: number } | null = null;

      for (const pr of progressResults) {
        total += pr.checkins.length;

        const weekSum = pr.checkins
          .filter((c) => c.date >= startStr && c.date <= today)
          .reduce((acc, c) => acc + (c.pushups_count ?? 0), 0);

        if (!best || weekSum > best.sum) best = { userId: pr.userId, sum: weekSum };
      }

      setTotalCheckinsResolved(total);

      if (best) {
        const bestUser = users.find((u) => u.id === best!.userId) ?? null;
        setBestWeek(bestUser);
      }

      setWhoMissedToday(users.filter((u) => !u.checkedInToday));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!adminAuthed) return;
    // recompute once users loaded
    computeStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuthed, users.length]);

  if (!adminAuthed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-white/[0.03] border-white/10">
          <CardContent className="p-5">
            <div className="text-center mb-4">
              <div className="text-xl font-extrabold">Адмін доступ</div>
              <div className="text-sm text-white/60 mt-1">
                Введіть пароль, щоб керувати учасниками
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && <div className="text-sm text-red-300">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "..." : "Увійти"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-white/70 hover:text-white">
                ← Назад до списку
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold">Адмін панель</div>
            <div className="text-sm text-white/60 mt-1">
              Керування учасниками та перегляд штрафів
            </div>
          </div>

          <Link href="/" className="text-sm text-white/70 hover:text-white">
            Всі учасники →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/[0.03] border-white/10">
            <CardContent className="p-5">
              <div className="text-sm text-white/60 mb-3">
                Учасники ({users.length})
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {u.emoji} {u.name}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        @{u.slug}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={loading}
                      aria-label="Видалити учасника"
                    >
                      ⛔
                    </Button>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="text-sm text-white/60">Поки що немає учасників.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/10">
            <CardContent className="p-5">
              <div className="text-sm text-white/60 mb-3">Додати учасника</div>

              <form onSubmit={handleAddUser} className="space-y-3">
                <Input
                  placeholder="Імʼя"
                  value={newName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewName(v);
                    setNewSlug(slugify(v));
                  }}
                />

                <Input
                  placeholder="Slug (латиницею, напр. artem)"
                  value={newSlug}
                  onChange={(e) => setNewSlug(slugify(e.target.value))}
                />

                <div>
                  <div className="text-xs text-white/60 mb-2">Emoji</div>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewEmoji(em)}
                        className={[
                          "w-10 h-10 rounded-xl border transition-colors",
                          newEmoji === em
                            ? "border-[#22c55e] bg-[#22c55e]/15"
                            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                        ].join(" ")}
                        aria-label={`Обрати ${em}`}
                      >
                        <span className="text-lg">{em}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "..." : "Додати"}
                </Button>
              </form>

              {profileLink && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-xs text-white/60">Посилання на профіль</div>
                  <div className="mt-1 text-sm font-semibold break-words">
                    {profileLink}
                  </div>
                  <div className="mt-3">
                    <Button type="button" variant="outline" onClick={copyProfileLink}>
                      Скопіювати
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-5">
            <div className="text-sm text-white/60 mb-3">Штрафна дошка</div>
            <div className="space-y-2">
              {users
                .filter((u) => u.penaltyLevel > 0)
                .map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">
                        ⚠️ {u.emoji} {u.name}
                      </div>
                      <div className="text-xs text-red-200/80">
                        Пропущено днів: {u.missedDays}
                      </div>
                    </div>
                    <div className="text-sm font-black text-red-200">
                      Рівень {u.penaltyLevel}
                    </div>
                  </div>
                ))}

              {users.filter((u) => u.penaltyLevel > 0).length === 0 && (
                <div className="text-sm text-white/60">Зараз немає штрафів.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-5">
            <div className="text-sm text-white/60 mb-3">Загальна статистика</div>

            {statsLoading ? (
              <div className="text-sm text-white/70">Рахуємо...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-xs text-white/60">Всього відміток</div>
                  <div className="mt-1 text-2xl font-black">{totalCheckinsResolved}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-xs text-white/60">Найкращий (тиждень)</div>
                  <div className="mt-1 text-lg font-black">
                    {bestWeek ? `${bestWeek.emoji} ${bestWeek.name}` : "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 md:col-span-1">
                  <div className="text-xs text-white/60">Не віджався сьогодні</div>
                  <div className="mt-2 space-y-1 text-sm">
                    {whoMissedToday.length === 0 ? (
                      <div className="text-white/70">Ніхто 😄</div>
                    ) : (
                      whoMissedToday.map((u) => (
                        <div key={u.id}>
                          {u.emoji} {u.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

