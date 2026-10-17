"use client";

// The game screen on phones: the map is the board. The four seas are small
// buttons on the map where each sea is; tap one to pick it, then lock it in from
// the bar at the bottom (a second tap, so a stray touch never costs a drop).
// "Hide seas" takes the buttons (and names) off, to see the whole map. Nothing
// scrolls while you play, so the water is always in view. The sea buttons are
// shared with desktop (games/downstream/SeaButtons.tsx).
// (Chosen by the developer from three prototypes, 2026-10-16.)

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import RouteMap, { type RouteMapProps } from "@/games/downstream/RouteMap";
import { HideSeasToggle, SeaButtons, usePick, useSeaSpots, useSize } from "@/games/downstream/SeaButtons";
import type { GameState } from "@/games/downstream/game";
import { dropPoints, POINTS_BY_STAGE, type DropResult } from "@/games/downstream/scoring";
import { sound } from "@/games/downstream/sound";
import type { Drop, Puzzle } from "@/games/downstream/types";
import { DaySummary, DropAnnouncer, DropTokens, FlowButton, GameTopBar, NextButton, SoundToggle, factLine } from "@/games/downstream/ui";

type Props = {
  number: number;
  preview: boolean;
  puzzle: Puzzle;
  game: GameState;
  drop: Drop;
  result?: DropResult;
  finished: boolean;
  firstTime: boolean;
  onDismissIntro: () => void;
  onGuess: (option: string) => void;
  onFlow: () => void;
  onNext: () => void;
  /** The day's summary: which drop's route the map is replaying. */
  viewing: number;
  onView: (drop: number) => void;
  /** The map's props, minus the layout-specific ones this file sets. */
  map: Omit<RouteMapProps, "className" | "padding" | "hideOptionLabels" | "onCamera">;
};

// Room for the bottom bar, the top bar, and half a sea button's width at the sides.
const MAP_PADDING = { top: 100, bottom: 240, left: 70, right: 70 };

/** Height of an element, kept up to date. */
function useHeight<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  return [ref, height];
}

export default function PhoneGame(p: Props) {
  return p.finished ? <PhoneSummary {...p} /> : <PhonePlay {...p} />;
}

/** Back link, puzzle number and the big sound button, floating over the map's top edge. */
function MapTopBar({ number, preview }: { number: number; preview: boolean }) {
  return (
    <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex items-start gap-2 [&>*]:pointer-events-auto">
      <div className="flex-1">
        <GameTopBar number={number} preview={preview} />
      </div>
      <SoundToggle className="-mt-1.5" />
    </div>
  );
}

/** The points-at-stake meter, folded into a chip: "Worth 4 pts" beside four draining bars. */
function PointsChip({ stage }: { stage: number }) {
  const points = POINTS_BY_STAGE[stage];
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-coral-soft py-1.5 pr-3.5 pl-3" aria-live="polite">
      <div className="flex gap-0.5" aria-hidden="true">
        {POINTS_BY_STAGE.map((_, i) => (
          <span key={i} className={`h-3.5 w-1.5 rounded-full transition-colors duration-500 ${i >= stage ? "bg-coral" : "bg-coral/20"}`} />
        ))}
      </div>
      <span className="text-sm font-semibold text-coral-deep">
        Worth <span className="font-display text-[17px] tracking-[-0.02em]">{points}</span> pt{points === 1 ? "" : "s"}
      </span>
    </div>
  );
}

/** The result, compact: heading, the fact, and (if you missed) what you said. */
function PhoneResult({ drop, result }: { drop: Drop; result: DropResult }) {
  return (
    <div role="status">
      <p className="font-display text-[26px] leading-tight font-semibold tracking-[-0.03em]">
        {result.correct ? (
          <>
            Right<span className="text-coral">.</span> <span className="text-coral-deep">+{dropPoints(result)}</span>
          </>
        ) : result.guess ? (
          "Not this time."
        ) : (
          "Here's where it goes."
        )}
      </p>
      <p className="mt-1 text-[15px] leading-snug text-ink-soft">{factLine(drop)}</p>
      {result.guess && !result.correct && (
        <p className="mt-2 text-sm text-ink-faint">
          You said <span className="font-semibold text-coral-deep">{result.guess}</span>.
        </p>
      )}
    </div>
  );
}

/**
 * First time only: the idea in two lines, under the top bar. It stays until the
 * first Lock in (or Let it flow), and the sea buttons start below it.
 */
