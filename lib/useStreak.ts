"use client";

// The shared streak from storage (lib/streak.ts has the rules): both games' daily histories,
// plus the migration seed, worked out once from the old per-game streaks and kept as the
// site setting `streakSeed`. `readStreak` is for event handlers (a puzzle just finished);
// `useStreak` for screens, re-read whenever storage changes.

import { useSyncExternalStore } from "react";
import { computeStreak, seedFrom, type Seed, type Streak } from "./streak";
import { getHistory, getSetting, setSetting, subscribe } from "./storage";

/** The daily games' storage keys (games/<game>/schedule.ts GAME_KEY). Never the preview
 *  keys: yesterday's puzzle played late doesn't count, nor does practice (saved nowhere). */
export const STREAK_GAMES = ["slice", "downstream"];

export const SEED = "streakSeed";
/** Milestones already celebrated (each shows once ever). */
export const MILESTONES_SHOWN = "streakMilestonesShown";

type History = Record<number, { points: number }>;

/** The seed, saved the first time it's worked out (`save`), so it stays as it was on the day
 *  the shared streak arrived. Unsaved (storage blocked, or mid-render) it's worked out again. */
function seed(histories: History[], today: number, save: boolean): Seed {
  const saved = getSetting<Seed | null>("site", SEED, null);
  if (saved) return saved;
  const made = seedFrom(histories, today);
  if (save) setSetting("site", SEED, made);
  return made;
}

function histories(): History[] {
  return STREAK_GAMES.map((g) => getHistory<{ points: number }>(g));
}

/** Saves the migration seed if it isn't yet. Run at each site load (components/ScoreSync.tsx),
 *  before anything new is saved, so the old streaks are read as they were. */
export function keepOldStreaks(today: number): void {
  seed(histories(), today, true);
}

function compute(today: number, save: boolean): Streak {
  const h = histories();
  return computeStreak(
    h.flatMap((x) => Object.keys(x).map(Number)),
    today,
    seed(h, today, save),
  );
}

/** The shared streak now (for event handlers: call it after saving the finished puzzle). */
export function readStreak(today: number): Streak {
  return compute(today, true);
}

let cache: { key: string; value: Streak } | null = null;

export function useStreak(today: number | null): Streak | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (today === null) return null;
      // Stable between renders: recomputed only when the histories or the seed change. Never
      // writes (it runs during render).
      const key = JSON.stringify([today, STREAK_GAMES.map((g) => Object.keys(getHistory(g))), getSetting("site", SEED, null)]);
      if (cache?.key !== key) cache = { key, value: compute(today, false) };
      return cache.value;
    },
    () => null,
  );
}
