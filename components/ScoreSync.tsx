"use client";

// At each site load, retries any score that failed to reach the server (lib/scores.ts), and
// keeps the old per-game streaks for the shared streak (lib/useStreak.ts), once. In the root
// layout, after the page is interactive, so it never slows anything. Renders nothing.

import { useEffect } from "react";
import { getPuzzleNumber } from "@/lib/daily";
import { installStreakHelpers } from "@/lib/devStreak";
import { flushScores } from "@/lib/scores";
import { keepOldStreaks } from "@/lib/useStreak";

export default function ScoreSync() {
  useEffect(() => {
    keepOldStreaks(getPuzzleNumber());
    installStreakHelpers();
    void flushScores();
  }, []);
  return null;
}
