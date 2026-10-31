"use client";

// Today at a glance, on the homepage. TodayProgress sits beside "Today's puzzles": one
// mark per game, filled once it's done, and "1 of 2 done". HomePeeker is the header's
// mark: it glances down at whichever game card the pointer is over (pure CSS, `:has`,
// `.home-peeker` in globals.css), and once both games are done for the day its eyes turn
// to happy arcs and it gives one small hop with a burst of dots, once per visit.
// Both read browser storage, so they render their plain state during the build.

import { PeekerParts } from "@/components/Peeker";
import { useTodayResult as useDownstreamToday } from "@/games/downstream/useTodayResult";
import { useTodayResult as useSliceToday } from "@/games/slice/useTodayResult";

/** Which of today's games are done: null while storage hasn't been read. */
function useDone(): { slice: boolean; downstream: boolean } | null {
  const slice = useSliceToday();
  const downstream = useDownstreamToday();
  if (!slice || !downstream) return null;
  return { slice: !!slice.result, downstream: !!downstream.result };
}

export function TodayProgress() {
  const done = useDone();
  if (!done) return null;
  const count = Number(done.slice) + Number(done.downstream);
  return (
    <p className="flex items-center gap-2 text-sm font-semibold" aria-label={count === 2 ? "Both of today's puzzles done" : `${count} of 2 done today`}>
      <span className="flex gap-1" aria-hidden="true">
        {/* Slice's mark: a little slab; Downstream's: a drop. Filled once done. */}
        <svg viewBox="0 0 16 16" className="size-4">
          <path d="M3 5.5c2.5-1.8 7-2.2 10 .3l-.8 6.4c-3 1.6-7 1.2-9.6-.4Z" fill={done.slice ? "var(--color-coral)" : "none"} stroke="var(--color-coral)" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 16 16" className="size-4">
          <path d="M8 1.8c2.2 2.9 4.4 5.6 4.4 8a4.4 4.4 0 0 1-8.8 0c0-2.4 2.2-5.1 4.4-8Z" fill={done.downstream ? "var(--color-coral)" : "none"} stroke="var(--color-coral)" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={count === 2 ? "text-coral-deep" : "text-ink-faint"}>{count === 2 ? "All done today" : `${count} of 2 done`}</span>
    </p>
  );
}

// The burst around the Peeker when both games are done: where each dot flies to.
const BURST: [number, number, string][] = [
  [-14, -12, "var(--color-coral)"],
  [0, -18, "var(--color-drop)"],
  [14, -13, "var(--color-coral)"],
  [-18, 2, "var(--color-drop)"],
  [18, 1, "var(--color-coral)"],
];

export function HomePeeker() {
  const done = useDone();
  const happy = !!done && done.slice && done.downstream;
  return (
    <span className={`home-peeker relative inline-block ${happy ? "is-happy" : ""}`}>
      <svg viewBox="0 0 48 48" className="size-8 overflow-visible" aria-hidden="true">
        <g className="home-peeker-body">
          {happy ? (
            // Happy eyes: two little arcs instead of round eyes.
            <>
              <path d="M5 34a19 19 0 0 1 38 0Z" fill="var(--color-coral)" />
              <path d="M13.5 25.5q4-5 8 0M26.5 25.5q4-5 8 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </>
          ) : (
            <PeekerParts pupilClass="home-pupils" />
          )}
        </g>
        <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
      </svg>
      {happy && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {BURST.map(([x, y, color], i) => (
            <span
              key={i}
              className="home-burst absolute top-1/2 left-1/2 size-1.5 rounded-full"
              style={{ background: color, "--to-x": `${x}px`, "--to-y": `${y}px`, animationDelay: `${120 + i * 40}ms` } as React.CSSProperties}
            />
          ))}
        </span>
      )}
    </span>
  );
}
