"use client";

// Today's Slice puzzle as seen from outside the game (the homepage card), and the
// player's stats. Re-reads storage whenever a result is saved.

import { useSyncExternalStore } from "react";
import { getHistory, subscribe } from "@/lib/storage";
import { computeStats, type Stats } from "@/lib/stats";
import { getPuzzleNumber } from "@/lib/daily";
import { GAME_KEY } from "./schedule";
import type { SavedResult } from "./useSliceGame";

export type TodayResult = {
  number: number;
  result: SavedResult | null; // null = not finished today
  stats: Stats;
};

let cache: { key: string; value: TodayResult } | null = null;

function read(): TodayResult {
  const number = getPuzzleNumber();
  const history = getHistory<SavedResult>(GAME_KEY);
  const key = `${number}|${JSON.stringify(history)}`;
  if (cache?.key === key) return cache.value; // same object while nothing changed
  const value = { number, result: history[number] ?? null, stats: computeStats(history, number) };
  cache = { key, value };
  return value;
}

/** null during the build and first render (storage is browser-only), then the real value. */
export function useTodayResult(): TodayResult | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

let statsCache: { key: string; value: Stats } | null = null;

/** Stats for one storage key, as of puzzle `today` (the day's summary uses this). */
export function useStats(storageKey: string, today: number): Stats | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const history = getHistory<SavedResult>(storageKey);
      const key = `${storageKey}|${today}|${JSON.stringify(history)}`;
      if (statsCache?.key !== key) statsCache = { key, value: computeStats(history, today) };
      return statsCache.value;
    },
    () => null,
  );
}
