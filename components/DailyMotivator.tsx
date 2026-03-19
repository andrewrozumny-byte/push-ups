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
  const [imageError, setImageError] = useState(false);

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
    <div className="rounded-2xl border border-[#1e1e1e] bg-[#111111] overflow-hidden transition-shadow hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_30px_rgba(34,197,94,0.06)]">
      {/* Image on top (no cropping) */}
      <div className="w-full bg-[#111111] rounded-t-xl overflow-hidden">
        {!imageError ? (
          <img
            src={motivator.photoUrl}
            alt={motivator.alt ?? "Мотивація дня"}
            className="w-full max-h-[300px] object-contain"
            loading="eager"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-full max-h-[300px] h-[220px]"
            style={{
              background:
                "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
            }}
            aria-hidden
          />
        )}
      </div>

      {/* Quote section below */}
      <div className="p-4 sm:p-5">
        <div className="inline-flex items-center rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs font-semibold text-[#22c55e]">
          Мотивація дня
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
          <div className="text-sm sm:text-base font-bold italic leading-snug text-white">
            <span className="text-[#22c55e]">&ldquo;</span>
            <span>{motivator.quote}</span>
            <span className="text-[#22c55e]">&rdquo;</span>
          </div>
        </div>

        {motivator.source && (
          <div className="mt-2 text-xs text-white/70">{motivator.source}</div>
        )}
      </div>
    </div>
  );
}
