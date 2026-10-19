"use client";

// Today's date (and, once launched, today's puzzle number), read in the browser only.
// The launch date itself is never shown: it may still move (developer's call, 2026-10-19).

import { useToday } from "@/lib/useToday";

export default function TodayDate() {
  const today = useToday();
  return (
    <span className="text-sm text-ink-faint">
      {today ? (today.number ? `${today.date} · No. ${today.number}` : today.date) : " "}
    </span>
  );
}
