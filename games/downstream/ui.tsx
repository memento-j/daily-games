"use client";

// Building blocks shared by every layout of the Downstream game screen, in the
// site's design system (DESIGN.md): coral for the raindrop and the player's
// actions, drop-blue for water (the sea the drop really reaches), white cards.

import Link from "next/link";
import { useSyncExternalStore } from "react";
import Countdown from "@/components/Countdown";
import ShareButton from "@/components/ShareButton";
import YesterdayLink from "@/components/YesterdayLink";
import Loading from "@/components/Loading";
import ThemeToggle from "@/components/ThemeToggle";
import { shareText } from "@/lib/share";
import { useShareCard } from "@/lib/shareCard";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getSetting, setSetting, subscribe } from "@/lib/storage";
import { useTodayResult as useSliceToday } from "@/games/slice/useTodayResult";
import type { GameState } from "./game";
import { GAME_KEY, PREVIEW_KEY, storageKeyFor } from "./schedule";
import { dropEmoji, dropPoints, EMOJI_LEGEND, maxPoints, POINTS_BY_STAGE, totalPoints, type DropResult } from "./scoring";
import { drawDownstreamCard } from "./shareCard";
import { isMuted, setMuted, sound } from "./sound";
import { describeStart, describeStop } from "./describe";
import type { Drop, Puzzle } from "./types";
import type { Load } from "./useDownstreamGame";
import { useStats } from "./useTodayResult";


/** The small top bar: back to the list of games, and which puzzle this is. */
export function GameTopBar({ number, preview }: { number: number | null; preview: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href="/"
        aria-label={`Downstream: back to ${SITE_NAME}`}
        className="group flex items-center gap-1.5 rounded-full bg-card py-1.5 pr-3.5 pl-2.5 text-xs font-semibold shadow-card transition-colors hover:text-coral-deep"
      >
        <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true">
          <path d="M16 10H5M9 5.5 4.5 10 9 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* One text run, so the flex gap doesn't separate the full stop from the name. */}
        <span>
          Downstream<span className="text-coral">.</span>
        </span>
      </Link>
      <span className="flex items-center gap-2">
        <ThemeToggle />
        {number !== null && (
          <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-card">
            {preview ? "Yesterday · No." : "No."} {number}
          </span>
        )}
      </span>
    </div>
  );
}

/** Sound on/off, remembered between visits. Big and obvious, pinned to the map's corner. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) sound.tap(); // turning sound on confirms itself
      }}
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      className={`grid size-12 place-items-center rounded-full bg-card shadow-card transition-[color,scale,translate] duration-200 hover:scale-105 active:scale-95 ${muted ? "text-ink-faint" : "text-coral-deep"} ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5h-3Z" fill="currentColor" stroke="none" />
        {muted ? <path d="m13.5 7.5 5 5m0-5-5 5" /> : <path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.8 5a7 7 0 0 1 0 10" />}
      </svg>
    </button>
  );
}

/**
 * The day's five drops as tokens: the current one ringed, the ones to come
 * numbered, and decided ones showing "+4" (points), a cross (wrong) or a dash
 * (no guess). Points carry a "+" so they never read as a drop number.
 */
