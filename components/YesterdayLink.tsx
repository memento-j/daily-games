"use client";

// On today's summary, an invitation to one more: yesterday's puzzle. The Peeker glances
// back over its shoulder at it (and turns to the arrow on hover). Shown only while
// yesterday's puzzle is unplayed, whether on its own day or since. It plays as a preview
// (lib/schedule.ts), so it never changes streaks or stats, and the card says so: a
// player shouldn't have to wonder whether a bonus puzzle risks their streak.

import { useSyncExternalStore } from "react";
import { PeekerParts } from "@/components/Peeker";
import { getPuzzleNumber } from "@/lib/daily";
import { getHistory, subscribe } from "@/lib/storage";

export default function YesterdayLink({ path, storageKeys, teaser }: { path: string; storageKeys: string[]; teaser: string }) {
  // A number (or 0 for "nothing to offer"), so the snapshot is stable between renders.
  const yesterday = useSyncExternalStore(
    subscribe,
    () => {
      const n = getPuzzleNumber() - 1;
      return n >= 1 && !storageKeys.some((key) => getHistory(key)[n]) ? n : 0;
    },
    () => 0,
  );
  if (!yesterday) return null;
  return (
    // A plain link: a fresh page load starts the game cleanly on the other puzzle.
    <a href={`${path}?puzzle=${yesterday}`} className="group flex items-center gap-3.5 rounded-2xl bg-coral-soft py-3 pr-4 pl-3">
      <svg viewBox="0 0 48 40" className="size-12 shrink-0" aria-hidden="true">
        <PeekerParts pupilClass="-translate-x-[3.2px] transition-[translate] duration-300 ease-out group-hover:translate-x-0" />
        <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="font-display block text-[17px] leading-tight font-semibold tracking-[-0.01em]">Up for one more?</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{teaser} Just for fun, so your streak is safe.</span>
        <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-coral-deep">
          Play yesterday&apos;s No. {yesterday}
          <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </a>
  );
}
