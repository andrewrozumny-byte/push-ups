"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { addCalendarDays, getKyivDate } from "@/lib/kyivDate";

type AdminUser = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  telegram_username: string | null;
  created_at: string;
  checkedInToday: boolean;
  pushupsToday: number;
  streak: number;
  penaltyLevel: 0 | 1 | 2 | 3;
  missedDays: number;
  progressPct: number | null;
};

const EMOJIS = ["💪", "🔥", "⚡", "🎯", "🦾", "👊", "🏋️‍♂️", "🚀"] as const;

function isCreatedToday(createdAt: string | Date | null | undefined, todayStr: string) {
  if (!createdAt) return false;
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(d.getTime())) return false;
  return getKyivDate(d) === todayStr;
}

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
  const [newTelegramUsername, setNewTelegramUsername] = useState("");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editTelegramUsername, setEditTelegramUsername] = useState("");
  const [editEmoji, setEditEmoji] = useState<(typeof EMOJIS)[number]>("💪");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string>("");
  const [editOriginalSlug, setEditOriginalSlug] = useState<string>("");
  const [lastSavedUserId, setLastSavedUserId] = useState<string | null>(null);
  const [slugWarnings, setSlugWarnings] = useState<
    Record<string, { oldSlug: string; newSlug: string }>
  >({});

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
    if (!name) {
      setError("Введіть імʼя");
      return;
    }

    const slug = (newSlug || slugify(name)).trim();
    if (!slug) {
      setError("Slug обовʼязковий");
      return;
    }

    // Read password at submit time so we always send current value (sessionStorage may have been set at login)
    const pwd = (typeof window !== "undefined" ? getSessionPassword() : null) ?? storedPassword ?? "";
    if (!pwd) {
      setError("Сесію втрачено. Увійдіть знову.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pwd,
        },
        body: JSON.stringify({
          name,
          slug,
          emoji: newEmoji,
          telegram_username: newTelegramUsername.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error || `HTTP ${res.status}`;
        console.error("[Admin Add User] Request failed:", res.status, data);
        throw new Error(errMsg);
      }

      setUsers((prev) => [...prev, data as AdminUser]);
      const addedSlug = (data as AdminUser).slug;
      const base = getAppUrl();
      setProfileLink(
        base
          ? `Посилання для ${name}: ${base}/${addedSlug}`
          : `Профіль: /${addedSlug} (вкажіть NEXT_PUBLIC_APP_URL для повного посилання)`
      );

      setNewName("");
      setNewSlug("");
      setNewEmoji("💪");
      setNewTelegramUsername("");

      // Refresh full list so new user has enriched stats
      await refreshUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка";
      setError(msg);
      console.error("[Admin Add User] Error:", e);
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

  const handleEditSave = async (e: React.FormEvent, user: AdminUser) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");

    try {
      const name = editName.trim();
      if (!name) {
        setEditError("Введіть імʼя");
        return;
      }

      const slug = editSlug.trim();
      if (!slug) {
        setEditError("Slug обовʼязковий");
        return;
      }

      if (!editEmoji) {
        setEditError("Emoji обовʼязковий");
        return;
      }

      const pwd =
        (typeof window !== "undefined" ? getSessionPassword() : null) ??
        storedPassword ??
        "";
      if (!pwd) {
        setEditError("Сесію втрачено. Увійдіть знову.");
        return;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pwd,
        },
        body: JSON.stringify({
          name,
          slug,
          emoji: editEmoji,
          telegram_username: editTelegramUsername.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const updated = data as Partial<AdminUser> & {
        telegram_username?: string | null;
        name: string;
        slug: string;
        emoji: string;
      };

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                name: updated.name,
                slug: updated.slug,
                emoji: updated.emoji,
                telegram_username:
                  updated.telegram_username != null
                    ? updated.telegram_username
                    : u.telegram_username ?? null,
              }
            : u
        )
      );

      const newSlug = updated.slug;
      const oldSlug = editOriginalSlug;
      if (newSlug !== oldSlug) {
        setSlugWarnings((prev) => ({
          ...prev,
          [user.id]: { oldSlug, newSlug },
        }));
      } else {
        setSlugWarnings((prev) => {
          const copy = { ...prev };
          delete copy[user.id];
          return copy;
        });
      }

      setEditingUserId(null);
      setLastSavedUserId(user.id);
      setTimeout(() => {
        setLastSavedUserId((cur) => (cur === user.id ? null : cur));
      }, 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  // Weekly/best/penalty stats computed on client by fetching progress per user
  const [statsLoading, setStatsLoading] = useState(false);
  const [totalCheckinsResolved, setTotalCheckinsResolved] = useState<number>(0);
  const [bestWeek, setBestWeek] = useState<AdminUser | null>(null);
  const [whoMissedToday, setWhoMissedToday] = useState<AdminUser[]>([]);
  const [telegramTestLoading, setTelegramTestLoading] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<string>("");

  const runTelegramCronTest = async (path: string) => {
    setTelegramTestLoading(true);
    setTelegramTestResult("");
    try {
      const res = await fetch(path, {
        method: "GET",
        headers: { ...(adminHeader ?? {}), "x-admin-password": storedPassword ?? "" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setTelegramTestResult(`OK: повідомлення надіслано (${path})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка відправки";
      setTelegramTestResult(msg);
      console.error("[Telegram Cron Test]", e);
    } finally {
      setTelegramTestLoading(false);
    }
  };

  const computeStats = async () => {
    setStatsLoading(true);
    setError("");
    try {
      type ProgressCheckin = { date: string; pushups_count: number };

      const today = getKyivDate();
      const startStr = addCalendarDays(today, -6);

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

        const weekCheckins = pr.checkins.filter(
          (c) => c.date >= startStr && c.date <= today
        );
        if (weekCheckins.length === 0) continue;

        const weekSum = weekCheckins.reduce(
          (acc, c) => acc + (c.pushups_count ?? 0),
          0
        );

        if (!best || weekSum > best.sum) best = { userId: pr.userId, sum: weekSum };
      }

      setTotalCheckinsResolved(total);

      setBestWeek(() => {
        if (!best) return null;
        return users.find((u) => u.id === best!.userId) ?? null;
      });

      // Use Kyiv "today" + fresh checkin rows (not stale checkedInToday from users list).
      setWhoMissedToday(
        users.filter((u) => {
          const pr = progressResults.find((p) => p.userId === u.id);
          const didToday = pr
            ? pr.checkins.some((c) => c.date === today)
            : u.checkedInToday;
          return !didToday && !isCreatedToday(u.created_at, today);
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!adminAuthed) return;
    void computeStats();
    // Re-run when list or per-user check-in flags change (not only length).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuthed, users]);

  if (!adminAuthed) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-[#111111]/90 border-[#1e1e1e] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition-shadow">
          <CardContent className="p-5 text-white">
            <div className="text-center mb-4">
              <div className="text-xl font-extrabold text-white">Адмін доступ</div>
              <div className="text-sm text-white/80 mt-1">
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              {error && <div className="text-sm text-red-300">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "..." : "Увійти"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-white/80 hover:text-white">
                ← Назад до списку
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-white overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold">Адмін панель</div>
            <div className="text-sm text-white mt-1">
              Керування учасниками та перегляд штрафів
            </div>
          </div>

          <Link href="/" className="text-sm text-white/70 hover:text-white">
            Всі учасники →
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="bg-[#111111]/70 border-[#1e1e1e] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.12)] transition-shadow">
            <CardContent className="p-5">
              <div className="text-sm text-white mb-3">
                Учасники ({users.length})
              </div>

              <div className="space-y-2">
                {users.map((u) => {
                  const isEditing = editingUserId === u.id;
                  const warn = slugWarnings[u.id];
                  const showSaved = lastSavedUserId === u.id;

                  if (isEditing) {
                    return (
                      <form
                        key={u.id}
                        onSubmit={(e) => handleEditSave(e, u)}
                        className="rounded-xl border border-[#1e1e1e] bg-[#111111]/60 px-3 py-2 space-y-3"
                      >
                        <div className="text-xs text-white/80">
                          ✏️ Редагування
                        </div>

                        <Input
                          placeholder="Імʼя"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40 whitespace-nowrap max-w-[160px] truncate">
                            push-ups-gamma.vercel.app/
                          </span>
                          <Input
                            placeholder="Slug (латиницею, напр. artem)"
                            value={editSlug}
                            onChange={(e) => setEditSlug(slugify(e.target.value))}
                            className="flex-1 w-auto min-w-0"
                          />
                        </div>

                        <Input
                          placeholder="Telegram username (без @)"
                          value={editTelegramUsername}
                          onChange={(e) =>
                            setEditTelegramUsername(e.target.value)
                          }
                        />

                        <div>
                          <div className="text-xs text-white mb-2">Emoji</div>
                          <div className="flex flex-wrap gap-2">
                            {EMOJIS.map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setEditEmoji(em)}
                                className={[
                                  "w-10 h-10 rounded-xl border transition-colors",
                                  editEmoji === em
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

                        {editError && (
                          <div className="text-sm text-red-300">{editError}</div>
                        )}

                        {editSaving ? (
                          <div className="text-xs text-white/60">Зберігаємо...</div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <Button type="submit" disabled={loading || editSaving}>
                            Зберегти ✅
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={loading || editSaving}
                            onClick={() => {
                              setEditingUserId(null);
                              setEditError("");
                            }}
                          >
                            Скасувати ❌
                          </Button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div key={u.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-[#1e1e1e] bg-[#111111]/60 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white break-words">
                            <span className="mr-1.5" aria-hidden>
                              {u.emoji}
                            </span>
                            {u.name}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-400 break-all">
                            {u.telegram_username
                              ? `@${u.telegram_username.replace(/^@/, "")}`
                              : `@${u.slug}`}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setLastSavedUserId(null);
                              setEditName(u.name);
                              setEditSlug(u.slug);
                              setEditTelegramUsername(u.telegram_username ?? "");
                              setEditEmoji(u.emoji as (typeof EMOJIS)[number]);
                              setEditOriginalSlug(u.slug);
                              setEditError("");
                            }}
                            disabled={loading}
                            aria-label="Редагувати учасника"
                          >
                            ✏️
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={loading}
                            aria-label="Видалити учасника"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>

                      {showSaved && (
                        <div className="text-xs text-[#22c55e]">
                          Збережено ✅
                        </div>
                      )}

                      {warn && (
                        <div className="text-xs text-[#f59e0b] leading-snug whitespace-pre-line">
                          ⚠️ Слог змінено! Стара посилання /{warn.oldSlug} більше не працює.
                          <br />
                          Нова: /{warn.newSlug}
                        </div>
                      )}
                    </div>
                  );
                })}

                {users.length === 0 && (
                  <div className="text-sm text-white">
                    Поки що немає учасників.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111]/70 border-[#1e1e1e] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.12)] transition-shadow">
            <CardContent className="p-5">
              <div className="text-sm text-white mb-3">Додати учасника</div>
              {error && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}
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

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 whitespace-nowrap max-w-[160px] truncate">
                    push-ups-gamma.vercel.app/
                  </span>
                  <Input
                    placeholder="Slug (латиницею, напр. artem)"
                    value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))}
                    className="flex-1 w-auto min-w-0"
                  />
                </div>

                <div>
                  <div className="text-xs text-white mb-2">Emoji</div>
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

                <div>
                  <div className="text-xs text-white mb-2">
                    Telegram username (без @)
                  </div>
                  <Input
                    placeholder="Напр. andriy_go"
                    value={newTelegramUsername}
                    onChange={(e) =>
                      setNewTelegramUsername(e.target.value)
                    }
                    className="w-full"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "..." : "Додати"}
                </Button>
              </form>

              {profileLink && (
                <div className="mt-4 rounded-xl border border-[#1e1e1e] bg-[#111111]/60 px-3 py-3">
                  <div className="text-xs text-white">Посилання на профіль</div>
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

        <Card className="bg-[#111111]/70 border-[#1e1e1e] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.12)] transition-shadow">
          <CardContent className="p-5">
            <div className="text-sm text-white mb-3">Штрафна дошка</div>
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
                <div className="text-sm text-[#22c55e] font-semibold">
                  ✅ Штрафів немає
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111111]/70 border-[#1e1e1e] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.12)] transition-shadow">
          <CardContent className="p-5">
            <div className="text-sm text-white mb-3">Загальна статистика</div>

            {statsLoading ? (
              <div className="text-sm text-white/80">Рахуємо...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#1e1e1e] bg-[#111111]/60 px-3 py-3">
                  <div className="text-xs text-white">Всього відміток</div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {totalCheckinsResolved}
                  </div>
                </div>

                <div className="rounded-xl border border-[#1e1e1e] bg-[#111111]/60 px-3 py-3">
                  <div className="text-xs text-white">Найкращий (тиждень)</div>
                  <div className="mt-1 text-lg font-black text-white">
                    {bestWeek ? `${bestWeek.emoji} ${bestWeek.name}` : "Немає даних"}
                  </div>
                </div>

                <div className="rounded-xl border border-[#1e1e1e] bg-[#111111]/60 px-3 py-3 md:col-span-1">
                  <div className="text-xs text-white">Не віджався сьогодні</div>
                  <div className="mt-2 max-h-[200px] space-y-1 overflow-y-auto text-sm pr-1 [scrollbar-width:thin]">
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

        <Card className="bg-[#111111]/70 border-[#1e1e1e] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.12)] transition-shadow">
          <CardContent className="p-5">
            <div className="text-sm text-white mb-3">Telegram сповіщення</div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                disabled={telegramTestLoading}
                onClick={() => runTelegramCronTest("/api/cron/morning")}
              >
                🌅 Тест ранкового (7:00)
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                disabled={telegramTestLoading}
                onClick={() => runTelegramCronTest("/api/cron/midday")}
              >
                ☀️ Тест денного (14:00)
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                disabled={telegramTestLoading}
                onClick={() => runTelegramCronTest("/api/cron/evening")}
              >
                🌙 Тест вечірнього (22:00)
              </Button>
            </div>

            {telegramTestLoading ? (
              <div className="mt-3 text-xs text-white/70">Відправляємо...</div>
            ) : telegramTestResult ? (
              <div className="mt-3 text-xs text-white/80">
                {telegramTestResult}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

