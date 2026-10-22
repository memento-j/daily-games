"use client";

// Under a homepage game card, once today's puzzle is done: "Up for one more?", a way
// into yesterday's puzzle while it's unplayed. It sits outside the card because the
// card is itself a link, and a link can't hold another. The Peeker glances back, as on
// the games' summaries (components/YesterdayLink.tsx).

import { PeekerParts } from "@/components/Peeker";
import { useUnplayedYesterday } from "@/components/YesterdayLink";
import { GAME_KEY as DOWNSTREAM_KEY, PREVIEW_KEY as DOWNSTREAM_PREVIEW } from "@/games/downstream/schedule";
import { useTodayResult as useDownstreamToday } from "@/games/downstream/useTodayResult";
import { GAME_KEY as SLICE_KEY, PREVIEW_KEY as SLICE_PREVIEW } from "@/games/slice/schedule";
import { useTodayResult as useSliceToday } from "@/games/slice/useTodayResult";

function YesterdayChip({ done, yesterday, path, name }: { done: boolean; yesterday: number; path: string; name: string }) {
  if (!done || !yesterday) return null;
  return (
    // A plain link: a fresh page load starts the game cleanly on yesterday's puzzle.
    <a
      href={`${path}?puzzle=${yesterday}`}
      className="group mt-2 ml-5 inline-flex items-center gap-2 rounded-full bg-coral-soft py-1.5 pr-3.5 pl-2 text-sm sm:ml-7"
    >
      <svg viewBox="0 0 48 40" className="h-5 w-6 shrink-0" aria-hidden="true">
        <PeekerParts pupilClass="-translate-x-[3.2px] transition-[translate] duration-300 ease-out group-hover:translate-x-0" />
        <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
      </svg>
      <span className="text-ink-soft">Up for one more?</span>
      <span className="flex items-center gap-1 font-semibold text-coral-deep">
        Play yesterday&apos;s {name}
        <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
          <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}

export function SliceYesterday() {
  const today = useSliceToday();
  const yesterday = useUnplayedYesterday([SLICE_KEY, SLICE_PREVIEW]);
  return <YesterdayChip done={!!today?.result} yesterday={yesterday} path="/slice/" name="Slice" />;
}

export function DownstreamYesterday() {
  const today = useDownstreamToday();
  const yesterday = useUnplayedYesterday([DOWNSTREAM_KEY, DOWNSTREAM_PREVIEW]);
  return <YesterdayChip done={!!today?.result} yesterday={yesterday} path="/downstream/" name="Downstream" />;
}
