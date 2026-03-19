"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type User = { id: string; name: string; emoji?: string; slug?: string };

export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newEmoji, setNewEmoji] = useState("💪");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const checkAuth = async () => {
    const res = await fetch("/api/admin/auth");
    const data = await res.json();
    setAuth(data.ok === true);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!auth) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAuth(true);
    } else {
      setError("Невірний пароль");
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const slug = newSlug.trim() || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!name) return;
    if (!slug) {
      alert("Вкажіть ім'я латиницею або введіть slug вручну");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, emoji: newEmoji || "💪" }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => [...prev, data]);
        setNewName("");
        setNewSlug("");
        setNewEmoji("💪");
      } else {
        alert(data.error || "Помилка");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Видалити учасника? Відмітки теж видаляться.")) return;
    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const initDb = async () => {
    setInitLoading(true);
    try {
      const res = await fetch("/api/admin/init", { method: "POST" });
      const data = await res.json();
      if (res.ok) alert("Таблиці створено");
      else alert(data.error || "Помилка");
    } finally {
      setInitLoading(false);
    }
  };

  if (auth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Перевірка доступу...</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Вхід в адмінку</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full">
                Увійти
              </Button>
            </form>
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "mt-4 w-full inline-flex justify-center")}>
              На головну
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Адмінка</h1>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          На головну
        </Link>
      </header>

      <main className="container max-w-xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>База даних</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={initDb}
              disabled={initLoading}
            >
              {initLoading ? "..." : "Створити таблиці (якщо ще не створено)"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Додати учасника</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addUser} className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Ім'я"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="slug (artem)"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="max-w-[120px]"
                />
                <Input
                  placeholder="💪"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="w-14 text-center"
                />
              </div>
              <Button type="submit" disabled={loading}>
                Додати
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Учасники ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span>{u.emoji ?? "💪"} {u.name}{u.slug ? ` (${u.slug})` : ""}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteUser(u.id)}
                  >
                    Видалити
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
