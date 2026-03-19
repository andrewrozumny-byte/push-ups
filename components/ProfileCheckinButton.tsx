"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckinModal } from "./CheckinModal";

type ProfileCheckinButtonProps = {
  userId: string; // UUID in DB
  initialCheckedIn: boolean;
  onModalClosed?: () => void; // Fires after successful check-in modal is closed
};

export function ProfileCheckinButton({
  userId,
  initialCheckedIn,
  onModalClosed,
}: ProfileCheckinButtonProps) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [motivator, setMotivator] = useState("");
  const [pushups, setPushups] = useState(0);
  const shouldRefetchAfterCloseRef = useRef(false);

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

  const handleClick = async () => {
    if (checkedIn || loading) return;
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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
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

      <CheckinModal
        open={modalOpen}
        onClose={handleModalClose}
        motivator={motivator}
        pushups={pushups}
      />
    </>
  );
}

