"use client";

// At each site load, retries any score that failed to reach the server (lib/scores.ts).
// In the root layout, after the page is interactive, so it never slows anything. Renders nothing.

import { useEffect } from "react";
import { flushScores } from "@/lib/scores";

export default function ScoreSync() {
  useEffect(() => {
    void flushScores();
  }, []);
  return null;
}