export function DropTokens({ puzzle, game }: { puzzle: Puzzle; game: GameState }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Drop ${Math.min(game.drop + 1, puzzle.drops.length)} of ${puzzle.drops.length}`}>
      {puzzle.drops.map((_, i) => {
        const r = game.results[i];
        const current = i === game.drop && !r;
        const cls = r
          ? r.correct
            ? "bg-coral text-ink" // ink on coral is 5.1:1; white would only pass at large sizes
            : r.guess
              ? "bg-coral-soft text-coral-deep"
              : "bg-ink/8 text-ink-faint"
          : current
            ? "bg-card text-coral-deep ring-2 ring-coral"
            : "bg-card text-ink-faint ring-1 ring-line";
        const label = r
          ? r.correct
            ? `Drop ${i + 1}: ${dropPoints(r)} points`
            : r.guess
              ? `Drop ${i + 1}: wrong`
              : `Drop ${i + 1}: no guess`
          : current
            ? `Drop ${i + 1}: now`
            : `Drop ${i + 1}: to come`;
        return (
          <li key={i} className={`grid size-7 place-items-center rounded-full text-[12px] font-bold ${cls}`}>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" className="contents">
              {r ? (
                r.correct ? (
                  `+${dropPoints(r)}`
                ) : r.guess ? (
                  <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="m6 6 8 8M14 6l-8 8" />
                  </svg>
                ) : (
                  "–"
                )
              ) : (
                i + 1
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Where the Lock in button goes. Before a pick it's a quiet placeholder of the
 * same size, so picking a sea never moves the buttons under the cursor.
 */
export function LockInSlot({ picked, points, onLock }: { picked: string | null; points: number; onLock: (name: string) => void }) {
  return picked ? (
    <LockInButton key={picked} name={picked} points={points} onLock={() => onLock(picked)} />
  ) : (
    <p className="flex h-14 items-center justify-center rounded-full border border-dashed border-ink/20 text-[15px] font-semibold text-ink-faint">
      Pick a sea on the map
    </p>
  );
}

/** A decided drop, compactly: the sea reached (water-blue) and, if it differs, your pick. */
export function ResultSeas({ drop, result }: { drop: Drop; result: DropResult }) {
  return (
    <dl className="flex flex-col gap-2 text-[15px]">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-drop px-4 py-3 text-white">
        <dt className="text-xs font-bold tracking-wide uppercase opacity-85">Reached</dt>
        <dd className="font-semibold">{drop.answer}</dd>
      </div>
      {result.guess && !result.correct && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-coral-soft px-4 py-3 text-coral-deep">
          <dt className="text-xs font-bold tracking-wide uppercase">Your pick</dt>
          <dd className="font-semibold">{result.guess}</dd>
        </div>
      )}
    </dl>
  );
}

/**
 * Says what the map shows, for screen-reader players: at a new drop where each
 * sea lies from the pin; at each stop how far the water has come and which way.
 */
export function DropAnnouncer({ drop, stage, decided }: { drop: Drop; stage: number; decided: boolean }) {
  const text = decided ? "" : stage === 0 ? describeStart(drop) : describeStop(drop, drop.stages[stage - 1]);
  return (
    <p className="sr-only" aria-live="polite">
      {text}
    </p>
  );
}

/** Confirms the picked sea: the guess only counts once it's locked in. */
export function LockInButton({ name, points, onLock }: { name: string; points: number; onLock: () => void }) {
  return (
    <button
      type="button"
      onClick={onLock}
      className="rise-in group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral px-5 text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale] duration-200 hover:bg-coral-strong active:scale-[0.98]"
    >
      <span className="truncate">Lock in {name}</span>
      <span className="shrink-0 font-semibold text-white/80">· {points} pt{points === 1 ? "" : "s"}</span>
      <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4.5 10.5 3.5 3.5 7.5-8" />
      </svg>
    </button>
  );
}

/** "Let it flow" (secondary action), or the give-up at the end. */
export function FlowButton({ stage, stops, onFlow }: { stage: number; stops: number; onFlow: () => void }) {
  const last = stage >= stops;
  return (
    <button
      type="button"
      onClick={onFlow}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-card text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-[box-shadow,scale,translate] duration-200 hover:ring-ink/35 active:scale-[0.99]"
    >
      {last ? "Show me where it goes" : "Let it flow"}
      <span className="text-ink-faint">{last ? "· no points" : `· stop ${stage + 1} of ${stops}`}</span>
      {!last && (
        <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-200 group-hover:translate-y-0.5" aria-hidden="true">
          <path d="M10 4v11M5.5 11 10 15.5 14.5 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/** The one coral action on a result: next drop, or the day's results. */
export function NextButton({ last, onNext }: { last: boolean; onNext: () => void }) {
  return (
    <button
      type="button"
      onClick={onNext}
      autoFocus
      className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale,translate] duration-200 hover:bg-coral-strong active:scale-[0.98]"
    >
      {last ? "See today's results" : "Next drop"}
      <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
        <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** What happened to this drop, in one heading and the fact line. */
export function ResultText({ drop, result }: { drop: Drop; result: DropResult }) {
  return (
    <div role="status">
      <p className="font-display text-[30px] leading-tight font-semibold tracking-[-0.03em]">
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
      <p className="mt-1 text-[16px] leading-snug text-ink-soft">{factLine(drop)}</p>
    </div>
  );
}

/** "the Atlantic Ocean", but "Hudson Bay" (as the pipeline writes it). */
const withArticle = (sea: string) => (sea.endsWith(" Bay") ? sea : `the ${sea}`);

/**
 * The surprise is the payoff: when the obvious guess (the sea nearest the pin)
 * isn't where the water goes, lead with that. Otherwise the plain fact.
 */
export function factLine(drop: Drop): string {
  if (drop.nearestSea && drop.nearestSea !== drop.answer) {
    return `${withArticle(drop.nearestSea).replace(/^the /, "The ")} is the nearest sea, but this water travels ${drop.distanceKm.toLocaleString()} km to ${withArticle(drop.answer)}.`;
  }
  return drop.fact;
}

/** Shown once, on a player's very first drop: how a round works, in one breath. */
export function FirstTimeHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div role="note" className="rounded-2xl bg-coral-soft/70 p-4 text-[15px] leading-snug text-ink">
      <p className="font-semibold">First time? Here&apos;s the idea.</p>
      <p className="mt-1 text-ink-soft">
        Rain falls on the coral pin. Pick the sea you think it reaches on the map, then{" "}
        <span className="font-semibold text-ink">Lock in</span>. Right now it&apos;s worth 4 points; each stop of{" "}
        <span className="font-semibold text-ink">Let it flow</span> shows more of the route and costs 1. One answer per drop.
      </p>
      <button type="button" onClick={onDismiss} className="mt-2 text-sm font-semibold text-coral-deep underline">
        Got it
      </button>
    </div>
  );
}

const INTRO_SETTING = "introSeen";
/** Whether the first-time hint should show (hidden during the build and hydration). */
export function useFirstTime(): [boolean, () => void] {
  const seen = useSyncExternalStore(subscribe, () => getSetting("downstream", INTRO_SETTING, false), () => true);
  return [
    !seen,
    () => {
      if (getSetting("downstream", INTRO_SETTING, false)) return;
      setSetting("downstream", INTRO_SETTING, true);
    },
  ];
}

/**
 * The day's results. The routes lead: each drop is a row that replays its route
 * on the map (it opens on the day's biggest surprise). Then the share line,
 * exactly as it will be sent, with what the squares mean; then streak and stats.
 */
export function DaySummary({
  number,
  puzzle,
  game,
  preview,
  viewing,
  onView,
}: {
  number: number;
  puzzle: Puzzle;
  game: GameState;
  preview: boolean;
  /** The drop whose route the map is showing, and how to show another. */
  viewing?: number;
  onView?: (drop: number) => void;
}) {
  const points = totalPoints(game.results);
  const max = maxPoints(puzzle.drops.length);
  const stats = useStats(storageKeyFor(preview), number);
  const marks = game.results.map(dropEmoji).join("");
  const text = shareText({
    game: "Downstream",
    number,
    marks: game.results.map(dropEmoji),
    points,
    maxPoints: max,
    url: `${SITE_URL}/downstream/`, // always the real address, whichever copy of the site is open
  });
  // The picture: each drop filled as far as it scored.
  const drops = game.results.map((r) => ({ points: dropPoints(r), max: POINTS_BY_STAGE[0], guessed: r.guess !== null }));
  const card = useShareCard(JSON.stringify([number, drops]), `downstream-${number}.png`, (ctx, f) => drawDownstreamCard(ctx, f, number, drops, points, max));
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
          Done for today<span className="text-coral">.</span>
        </h2>
        <p className="font-display mt-2 text-[56px] leading-none font-semibold tracking-[-0.04em]">
          {points}
          <span className="text-[28px] text-ink-faint"> / {max}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <ShareButton
          game="downstream"
          number={number}
          preview={preview}
          text={text}
          card={card}
          onTap={sound.tap}
          caption={
            <>
              Shares as <span className="font-semibold text-ink" aria-hidden="true">{marks}</span>
              <span className="sr-only">your five squares and</span> {points}/{max}, never the answers.
            </>
          }
        />
        <p className="text-center text-xs text-ink-faint" aria-hidden="true">
          {EMOJI_LEGEND.map(([e, meaning]) => `${e} ${meaning}`).join("  ·  ")}
        </p>
      </div>
      {/* One more of this game first, then the other game. (Hidden when both have nothing to offer.) */}
      <div className="flex flex-col gap-2.5 empty:hidden">
        {!preview && <YesterdayLink path="/downstream/" storageKeys={[GAME_KEY, PREVIEW_KEY]} teaser="Yesterday's raindrops are still looking for the sea." maxPoints={maxPoints(5)} />}
        <TrySlice />
      </div>

      <div>
        <p className="text-sm font-semibold text-ink-soft">{onView ? "Your drops · pick one to see its route" : "Your drops"}</p>
        <ol className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card ring-1 ring-line">
          {puzzle.drops.map((drop, i) => {
            const r = game.results[i];
            const on = viewing === i;
            const body = (
              <>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${on ? "bg-drop text-white" : "bg-ink/6 text-ink-soft"}`}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{drop.answer}</span>
                  <span className="block text-sm text-ink-faint">
                    {drop.distanceKm.toLocaleString()} km
                    {r?.correct
                      ? r.stage === 0
                        ? " · called before it flowed"
                        : ` · called at stop ${r.stage}`
                      : r?.guess
                        ? ` · you said ${r.guess}`
                        : r
                          ? " · no guess"
                          : ""}
                  </span>
                </span>
                <span className={`text-sm font-bold ${r?.correct ? "text-coral-deep" : "text-ink-faint"}`}>{r?.correct ? `+${dropPoints(r)}` : "0"}</span>
              </>
            );
            return (
              <li key={i}>
                {onView ? (
                  <button
                    type="button"
                    onClick={() => onView(i)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition-colors ${on ? "bg-shore" : "hover:bg-land"}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 text-[15px]">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Streak", stats?.currentStreak],
          ["Best", stats?.bestStreak],
          ["Played", stats?.played],
          ["Avg points", stats?.averagePoints ?? "–"],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl bg-card px-1 py-3 ring-1 ring-line">
            {/* Label first in the markup (dt before dd); shown below the number. */}
            <div className="flex flex-col-reverse">
              <dt className="mt-1 text-xs font-semibold text-ink-faint">{label}</dt>
              <dd className="font-display text-[24px] leading-none font-semibold tracking-[-0.02em]">{value ?? "\u00a0"}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="-mt-2 text-xs text-ink-faint">Miss a day and your streak survives, once a week.</p>

      <p className="font-display text-[20px] font-semibold tracking-[-0.02em]">
        <Countdown />
      </p>
    </div>
  );
}

/** Done with Downstream: point to today's Slice, unless it's already been played today.
 *  In Slice's own look: a paper slab on the cutting mat, with the coral dashed cut. */
function TrySlice() {
  const today = useSliceToday();
  if (!today || today.result) return null; // still reading storage, or Slice is done
  return (
    <Link href="/slice/" className="group flex items-center gap-3 rounded-2xl bg-mat p-3 ring-1 ring-slab-side/30 transition-shadow hover:ring-slab-side/70">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <path d="M6 9.5 14 5l12 4.5-1.5 11L17 27 6.5 22.5Z" transform="translate(0 1.6)" fill="var(--color-slab-side)" />
        <path d="M6 9.5 14 5l12 4.5-1.5 11L17 27 6.5 22.5Z" fill="var(--color-slab)" />
        <path d="M3.5 19.5 28.5 10" fill="none" stroke="var(--color-coral)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2.6" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Next: today&apos;s Slice</span>
        <span className="block text-xs text-ink-soft">One straight line to cut a country&apos;s population in half. Harder than it looks.</span>
      </span>
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
        <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/** Loading, not launched yet, and no puzzle file: a calm card on the land ground. */
export function GameNotice({ load, preview }: { load: Exclude<Load, { status: "ready" }>; preview: boolean }) {
  // Loading is the shared loading state, like the page before it and the map after it.
  if (load.status === "loading") return <Loading label="Finding today's drops…" className="min-h-svh bg-land" />;
  return (
    <div className="font-sans grid min-h-svh place-items-center bg-land px-5 text-ink">
      <div className="w-full max-w-[460px] rounded-[30px] bg-card p-8 shadow-card">
        <GameTopBar number={null} preview={preview} />
        <div className="mt-8" role="status">
          {load.status === "comingSoon" && (
            <>
              {/* A ?puzzle= number other than today's or yesterday's. */}
              <p className="font-display text-3xl font-semibold tracking-[-0.03em]">That puzzle isn&apos;t available<span className="text-coral">.</span></p>
              <p className="mt-2 text-ink-soft">Only today&apos;s and yesterday&apos;s puzzles can be played.</p>
              <a href="/downstream/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-deep">
                Play today&apos;s puzzle
                <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
                  <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </>
          )}
          {load.status === "missing" && (
            <>
              <p className="font-display text-3xl font-semibold tracking-[-0.03em]">New drops are on their way<span className="text-coral">.</span></p>
              <p className="mt-2 text-ink-soft">There&apos;s no puzzle here yet. Check back soon.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

