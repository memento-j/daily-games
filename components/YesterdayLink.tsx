"use client";

// On today's summary, an invitation to one more: yesterday's puzzle. The Peeker glances
// back over its shoulder at it (and turns to the arrow on hover). Shown only while
// yesterday's puzzle is unplayed, whether on its own day or since. It plays as a preview
// (lib/schedule.ts), so it never changes streaks or stats, and the card says so: a
// player shouldn't have to wonder whether a bonus puzzle risks their streak.
// Kept compact: on phones the summary sheet leaves most of the screen to the board.

import { useSyncExternalStore } from "react";
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

export default function YesterdayLink({ path, storageKeys, teaser }: { path: string; storageKeys: string[]; teaser: string }) {
  const yesterday = useUnplayedYesterday(storageKeys);
  if (!yesterday) return null;
  return (
    // A plain link: a fresh page load starts the game cleanly on the other puzzle.
    <a href={`${path}?puzzle=${yesterday}`} className="group flex items-center gap-3 rounded-2xl bg-coral-soft py-2.5 pr-3.5 pl-2.5">
      <svg viewBox="0 0 48 40" className="h-8 w-10 shrink-0" aria-hidden="true">
        <PeekerParts pupilClass="-translate-x-[3.2px] transition-[translate] duration-300 ease-out group-hover:translate-x-0" />
        <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="font-display block text-[15px] leading-tight font-semibold">
          Up for one more?<span className="sr-only"> Play yesterday&apos;s puzzle, No. {yesterday}.</span>
        </span>
        <span className="block text-xs leading-snug text-ink-soft">{teaser} Your streak is safe.</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-coral-deep" aria-hidden="true">
        Play
        <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5">
          <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}
