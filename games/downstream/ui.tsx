"use client";

// Building blocks shared by every layout of the Downstream game screen, in the
// site's design system (DESIGN.md): coral for the raindrop and the player's
// actions, drop-blue for water (the sea the drop really reaches), white cards.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import Countdown from "@/components/Countdown";
import { padPuzzleNumber } from "@/lib/daily";
import { shareResult, shareText } from "@/lib/share";
import { getSetting, setSetting, subscribe } from "@/lib/storage";
import { useToday } from "@/lib/useToday";
import type { GameState } from "./game";
import { storageKeyFor } from "./schedule";
import { dropEmoji, dropPoints, maxPoints, totalPoints, type DropResult } from "./scoring";
import { isMuted, setMuted, sound } from "./sound";
import type { Drop, Puzzle } from "./types";
import type { Load } from "./useDownstreamGame";
import { useStats } from "./useTodayResult";

const MAX_PREVIEWS = 60;

/** The small top bar: back to Downstream's front page, and which puzzle this is. */
export function GameTopBar({ number, preview }: { number: number | null; preview: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href="/downstream/"
        className="group flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3.5 pl-2.5 text-xs font-semibold shadow-card transition-colors hover:text-coral-deep"
      >
        <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true">
          <path d="M16 10H5M9 5.5 4.5 10 9 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Downstream<span className="text-coral">.</span>
      </Link>
      {number !== null && (
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-card">
          {preview ? "Preview" : "No."} {number}
        </span>
      )}
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
      className={`grid size-12 place-items-center rounded-full bg-white shadow-card transition-[color,scale,translate] duration-200 hover:scale-105 active:scale-95 ${muted ? "text-ink-faint" : "text-coral-deep"} ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5h-3Z" fill="currentColor" stroke="none" />
        {muted ? <path d="m13.5 7.5 5 5m0-5-5 5" /> : <path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.8 5a7 7 0 0 1 0 10" />}
      </svg>
    </button>
  );
}

/** The day's five drops as tokens: points scored, a miss, the current one, the ones to come. */
export function DropTokens({ puzzle, game }: { puzzle: Puzzle; game: GameState }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Drop ${Math.min(game.drop + 1, puzzle.drops.length)} of ${puzzle.drops.length}`}>
      {puzzle.drops.map((_, i) => {
        const r = game.results[i];
        const current = i === game.drop && !r;
        const cls = r
          ? r.correct
            ? "bg-coral text-ink" // ink on coral is 5.1:1; white would only pass at large sizes
            : "bg-ink/8 text-ink-faint"
          : current
            ? "bg-white text-coral-deep ring-2 ring-coral"
            : "bg-white text-ink-faint ring-1 ring-line";
        return (
          <li key={i} className={`grid size-7 place-items-center rounded-full text-[12px] font-bold ${cls}`}>
            {r ? (r.correct ? dropPoints(r) : "–") : i + 1}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The four seas. While guessing they're plain white tiles, and the one picked
 * (here or on the map) lights up coral until it's locked in; once the drop is
 * decided, the sea it really reaches turns water-blue and a wrong pick turns coral-soft.
 */
export function SeaOptions({
  drop,
  result,
  picked,
  onGuess,
  columns = 2,
}: {
  drop: Drop;
  result?: DropResult;
  /** The sea picked but not locked in yet. */
  picked?: string | null;
  onGuess: (option: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {drop.options.map((option) => {
        const isAnswer = option === drop.answer;
        const guessed = result?.guess === option;
        const state = !result ? (option === picked ? "picked" : "open") : isAnswer ? "answer" : guessed ? "wrong" : "other";
        const cls = {
          picked: "bg-coral text-white ring-2 ring-coral shadow-[0_8px_20px_-10px_rgb(217_61_70/0.8)]",
          open: "bg-white text-ink ring-1 ring-line hover:ring-2 hover:ring-coral hover:-translate-y-px active:translate-y-0 shadow-[0_2px_6px_-2px_rgb(18_26_43/0.12)]",
          answer: "bg-drop text-white ring-1 ring-drop",
          wrong: "bg-coral-soft text-coral-deep ring-1 ring-coral/40",
          other: "bg-white/60 text-ink-faint ring-1 ring-line",
        }[state];
        return (
          <button
            key={option}
            type="button"
            disabled={!!result}
            aria-pressed={result ? undefined : option === picked}
            onClick={() => onGuess(option)}
            className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left text-[16px] leading-tight font-semibold transition-[scale,translate,box-shadow,background-color] duration-200 ease-out disabled:cursor-default ${cls}`}
          >
            <span>{option}</span>
            {state === "answer" && <span className="text-xs font-bold tracking-wide uppercase">Reached</span>}
            {state === "wrong" && <span className="text-xs font-bold tracking-wide uppercase">Your pick</span>}
            {state === "picked" && <span className="text-xs font-bold tracking-wide uppercase">Picked</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Confirms the picked sea: the guess only counts once it's locked in. */
export function LockInButton({ name, points, onLock }: { name: string; points: number; onLock: () => void }) {
  return (
    <button
      type="button"
      onClick={onLock}
      className="rise-in group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral px-5 text-[17px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale] duration-200 hover:bg-coral-deep active:scale-[0.98]"
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
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-[box-shadow,scale,translate] duration-200 hover:ring-ink/35 active:scale-[0.99]"
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
      className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale,translate] duration-200 hover:bg-coral-deep active:scale-[0.98]"
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
        Rain falls on the coral pin. Guess the sea it ends up in right away for 4 points, or tap{" "}
        <span className="font-semibold text-ink">Let it flow</span> to watch the water move, for fewer points. One guess
        per drop.
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
  return [!seen, () => setSetting("downstream", INTRO_SETTING, true)];
}

/** Share the day's result: the system share sheet on phones, the clipboard elsewhere. */
export function ShareButton({
  number,
  preview,
  results,
  maxPointsTotal,
  primary = true,
}: {
  number: number;
  preview: boolean;
  results: DropResult[];
  maxPointsTotal: number;
  primary?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share() {
    sound.tap();
    const text = shareText({
      game: "Downstream",
      number,
      preview,
      marks: results.map(dropEmoji),
      points: totalPoints(results),
      maxPoints: maxPointsTotal,
      url: `${location.origin}/downstream/`,
    });
    const outcome = await shareResult(text);
    if (outcome !== "shared") {
      setState(outcome);
      window.setTimeout(() => setState("idle"), 2200);
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className={
        primary
          ? "group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale,translate] duration-200 hover:bg-coral-deep active:scale-[0.98]"
          : "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
      }
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7M4 11v4.5h12V11" />
      </svg>
      <span aria-live="polite">{state === "copied" ? "Copied. Paste it anywhere" : state === "failed" ? "Couldn't copy" : "Share your result"}</span>
    </button>
  );
}

/** The day's results: score and share first, then streak and stats, the countdown, and each drop. */
export function DaySummary({ number, puzzle, game, preview }: { number: number; puzzle: Puzzle; game: GameState; preview: boolean }) {
  const points = totalPoints(game.results);
  const max = maxPoints(puzzle.drops.length);
  const stats = useStats(storageKeyFor(preview), number);
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
      <DropTokens puzzle={puzzle} game={game} />
      <ShareButton number={number} preview={preview} results={game.results} maxPointsTotal={max} />

      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Streak", stats?.currentStreak],
          ["Best", stats?.bestStreak],
          ["Played", stats?.played],
          ["Average", stats?.averagePoints ?? "–"],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl bg-white px-1 py-3 ring-1 ring-line">
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

      <ol className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
        {puzzle.drops.map((drop, i) => {
          const r = game.results[i];
          return (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
              <span>
                <span className="font-semibold">{drop.answer}</span>
                {r?.guess && !r.correct && <span className="block text-sm text-ink-faint">You said {r.guess}</span>}
                {r && !r.guess && <span className="block text-sm text-ink-faint">No guess</span>}
              </span>
              <span className={`text-sm font-bold ${r?.correct ? "text-coral-deep" : "text-ink-faint"}`}>
                {r?.correct ? `+${dropPoints(r)}` : "0"}
              </span>
            </li>
          );
        })}
      </ol>
      {preview && <PreviewList />}
    </div>
  );
}

/** Loading, not launched yet, and no puzzle file: a calm card on the land ground. */
export function GameNotice({ load, preview }: { load: Exclude<Load, { status: "ready" }>; preview: boolean }) {
  const today = useToday();
  return (
    <div className="font-sans grid min-h-svh place-items-center bg-land px-5 text-ink">
      <div className="w-full max-w-[460px] rounded-[30px] bg-card p-8 shadow-card">
        <GameTopBar number={null} preview={preview} />
        <div className="mt-8" role="status">
          {load.status === "loading" && <p className="font-display text-3xl font-semibold tracking-[-0.03em]">Finding today&apos;s drops…</p>}
          {load.status === "comingSoon" && (
            <>
              <p className="font-display text-3xl font-semibold tracking-[-0.03em]">Downstream launches soon<span className="text-coral">.</span></p>
              <p className="mt-2 text-ink-soft">{today ? `The first drops land on ${today.launch}.` : " "}</p>
              <div className="mt-6">
                <PreviewList />
              </div>
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

/** Before launch: links to every generated puzzle, for playtesting. Links keep the current layout. */
export function PreviewList() {
  const [available, setAvailable] = useState<number[] | null>(null);
  const base = usePathname(); // previews open in whichever layout you are on

  // Find which puzzle files exist by checking 0001, 0002, ... until one is missing.
  useEffect(() => {
    // Abort on leave, so a half-finished probe doesn't keep requesting files.
    const controller = new AbortController();
    async function probe() {
      const found: number[] = [];
      for (let n = 1; n <= MAX_PREVIEWS; n++) {
        const res = await fetch(`/data/downstream/${padPuzzleNumber(n)}.json`, { method: "HEAD", signal: controller.signal }).catch(() => null);
        if (controller.signal.aborted) return;
        if (!res?.ok) break;
        found.push(n);
      }
      setAvailable(found);
    }
    probe();
    return () => controller.abort();
  }, []);

  if (!available) return null;
  if (available.length === 0) return <p className="text-ink-soft">No preview puzzles yet.</p>;
  return (
    <div>
      <p className="text-sm font-semibold text-ink-faint">Play a preview</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {available.map((n) => (
          <Link
            key={n}
            href={`${base}?puzzle=${n}`}
            className="grid size-10 place-items-center rounded-full bg-white text-sm font-bold ring-1 ring-line transition-colors hover:text-coral-deep hover:ring-coral"
          >
            {n}
          </Link>
        ))}
      </div>
    </div>
  );
}
