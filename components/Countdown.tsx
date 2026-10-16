"use client";

// "New drops in 5h 12m": time until the player's next local midnight, ticking.
// Empty during the build and first render (the time is browser-only).

import { useEffect, useState } from "react";
import { formatCountdown, msUntilNextPuzzle } from "@/lib/daily";

export default function Countdown({ prefix = "New drops in", className = "" }: { prefix?: string; className?: string }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setMs(msUntilNextPuzzle());
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 15000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  return (
    <span className={className} aria-live="off">
      {ms === null ? " " : `${prefix} ${formatCountdown(ms)}`}
    </span>
  );
}
