"use client";

import { useEffect, useState } from "react";

type CheckinModalProps = {
  open: boolean;
  onClose: () => void;
  motivator: string;
  pushups: number;
};

export function CheckinModal({
  open,
  onClose,
  motivator,
  pushups,
}: CheckinModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.requestAnimationFrame(() => setVisible(true));
    return () => {
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(t);
      setVisible(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div
        className={[
          "relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 transition-all duration-300 ease-out",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        ].join(" ")}
      >
        <div className="text-center">
          <div className="text-[28px] sm:text-[34px] font-extrabold text-[#22c55e] drop-shadow-sm">
            ТИ КРАСАВЧИК! 🔥
          </div>

          <div className="mt-3 text-xs text-white/60">
            Сьогодні віджимань: <span className="text-white font-semibold">{pushups}</span>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-white/60">Біблійний мотиватор</div>
            <div className="mt-2 text-sm sm:text-base font-medium italic leading-snug text-white">
              &ldquo;{motivator}&rdquo;
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/15 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
}

