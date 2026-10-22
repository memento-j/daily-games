"use client";

// Today's date and puzzle number, read in the browser only.

import { useToday } from "@/lib/useToday";

export default function TodayDate() {
  const today = useToday();
  return (
    <span className="text-sm text-ink-faint">
      {today ? `${today.date} · No. ${today.number}` : " "}
    </span>
  );
}
