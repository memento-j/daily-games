"use client";

// On today's summary, an invitation to one more: yesterday's puzzle. The Peeker glances
// back over its shoulder at it (and turns to the arrow on hover). While yesterday's is
// unplayed (on its own day or since) it's an invitation; it plays as a preview
// (lib/schedule.ts), so it never changes streaks or stats, and the card says so: a
// player shouldn't have to wonder whether a bonus puzzle risks their streak. Once it's
// played, a small row takes its place with that score, a way back to its summary (and
// its Share button), which was otherwise unreachable once left (2026-10-31). One of the
// quiet rows on the results screen (components/NextUp.tsx).

import { useSyncExternalStore } from "react";
import type { NextUpItem } from "@/components/NextUp";
import { PeekerParts } from "@/components/Peeker";
import { getPuzzleNumber } from "@/lib/daily";
import { getHistory, subscribe } from "@/lib/storage";

/** Yesterday's puzzle number while it's unplayed in any of these storage keys, else 0.
 *  (A number, not an object, so the snapshot is stable between renders.) */
export function useUnplayedYesterday(storageKeys: string[]): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const n = getPuzzleNumber() - 1;
      return n >= 1 && !storageKeys.some((key) => getHistory(key)[n]) ? n : 0;
    },
    () => 0,
  );
}

/** Yesterday's score if it has been played (on its day or since), else -1. */
export function useYesterdayPoints(storageKeys: string[]): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const n = getPuzzleNumber() - 1;
      if (n < 1) return -1;
      for (const key of storageKeys) {
        const result = getHistory<{ points?: number }>(key)[n];
        if (result) return result.points ?? 0;
      }
      return -1;
    },
    () => -1,
  );
}

/** Yesterday's puzzle as a row on the results screen, or null if there's nothing to offer. */
export function useYesterdayItem(path: string, storageKeys: string[], maxPoints: number): NextUpItem | null {
  const yesterday = useUnplayedYesterday(storageKeys);
  const played = useYesterdayPoints(storageKeys);
  const icon = (
    <svg viewBox="0 0 48 40" className="w-6" aria-hidden="true">
      <PeekerParts pupilClass="-translate-x-[3.2px] transition-[translate] duration-300 ease-out group-hover:translate-x-0" />
      <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
    </svg>
  );
  if (yesterday) {
    return { to: "yesterday", href: `${path}?puzzle=${yesterday}`, fullLoad: true, icon, title: "Up for one more? Play yesterday's", description: "Just for fun. Your streak is safe." };
  }
  if (played < 0) return null;
  const n = getPuzzleNumber() - 1;
  return { to: "yesterday", href: `${path}?puzzle=${n}`, fullLoad: true, icon, title: "See yesterday's puzzle", description: `No. ${n} · You scored ${played}/${maxPoints}` };
}
