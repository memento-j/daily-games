"use client";

// Today's Downstream puzzle as seen from outside the game (homepage, /downstream):
// which puzzle it is, whether it's finished, and the player's stats. Re-reads
// storage whenever a result is saved (in this tab or another).

import { useSyncExternalStore } from "react";
import { getHistory, subscribe } from "@/lib/storage";
import { computeStats, type Stats } from "@/lib/stats";
import { puzzleToPlay, storageKeyFor } from "./schedule";
import type { SavedResult } from "./useDownstreamGame";

export type TodayResult = {
  number: number;
  preview: boolean;
  result: SavedResult | null; // null = not finished today
  stats: Stats;
};

let cache: { key: string; value: TodayResult } | null = null;

function read(): TodayResult {
  const { number, preview } = puzzleToPlay(null);
  const history = getHistory<SavedResult>(storageKeyFor(preview));
  const key = `${number}|${preview}|${JSON.stringify(history)}`;
  if (cache?.key === key) return cache.value; // same object while nothing changed
  const value = { number, preview, result: history[number] ?? null, stats: computeStats(history, number) };
  cache = { key, value };
  return value;
}

/** null during the build and first render (storage is browser-only), then the real value. */
export function useTodayResult(): TodayResult | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Stats for one storage key, as of puzzle `today` (the game's summary uses this). */
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
let statsCache: { key: string; value: Stats } | null = null;
