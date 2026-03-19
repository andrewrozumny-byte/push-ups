"use client";

import { useEffect, useState } from "react";

type DailyMotivator = {
  photoUrl: string;
  quote: string;
  source?: string;
  alt?: string;
};

export function DailyMotivator() {
  const [motivator, setMotivator] = useState<DailyMotivator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/motivator?mode=daily")
      .then((res) => res.json())
      .then((data) => {
        setMotivator(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="relative">
          <div className="h-44 w-full bg-white/5 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="h-3 w-3/4 bg-white/10 animate-pulse rounded" />
            <div className="mt-2 h-3 w-1/2 bg-white/10 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!motivator) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="relative">
        <img
          src={motivator.photoUrl}
          alt={motivator.alt ?? "Daily motivator"}
          className="h-44 w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        <div className="absolute inset-0 p-4 flex flex-col justify-end">
          <div className="text-xs text-white/60 mb-2">Мотивация дня</div>
          <div className="text-sm sm:text-base font-bold leading-snug">
            <span className="text-[#22c55e]">“</span>
            <span>{motivator.quote}</span>
            <span className="text-[#22c55e]">”</span>
          </div>
          {motivator.source && (
            <div className="mt-2 text-xs text-white/70">{motivator.source}</div>
          )}
        </div>
      </div>
    </div>
  );
}
