"use client";

// The Slice game screen (/slice): the instruction, the board, Confirm, then the
// result and Next; after the last round, the day's summary. A prototype layout
// (build order: playable first, designed after the playtest).
//
// Game rules and loading live in games/slice (useSliceGame); this file only decides
// how it looks.

import Link from "next/link";
import { useEffect, useState } from "react";
import Countdown from "@/components/Countdown";
import { shareResult, shareText } from "@/lib/share";
import { GAME_NAME } from "@/games/slice/config";
import { crosses, perfectLine } from "@/games/slice/cut";
import { lineThrough } from "@/games/slice/geometry";
import type { SavedCut } from "@/games/slice/game";
import { storageKeyFor } from "@/games/slice/schedule";
import { cutEmoji, EMOJI_LEGEND, maxPoints, totalPoints } from "@/games/slice/scoring";
import SliceBoard, { type Draft } from "@/games/slice/SliceBoard";
import type { Puzzle, Round } from "@/games/slice/types";
import { useSliceGame, type Load } from "@/games/slice/useSliceGame";
import { useStats } from "@/games/slice/useTodayResult";
import { capitalise, instruction, resultLine } from "@/games/slice/words";

const TIER_WORDS = ["Spot on", "Close", "Not bad", "Way off"];

export default function SliceGame() {
  const g = useSliceGame();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewing, setViewing] = useState(0); // the summary's selected round

  if (g.load.status !== "ready") return <Notice load={g.load} />;
  const { number, puzzle, preview } = g.load;

  if (g.phase === "finished") {
    return (
      <Screen number={number} preview={preview}>
        <Summary number={number} preview={preview} puzzle={puzzle} cuts={g.game.cuts} viewing={viewing} onView={setViewing} />
      </Screen>
    );
  }

  const round = puzzle.rounds[g.game.round];
  const cut = g.phase === "result" ? g.game.cuts[g.game.round] : null;
  const last = g.game.round + 1 >= puzzle.rounds.length;

  function confirm() {
    const line = draft && lineThrough(draft[0], draft[1]);
    if (!line) return;
    if (!crosses(round, line)) {
      setMessage(`That line doesn't cross ${round.country}. Draw one that cuts through it.`);
      return;
    }
    setMessage(null);
    setDraft(null);
    g.act({ type: "cut", line });
  }

  function next() {
    setDraft(null);
    g.act({ type: "next" });
  }

  return (
    <Screen number={number} preview={preview}>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-semibold">
          Round {g.game.round + 1} <span className="text-ink-faint">of {puzzle.rounds.length}</span>
        </p>
        <p className="text-lg tracking-[0.15em]" aria-label={`${g.game.cuts.length} rounds done`}>
          {puzzle.rounds.map((_, i) => (g.game.cuts[i] ? cutEmoji(g.game.cuts[i]) : "⬜")).join("")}
        </p>
      </div>
      <h1 className="font-display mt-3 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-balance">{instruction(round)}</h1>

      <div className="mt-4 rounded-3xl bg-card p-3 shadow-card">
        <SliceBoard
          round={round}
          draft={cut ? null : draft}
          onDraft={
            cut
              ? undefined
              : (d) => {
                  setMessage(null);
                  setDraft(d);
                }
          }
          reveal={cut ? { line: cut.line, perfect: perfectLine(round, cut.line) } : null}
          className="block h-[min(58svh,88vw)] w-full"
        />
      </div>

      {cut ? (
        <RoundResult round={round} cut={cut} last={last} onNext={next} />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <p className={`min-h-[2.75rem] text-[15px] ${message ? "font-semibold text-coral-deep" : "text-ink-soft"}`} aria-live="polite">
            {message ?? (draft ? "Drag the ends to adjust, then confirm." : "Drag across the map to draw a straight cut.")}
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={!draft}
            className="h-14 rounded-full bg-coral text-[19px] font-bold text-white transition-colors hover:bg-coral-deep disabled:bg-ink/15 disabled:text-ink-faint"
          >
            Confirm cut
          </button>
        </div>
      )}
    </Screen>
  );
}

function RoundResult({ round, cut, last, onNext }: { round: Round; cut: SavedCut; last: boolean; onNext: () => void }) {
  const area = round.mode === "area";
  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-[19px] font-semibold">
        <span aria-hidden="true">{cutEmoji(cut)}</span> {TIER_WORDS[cut.tier]}. {resultLine(cut.share, round.target)}
      </p>
      <p className="text-[15px] text-ink-soft">{round.fact}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-5 rounded bg-coral" /> Your cut
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-5 border-t-[2.5px] border-dashed border-ink" /> Perfect cut at your angle
        </span>
        {!area && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-coral/40" /> Where people live
          </span>
        )}
      </p>
      <button type="button" onClick={onNext} className="mt-1 h-14 rounded-full bg-ink text-[19px] font-bold text-white transition-colors hover:bg-ink-soft">
        {last ? "See your results" : "Next round"}
      </button>
    </div>
  );
}

