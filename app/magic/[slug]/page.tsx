"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Phase = "loading" | "success" | "already" | "error" | "badlink";

type CheckinJson = {
  created_at?: string;
};

function formatKyivTs(iso: string) {
  try {
    return new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/Kyiv",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MagicCheckinInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : Array.isArray(slugParam) ? slugParam[0] : "";
  const token = searchParams.get("token")?.trim() ?? "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [pushups, setPushups] = useState(0);
  const [motivator, setMotivator] = useState("");
  const [emoji, setEmoji] = useState("💪");
  const [alreadyAt, setAlreadyAt] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !token) {
      setPhase("badlink");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, token }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          pushups?: number;
          motivator?: string;
          emoji?: string;
          checkin?: CheckinJson;
        };

        if (cancelled) return;

        if (res.status === 401) {
          setPhase("error");
          return;
        }

        if (res.status === 409) {
          if (data.checkin?.created_at) {
            setAlreadyAt(formatKyivTs(data.checkin.created_at));
          } else {
            setAlreadyAt(null);
          }
          setPhase("already");
          return;
        }

        if (!res.ok || !data.success) {
          setPhase("error");
          return;
        }

        setPushups(Number(data.pushups ?? 0));
        setMotivator(data.motivator ?? "");
        if (data.emoji) setEmoji(data.emoji);
        setPhase("success");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (phase === "badlink") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
        <p className="text-lg text-white/90">Невірне посилання</p>
        <p className="mt-2 text-sm text-white/50">Відкрий посилання з Telegram ще раз.</p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
        >
          На головну
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#0a0a0a] px-6">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" aria-hidden />
        <p className="text-lg font-medium tracking-tight text-white/90">Відмічаємось...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
        <p className="text-xl font-semibold text-white/95">Щось пішло не так 😅</p>
        <p className="mt-3 max-w-sm text-sm text-white/45">
          Спробуй ще раз або відмічайся через профіль у застосунку.
        </p>
        <Link
          href="/"
          className="mt-10 rounded-full bg-gradient-to-r from-emerald-500/90 to-orange-500/85 px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20"
        >
          На головну
        </Link>
      </div>
    );
  }

  if (phase === "already") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
        <p className="text-2xl font-bold text-white">Вже відмітився сьогодні ✅</p>
        {alreadyAt && (
          <p className="mt-4 text-sm text-white/50">
            Час відмітки: <span className="text-white/75">{alreadyAt}</span>
          </p>
        )}
        <Link
          href="/"
          className="mt-12 rounded-full bg-white/10 px-8 py-3.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
        >
          На головну
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#050508] px-6 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,197,94,0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(249,115,22,0.12), transparent)",
        }}
      />
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <span className="select-none text-[clamp(4.5rem,22vw,7rem)] leading-none drop-shadow-[0_0_40px_rgba(34,197,94,0.25)]">
          {emoji}
        </span>
        <h1 className="mt-6 text-[clamp(1.75rem,6vw,2.25rem)] font-black uppercase tracking-tight text-white">
          ТИ КРАСАВЧИК! 🔥
        </h1>
        <p className="mt-4 text-lg text-emerald-400/95">
          Сьогодні норма: <span className="font-bold text-white">{pushups}</span> віджимань
        </p>
        {motivator ? (
          <blockquote className="mt-10 border-l-2 border-orange-500/60 pl-5 text-left text-base italic leading-relaxed text-white/70">
            {motivator}
          </blockquote>
        ) : null}
        <Link
          href="/"
          className="mt-14 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-10 py-4 text-sm font-bold uppercase tracking-wide text-black shadow-[0_0_32px_rgba(34,197,94,0.35)] transition hover:brightness-110"
        >
          На головну
        </Link>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#0a0a0a] px-6">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-400" aria-hidden />
      <p className="text-lg font-medium text-white/90">Відмічаємось...</p>
    </div>
  );
}

export default function MagicCheckinPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MagicCheckinInner />
    </Suspense>
  );
}
