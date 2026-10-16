"use client";

// The homepage's Downstream card status: today's score and the countdown once
// played, a streak nudge when there is one, else the game's basics.

import Countdown from "@/components/Countdown";
import { maxPoints, totalPoints } from "@/games/downstream/scoring";
import { useTodayResult } from "@/games/downstream/useTodayResult";

export default function DownstreamStatus() {
  const t = useTodayResult();
  if (t?.result) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-coral-deep">Done today · {totalPoints(t.result.results)}/{maxPoints(t.result.results.length)}</span>
        <span aria-hidden="true" className="text-ink-faint">·</span>
        <Countdown className="text-ink-faint" />
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
      {t && t.stats.currentStreak > 0 ? (
        <span className="font-semibold text-coral-deep">Keep your {t.stats.currentStreak}-day streak going</span>
      ) : (
        <>
          <span>5 drops</span>
          <span aria-hidden="true">·</span>
          <span>2 to 5 minutes</span>
        </>
      )}
      <span aria-hidden="true">·</span>
      <span className="flex items-center gap-1 font-semibold text-coral-deep">
        Play
        <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
          <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
