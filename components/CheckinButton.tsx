"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CheckinButtonProps = {
  userId: string;
  checkedIn: boolean;
  userName?: string;
};

export function CheckinButton({
  userId,
  checkedIn: initialCheckedIn,
  userName,
}: CheckinButtonProps) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

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
      if (res.ok) {
        setCheckedIn(true);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      } else {
        if (res.status === 409) setCheckedIn(true);
        else alert(data.error || "Помилка");
      }
    } catch {
      alert("Помилка мережі");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={checkedIn || loading}
      className={cn(
        "transition-transform",
        pulse && "animate-pulse scale-110"
      )}
      aria-label={checkedIn ? "Вже віджався сьогодні" : `Відмітитися: ${userName ?? "віджимання"}`}
    >
      {loading ? "..." : checkedIn ? "✓ Віджався" : "Віджався"}
    </Button>
  );
}