function Summary({
  number,
  preview,
  puzzle,
  cuts,
  viewing,
  onView,
}: {
  number: number;
  preview: boolean;
  puzzle: Puzzle;
  cuts: SavedCut[];
  viewing: number;
  onView: (i: number) => void;
}) {
  const stats = useStats(storageKeyFor(preview), number);
  const marks = cuts.map(cutEmoji);
  const round = puzzle.rounds[viewing];
  const cut = cuts[viewing];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em]">Today&apos;s slices</h1>
        <p className="mt-1 text-[32px] tracking-[0.12em]" aria-label="Your squares">
          {marks.join("")}
        </p>
        <p className="text-ink-soft">
          {totalPoints(cuts)}/{maxPoints(cuts.length)} points
        </p>
      </div>
      <ShareButton number={number} preview={preview} marks={marks} />
      <p className="text-center text-xs text-ink-faint">{EMOJI_LEGEND.map(([e, meaning]) => `${e} ${meaning}`).join("  ·  ")}</p>

      <div>
        <p className="text-sm font-semibold text-ink-soft">Your rounds · pick one to see it again</p>
        <ol className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card ring-1 ring-line">
          {puzzle.rounds.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onView(i)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${viewing === i ? "bg-coral-soft" : "hover:bg-land"}`}
              >
                <span aria-hidden="true">{cutEmoji(cuts[i])}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{capitalise(r.country)}</span>
                  <span className="block text-sm text-ink-soft">{resultLine(cuts[i].share, r.target)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl bg-card p-3 shadow-card">
        <p className="px-2 pt-1 text-sm font-semibold">{instruction(round)}</p>
        <SliceBoard round={round} reveal={{ line: cut.line, perfect: perfectLine(round, cut.line) }} className="block h-[min(50svh,80vw)] w-full" />
      </div>

      {stats && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Played", stats.played],
            ["Streak", stats.currentStreak],
            ["Best", stats.bestStreak],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-card py-3 ring-1 ring-line">
              <dd className="font-display text-2xl font-semibold">{value}</dd>
              <dt className="text-xs text-ink-faint">{label}</dt>
            </div>
          ))}
        </dl>
      )}
      <Countdown prefix="Next slices in" className="text-center text-sm text-ink-soft" />
      {preview && <PreviewList />}
    </div>
  );
}

function ShareButton({ number, preview, marks }: { number: number; preview: boolean; marks: string[] }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share() {
    const text = shareText({ game: GAME_NAME, number, preview, marks, url: `${location.origin}/slice/` });
    const outcome = await shareResult(text);
    if (outcome !== "shared") {
      setState(outcome);
      window.setTimeout(() => setState("idle"), 2200);
    }
  }
  return (
    <button type="button" onClick={share} className="h-14 rounded-full bg-coral text-[19px] font-bold text-white transition-colors hover:bg-coral-deep">
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}

/** Playtesting before launch: every generated puzzle, found by probing 0001.json, 0002.json, ... */
function PreviewList() {
  const [found, setFound] = useState<number[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: number[] = [];
      for (let n = 1; n <= 60; n++) {
        const res = await fetch(`/data/slice/${String(n).padStart(4, "0")}.json`, { method: "HEAD" }).catch(() => null);
        if (!res?.ok) break;
        list.push(n);
      }
      if (!cancelled) setFound(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!found?.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-ink-faint">Play a preview</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {found.map((n) => (
          <Link key={n} href={`/slice/?puzzle=${n}`} className="grid size-10 place-items-center rounded-full bg-card text-sm font-bold ring-1 ring-line hover:ring-coral">
            {n}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Screen({ number, preview, children }: { number: number | null; preview: boolean; children: React.ReactNode }) {
  return (
    <div className="font-sans min-h-svh bg-land text-ink">
      <div className="mx-auto w-full max-w-[560px] px-4 pt-4 pb-10">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" aria-label={`${GAME_NAME}: back to all games`} className="rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold shadow-card hover:text-coral-deep">
            ← {GAME_NAME}
            <span className="text-coral">.</span>
          </Link>
          {number !== null && (
            <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-card">
              {preview ? "Preview" : "No."} {number}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function Notice({ load }: { load: Exclude<Load, { status: "ready" }> }) {
  if (load.status === "loading") return <Screen number={null} preview={false}>{null}</Screen>;
  return (
    <Screen number={null} preview={false}>
      <p className="font-display text-2xl font-semibold">
        {load.status === "missing" ? "A new Slice is on its way. Check back soon." : "There's no puzzle with that number."}
      </p>
      <Countdown prefix="Next slices in" className="mt-3 block text-ink-soft" />
    </Screen>
  );
}
