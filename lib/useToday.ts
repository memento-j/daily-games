"use client";

// Today's puzzle number and date, from the player's browser (never the build).
// useSyncExternalStore returns the server snapshot (null) during the build and
// hydration, then the real value straight after, so there's no hydration mismatch.

import { useSyncExternalStore } from "react";
import { getPuzzleNumber } from "@/lib/daily";

export type Today = { number: number | null; date: string };

const noSubscription = () => () => {};
let cached: { key: string; value: Today } | null = null;

function read(): Today {
  const now = new Date();
  const key = now.toDateString();
  if (cached?.key === key) return cached.value; // stable object between renders
  const n = getPuzzleNumber(now);
  const value: Today = {
    number: n >= 1 ? n : null,
    date: now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
  };
  cached = { key, value };
  return value;
}

export function useToday(): Today | null {
  return useSyncExternalStore(noSubscription, read, () => null);
}