function IntroBubble({ onDismiss, bubbleRef }: { onDismiss: () => void; bubbleRef: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={bubbleRef}
      role="note"
      className="absolute top-[104px] right-3 left-3 z-10 flex items-start gap-3 rounded-2xl bg-white/95 p-3.5 text-[14px] leading-snug shadow-card"
    >
      <p className="flex-1 text-ink-soft">
        <span className="font-semibold text-ink">Where does this rain end up?</span> Pick a sea on the map, then Lock in.
        Now it&apos;s worth 4 points; each stop of Let it flow costs 1.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Got it, hide this tip"
        className="-m-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:text-coral-deep"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}

function PhonePlay(p: Props) {
  const [barRef, barHeight] = useHeight<HTMLElement>();
  const [rootRef, root] = useSize<HTMLDivElement>();
  const [onCamera, spots] = useSeaSpots(p.drop.seaLabels);
  const [picked, setPick] = usePick(p.game);
  const [seasHidden, setSeasHidden] = useState(false);
  const [bubbleRef, bubble] = useSize<HTMLDivElement>();
  const guessing = !p.result;
  const intro = p.firstTime && p.game.drop === 0 && guessing;

  return (
    <div ref={rootRef} className="font-sans relative h-svh overflow-hidden bg-land text-ink">
      <h1 className="sr-only">
        Downstream {p.preview ? "preview" : "No."} {p.number}, drop {p.game.drop + 1} of {p.puzzle.drops.length}
      </h1>
      {/* The top bar comes first in the markup (and tab order); it floats over the map. */}
      <MapTopBar number={p.number} preview={p.preview} />
      {/* While guessing the map never letters the option seas itself: the buttons do, or nothing (hidden). */}
      <RouteMap {...p.map} hideOptionLabels={guessing} onCamera={onCamera} padding={MAP_PADDING} className="h-full w-full" />
      {intro && <IntroBubble onDismiss={p.onDismissIntro} bubbleRef={bubbleRef} />}
      <DropAnnouncer drop={p.drop} stage={p.game.stage} decided={!guessing} />

      {guessing && !seasHidden && (
        <SeaButtons
          spots={spots}
          width={root.width}
          // Below the top bar and Hide seas, or below the first-time tip while it shows.
          top={intro ? 104 + bubble.height + 26 : 118}
          bottom={root.height - barHeight - 34}
          picked={picked}
          onPick={setPick}
        />
      )}
      {guessing && (
        // Up top, out of the thumb's resting spot (it clears a pick), under the back link.
        <HideSeasToggle
          hidden={seasHidden}
          onToggle={() => {
            setSeasHidden((h) => !h);
            setPick(null);
          }}
          className="absolute top-[62px] left-3"
        />
      )}

      <section
        ref={barRef}
        className="absolute inset-x-0 bottom-0 z-10 rounded-t-[26px] bg-card px-4 pt-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+20px))] shadow-[0_-12px_40px_-16px_rgb(18_26_43/0.35)]"
      >
        <div className="flex items-center justify-between gap-3">
          <DropTokens puzzle={p.puzzle} game={p.game} />
          {p.result ? (
            <span className="text-sm font-semibold text-ink-faint">
              Drop {p.game.drop + 1} of {p.puzzle.drops.length}
            </span>
          ) : (
            <PointsChip stage={p.game.stage} />
          )}
        </div>
        <div className="mt-3.5">
          {p.result ? (
            <div className="flex flex-col gap-4">
              <PhoneResult drop={p.drop} result={p.result} />
              <NextButton last={p.game.drop + 1 >= p.puzzle.drops.length} onNext={p.onNext} />
            </div>
          ) : picked ? (
            <div key={picked} className="rise-in flex flex-col gap-2.5" role="group" aria-label="Lock in your answer" aria-live="polite">
              <p className="text-center text-[15px] text-ink-soft">
                Lock in <span className="font-semibold text-ink">{picked}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setPick(null);
                  }}
                  className="h-12 rounded-full bg-white px-5 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
                >
                  Change
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setPick(null);
                    p.onGuess(picked);
                  }}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-coral text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale,translate] duration-200 hover:bg-coral-deep active:scale-[0.98]"
                >
                  Lock in
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                  </svg>
                </button>
              </div>
              {/* Not sure yet? Watch more of the route; the pick stays. */}
              {p.game.stage < p.drop.stages.length && (
                <button
                  type="button"
                  onClick={p.onFlow}
                  className="mx-auto -mb-1 flex min-h-11 items-center gap-1.5 px-3 text-[14px] font-semibold text-ink-soft transition-colors hover:text-ink"
                >
                  Not sure? Let it flow first
                  <span className="text-ink-faint">· stop {p.game.stage + 1} of {p.drop.stages.length}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rise-in flex flex-col gap-2.5">
              <p className="text-center text-[15px] text-ink-soft">
                {seasHidden ? (
                  <>
                    <span className="font-semibold text-ink">Show seas</span> to pick one.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-ink">Pick the sea</span> this raindrop reaches.
                  </>
                )}
              </p>
              <FlowButton stage={p.game.stage} stops={p.drop.stages.length} onFlow={p.onFlow} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * The day's results scroll like a page (it's reading, not playing). The map up
 * top replays whichever drop is picked in the list, starting with the day's
 * biggest surprise; it stays in view while the list scrolls.
 */
function PhoneSummary(p: Props): ReactNode {
  return (
    <div className="font-sans flex flex-col bg-land text-ink">
      <h1 className="sr-only">
        Downstream {p.preview ? "preview" : "No."} {p.number}: today&apos;s results
      </h1>
      <div className="sticky top-0 h-[34svh] min-h-[230px]">
        <MapTopBar number={p.number} preview={p.preview} />
        <RouteMap {...p.map} padding={{ top: 84, bottom: 48, left: 40, right: 40 }} className="h-full w-full" />
      </div>
      <section className="relative z-10 -mt-6 rounded-t-[26px] bg-card px-5 pt-6 pb-16 shadow-card">
        <DaySummary number={p.number} puzzle={p.puzzle} game={p.game} preview={p.preview} viewing={p.viewing} onView={p.onView} />
      </section>
    </div>
  );
}
