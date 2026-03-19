"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function StatusIcons() {
  return (
    <div className="flex items-center gap-[5px] text-white/95" aria-hidden>
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" className="opacity-95">
        <rect x="0" y="8" width="3" height="4" rx="0.5" />
        <rect x="5" y="5" width="3" height="7" rx="0.5" />
        <rect x="10" y="2" width="3" height="10" rx="0.5" />
        <rect x="15" y="0" width="3" height="12" rx="0.5" />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="opacity-95">
        <path
          d="M8 11a1 1 0 100-2 1 1 0 000 2zM4.5 7.5a4 4 0 017 0M1 4a8 8 0 0114 0"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none" className="opacity-95">
        <rect x="0.5" y="1.5" width="20" height="9" rx="2" stroke="currentColor" strokeWidth="1" />
        <path d="M22 4v4a1 1 0 001-1V5a1 1 0 00-1-1z" fill="currentColor" />
        <rect x="2.5" y="3.5" width="14" height="5" rx="1" fill="currentColor" />
      </svg>
    </div>
  );
}

function StatusBar() {
  const [time, setTime] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(
        d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative z-20 flex h-[48px] shrink-0 items-center px-5 pt-2 text-[15px] font-semibold tabular-nums tracking-tight text-white">
      <span className="w-[28%] text-left" suppressHydrationWarning>
        {time}
      </span>
      <div className="flex w-[44%] justify-center">
        <div
          className="h-[28px] w-[118px] rounded-full bg-[#0a0a0a] ring-1 ring-white/10"
          aria-hidden
        />
      </div>
      <div className="flex w-[28%] justify-end">
        <StatusIcons />
      </div>
    </div>
  );
}

export function PhoneFrameShell({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const showFrame = isMobile === false;

  return (
    <div
      className={cn(
        "relative w-full",
        showFrame
          ? "min-h-screen overflow-x-hidden overflow-y-auto bg-[#050505]"
          : "flex min-h-[100dvh] min-h-screen flex-col"
      )}
    >
      {showFrame && (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-[#050505]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center select-none"
            aria-hidden
          >
            <span className="text-center text-[clamp(1.75rem,6vw,3.25rem)] font-black tracking-tight text-white opacity-[0.04]">
              Push-Ups Crew
            </span>
          </div>
        </>
      )}

      <div
        className={cn(
          "relative z-10 mx-auto flex w-full flex-col",
          showFrame
            ? "min-h-screen items-center justify-center py-6 md:py-8"
            : "flex min-h-0 flex-1 flex-col"
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col",
            showFrame
              ? "h-[844px] w-[390px] max-w-[calc(100vw-2rem)] shrink-0 rounded-[50px] bg-[linear-gradient(145deg,#2a2a2a,#1a1a1a)] p-[3px] shadow-2xl shadow-black/50"
              : "min-h-0 flex-1"
          )}
        >
          <div
            className={cn(
              "flex min-h-0 w-full flex-1 flex-col overflow-hidden",
              showFrame &&
                "h-full rounded-[47px] bg-black shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]"
            )}
          >
            {showFrame && <StatusBar />}

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                showFrame
                  ? "mx-2 mb-1 mt-0 rounded-[42px] shadow-[inset_0_0_28px_rgba(0,0,0,0.45)]"
                  : "w-full min-h-0 flex-1"
              )}
            >
              {children}
            </div>

            {showFrame && (
              <div className="flex shrink-0 justify-center pb-3 pt-1">
                <div
                  className="h-[5px] w-[134px] rounded-full bg-white/90"
                  aria-hidden
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
