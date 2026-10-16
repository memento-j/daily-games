"use client";

// Today's date (or the launch date before launch), read in the browser only.

import { useToday } from "@/lib/useToday";

export default function TodayDate() {
  const today = useToday();
  return (
    <span className="text-sm text-ink-faint">
      {today ? (today.number ? `${today.date} · No. ${today.number}` : `Launches ${today.launch}`) : " "}
    </span>
  );
}
