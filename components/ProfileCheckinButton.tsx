"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckinModal } from "./CheckinModal";

type ProfileCheckinButtonProps = {
  userId: string; // UUID in DB
  initialCheckedIn: boolean;
  onModalClosed?: () => void; // Fires after successful check-in modal is closed
  /** Kyiv Saturday: show rest UI, no check-in. */
  isSaturdayRest?: boolean;
};

export function ProfileCheckinButton({
  userId,
  initialCheckedIn,
  onModalClosed,
  isSaturdayRest = false,
}: ProfileCheckinButtonProps) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [motivator, setMotivator] = useState("");
  const [pushups, setPushups] = useState(0);
  const shouldRefetchAfterCloseRef = useRef(false);

  useEffect(() => {
    if (!showConfirm) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowConfirm(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showConfirm]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        if (shouldRefetchAfterCloseRef.current) {
          shouldRefetchAfterCloseRef.current = false;
          onModalClosed?.();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, onModalClosed]);

  const runConfetti = () => {
    confetti({
      particleCount: 160,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#22c55e", "#f97316", "#38bdf8", "#fde047", "#fb7185"],
    });
    setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 55,
        origin: { y: 0.75 },
        colors: ["#22c55e", "#f97316", "#38bdf8", "#fde047", "#fb7185"],
      });
    }, 250);
  };

  const handleOpenConfirm = () => {
    if (isSaturdayRest || checkedIn || loading) return;
    setShowConfirm(true);
  };

  const performCheckin = async () => {
    if (isSaturdayRest || checkedIn || loading) return;
    setShowConfirm(false);
    setLoading(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setCheckedIn(true);
      setPushups(Number(data.pushups ?? 0));
      setMotivator(data.motivator || "");

      runConfetti();
      shouldRefetchAfterCloseRef.current = true;
      setModalOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  function handleModalClose() {
    setModalOpen(false);
    if (shouldRefetchAfterCloseRef.current) {
      shouldRefetchAfterCloseRef.current = false;
      onModalClosed?.();
    }
  }

  if (isSaturdayRest) {
    return (
      <div className="space-y-2">
        <div
          className="w-full rounded-2xl border border-white/10 bg-gray-800 px-4 py-6 sm:py-7 text-center font-extrabold text-gray-500 cursor-not-allowed select-none"
          role="status"
          aria-label="Субота — день відпочинку"
        >
          🕊 Субота — день відпочинку
        </div>
        <p className="text-center text-sm text-white/60">
          Повертайся завтра 😊
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={checkedIn || loading}
        className={[
          "w-full rounded-2xl px-4 sm:px-6 text-center font-extrabold",
          "py-6 sm:py-7",
          "transition-transform active:scale-[0.99]",
          checkedIn
            ? "bg-white/10 text-white/60 border border-white/10 cursor-not-allowed"
            : "bg-[#14532d] text-white border border-[#22c55e]/40",
          !checkedIn && !loading ? "animate-pulse" : "",
          loading ? "opacity-90" : "",
        ].join(" ")}
        aria-label={checkedIn ? "Уже віджався сьогодні" : "Я віджався 💪"}
      >
        {loading
          ? "..."
          : checkedIn
            ? "Вже віджався сьогодні ✅"
            : "Я віджався 💪"}
      </button>

      {showConfirm ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(0,0,0,0.8)] cursor-default border-0 p-0 w-full h-full"
            onClick={() => setShowConfirm(false)}
            aria-label="Закрити"
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-[#22c55e]/30 bg-[#111111] p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-confirm-title"
          >
            <h2
              id="checkin-confirm-title"
              className="text-xl font-bold text-white text-center"
            >
              Відос завантажив? 📱
            </h2>
            <p className="mt-1 text-center text-sm text-gray-400">
              Не забув скинути кружечок в групу?
            </p>
            <button
              type="button"
              onClick={() => void performCheckin()}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#14532d] py-4 text-center font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              ✅ Так, все зробив!
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#1a1a1a] py-3 text-center font-semibold text-gray-400 transition-colors hover:bg-[#222] hover:text-gray-300 disabled:opacity-60"
            >
              ❌ Ой, забув!
            </button>
          </div>
        </div>
      ) : null}

      <CheckinModal
        open={modalOpen}
        onClose={handleModalClose}
        motivator={motivator}
        pushups={pushups}
      />
    </>
  );
}

