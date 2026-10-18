"use client";

// The Slice game screen (/slice): the 3D board (games/slice/scene.ts) fills the screen
// under a thin layer of interface. Each round: the question announces itself (a
// People/Land badge, its key words highlighted, a two-note sound), the player draws a
// dashed cut and presses Cut, the scissors snip, the pieces part and the people rise;
// then "Show perfect cut" and Next. After the last round, the day's summary sits in a
// sheet at the bottom and tapping a round shows its cut again on the board.
//
// Game rules and loading live in games/slice (useSliceGame); this file only decides
// how it looks.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Countdown from "@/components/Countdown";
import { shareResult, shareText } from "@/lib/share";
import { subscribe } from "@/lib/storage";
import { GAME_NAME } from "@/games/slice/config";
import { crosses, perfectLine, share } from "@/games/slice/cut";
import type { SavedCut } from "@/games/slice/game";
import { lineThrough } from "@/games/slice/geometry";
import type { SliceScene } from "@/games/slice/scene";
import { storageKeyFor } from "@/games/slice/schedule";
import { cutEmoji, EMOJI_LEGEND, formatShare, maxPoints, scoreCut, totalPoints } from "@/games/slice/scoring";
import { isMuted, setMuted, sound } from "@/games/slice/sound";
import type { Puzzle, Round } from "@/games/slice/types";
import { useSliceGame, type Load } from "@/games/slice/useSliceGame";
import { useStats } from "@/games/slice/useTodayResult";
import { capitalise, fractionWords, instruction, perfectLineText, possessive } from "@/games/slice/words";

const TIER_WORDS = ["Spot on", "Close", "Not bad", "Way off"];
const LABEL = "pointer-events-none absolute top-0 left-0 rounded-full bg-white/90 px-3 py-1 text-[17px] font-bold tabular-nums shadow-card";

export default function SliceGame() {
  const g = useSliceGame();
  if (g.load.status !== "ready") return <Notice load={g.load} />;
  return <Board load={g.load} game={g} />;
}

function Board({ load, game: g }: { load: Extract<Load, { status: "ready" }>; game: ReturnType<typeof useSliceGame> }) {
  const { number, puzzle, preview } = load;
  const holder = useRef<HTMLDivElement>(null);
  const labelA = useRef<HTMLDivElement>(null);
  const labelB = useRef<HTMLDivElement>(null);
  const perfectLabel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const scene = useRef<SliceScene | null>(null);
  const shown = useRef(""); // what the scene is showing, so re-renders don't replay it
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revealDone, setRevealDone] = useState(false);
  const [perfectShown, setPerfectShown] = useState(false);
  const [viewing, setViewing] = useState(0); // the summary's selected round

  const finished = g.phase === "finished";
  const roundIndex = finished ? viewing : g.game.round;
  const round = puzzle.rounds[roundIndex];
  const cut: SavedCut | undefined = g.game.cuts[roundIndex];
  const people = round.mode === "population";

  // Create the 3D scene once. three.js is imported here, in the browser, never at build time.
  useEffect(() => {
    let cancelled = false;
    let made: SliceScene | null = null;
    import("@/games/slice/scene")
      .then(({ SliceScene }) => {
        if (cancelled || !holder.current) return;
        made = new SliceScene(holder.current, [labelA.current!, labelB.current!], perfectLabel.current!, (d) => {
          setHasDraft(!!d);
          setMessage(null);
        });
        scene.current = made;
        measure();
        setSceneReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      made?.dispose();
      scene.current = null;
    };
  }, []);

  // Tell the scene how much of the screen the interface covers, so the country is
  // framed in the space between.
  function measure() {
    const t = top.current?.getBoundingClientRect();
    const b = bottom.current?.getBoundingClientRect();
    if (!t || !b || !scene.current) return;
    scene.current.setInsets({ top: Math.round(t.bottom + 8), bottom: Math.round(window.innerHeight - b.top + 8) });
  }
  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (top.current) ro.observe(top.current);
    if (bottom.current) ro.observe(bottom.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Keep the board in step with the game: a fresh country to cut, a cut already made
  // (a resumed game), or a round picked in the day's summary, shown finished.
  const key = `${g.phase}:${roundIndex}`;
  useEffect(() => {
    const s = scene.current;
    if (!sceneReady || !s || shown.current === key) return;
    const wasCut = shown.current === `cutting:${roundIndex}`;
    shown.current = key;
    if (g.phase === "cutting") {
      s.setRound(round); // clears the draft, which resets the hint via onDraft
      sound.announce(round.mode);
    } else if (cut && !wasCut) {
      // Not cut just now on this board: show the cut already made, finished, in silence.
      s.setRound(round);
      s.reveal(cut.line, perfectLine(round, cut.line), share(round, cut.line), scoreCut(round, cut.line).positive, cut.tier, () => setRevealDone(true), true);
      if (finished) s.showPerfect(true);
    }
  }, [sceneReady, key, g.phase, round, roundIndex, cut, finished]);

  function confirm() {
    const draft = scene.current?.getDraft();
    const line = draft && lineThrough(draft[0], draft[1]);
    if (!line) return;
    if (!crosses(round, line)) {
      setMessage(`That line doesn't cross ${round.country}. Draw one that cuts through it.`);
      return;
    }
    g.act({ type: "cut", line });
    const scored = scoreCut(round, line);
    scene.current?.reveal(line, perfectLine(round, line), share(round, line), scored.positive, scored.tier, () => setRevealDone(true));
  }

  function next() {
    sound.tap();
    setRevealDone(false);
    setPerfectShown(false);
    g.act({ type: "next" });
  }

  function showPerfect() {
    setPerfectShown(true);
    scene.current?.showPerfect();
  }

  return (
    <div className="font-sans relative h-svh overflow-hidden bg-[#bccdbd] text-ink">
      <div ref={holder} className="absolute inset-0" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center">Slice needs WebGL, which this browser doesn&apos;t have turned on.</p>
      )}

      {/* Piece labels and the perfect cut's label, positioned by the scene every frame. */}
      <div ref={labelA} className={LABEL} style={{ opacity: 0 }} />
      <div ref={labelB} className={LABEL} style={{ opacity: 0 }} />
      <div ref={perfectLabel} className={`${LABEL} bg-ink! text-[13px]! text-white`} style={{ opacity: 0 }} />

      <div ref={top} className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            aria-label={`${GAME_NAME}: back to all games`}
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-card hover:text-coral-deep"
          >
            ← {GAME_NAME}
            <span className="text-coral">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <SoundButton />
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-ink-soft shadow-card">
              {preview ? "Preview" : "No."} {number}
            </span>
          </div>
        </div>

        {finished ? (
          <p className="font-display mt-4 max-w-[26ch] text-[17px] leading-snug font-semibold">
            <span className="text-ink-faint">Round {roundIndex + 1}.</span> {instruction(round)}
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                Round {g.game.round + 1} <span className="text-ink-faint">of {puzzle.rounds.length}</span>
              </p>
              <p className="text-sm tracking-[0.15em]" aria-label={`${g.game.cuts.length} of ${puzzle.rounds.length} rounds done`}>
                {puzzle.rounds.map((_, i) => (g.game.cuts[i] ? cutEmoji(g.game.cuts[i]) : "⬜")).join("")}
              </p>
            </div>
            {/* Keyed by round, so the badge and highlight replay for every new question. */}
            <div key={roundIndex} className="mt-2">
              <span
                className={`rise-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase shadow-card ${
                  people ? "bg-coral text-white" : "bg-white text-ink"
                }`}
              >
                {people ? <PeopleIcon /> : <LandIcon />}
                {people ? "People" : "Land"}
              </span>
              <h1
                className={`font-display mt-2 max-w-[22ch] leading-tight font-semibold tracking-[-0.02em] text-balance transition-[font-size] duration-300 ${
                  g.phase === "cutting" ? "text-[26px]" : "text-[19px]"
                }`}
              >
                <span className="sr-only">{instruction(round)}</span>
                <span aria-hidden="true">
                  Cut off <span className="slice-mark">{fractionWords(round.target)}</span> of {possessive(round.country)}{" "}
                  <span className="slice-mark slice-mark-late">{people ? "people" : "land"}</span>.
                </span>
              </h1>
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div ref={bottom} className="pointer-events-auto mx-auto max-w-[520px] rounded-[22px] bg-white/95 p-3 shadow-card">
          {finished ? (
            <Summary number={number} preview={preview} puzzle={puzzle} cuts={g.game.cuts} viewing={viewing} onView={setViewing} />
          ) : g.phase === "cutting" ? (
            <div className="flex flex-col gap-2.5">
              <p className={`px-1 text-[14px] ${message ? "font-semibold text-coral-deep" : "text-ink-soft"}`} aria-live="polite">
                {message ??
                  (hasDraft
                    ? "Drag the ends to adjust, then cut."
                    : people
                      ? "Count people, not land. Drag across to draw your cut."
                      : "Count land this time. Drag across to draw your cut.")}
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={!hasDraft}
                className="h-12 rounded-full bg-coral text-[18px] font-bold text-white transition-colors hover:bg-coral-deep disabled:bg-ink/10 disabled:text-ink-faint"
              >
                Cut
              </button>
            </div>
          ) : cut ? (
            // Compact once cut, so the 3D board keeps most of a phone screen.
            <div className={`flex flex-col gap-2 transition-opacity duration-500 ${revealDone ? "opacity-100" : "opacity-0"}`}>
              <p className="px-1 text-[15px] leading-snug">
                <span aria-hidden="true">{cutEmoji(cut)}</span> <span className="font-semibold">{TIER_WORDS[cut.tier]}.</span> You cut off{" "}
                {formatShare(cut.share)}, target {formatShare(round.target)}.
              </p>
              <p className="px-1 text-[13px] leading-snug text-ink-soft" aria-live="polite">
                {perfectShown ? perfectLineText(cut.line, perfectLine(round, cut.line)) : round.fact}
              </p>
              <div className="flex gap-2">
                {!perfectShown && (
                  <button
                    type="button"
                    onClick={showPerfect}
                    disabled={!revealDone}
                    className="h-11 flex-1 rounded-full bg-white text-[15px] font-semibold ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
                  >
                    Show perfect cut
                  </button>
                )}
                <button type="button" onClick={next} disabled={!revealDone} className="h-11 flex-1 rounded-full bg-ink text-[15px] font-bold text-white">
                  {g.game.round + 1 >= puzzle.rounds.length ? "See results" : "Next round"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
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
  return (
    // The sheet scrolls; its blocks keep their size (in a flex column they'd shrink to fit).
    <div className="flex max-h-[50svh] flex-col gap-3 overflow-y-auto px-1 *:shrink-0">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Today&apos;s slices</h1>
          <p className="text-[26px] tracking-[0.12em]" aria-label="Your squares">
            {marks.join("")}
          </p>
        </div>
        <p className="pb-1 text-sm text-ink-soft">
          {totalPoints(cuts)}/{maxPoints(cuts.length)} points
        </p>
      </div>
      <ShareButton number={number} preview={preview} marks={marks} />
      <p className="text-center text-[11px] text-ink-faint">{EMOJI_LEGEND.map(([e, meaning]) => `${e} ${meaning}`).join("  ·  ")}</p>

      <ol className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
        {puzzle.rounds.map((r: Round, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onView(i);
              }}
              aria-pressed={viewing === i}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${viewing === i ? "bg-coral-soft" : "hover:bg-land"}`}
            >
              <span aria-hidden="true">{cutEmoji(cuts[i])}</span>
              <span className="flex-1 text-sm">
                <span className="font-semibold">{capitalise(r.country)}</span>{" "}
                <span className="text-ink-soft">
                  {formatShare(cuts[i].share)} of {formatShare(r.target)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {stats && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Played", stats.played],
            ["Streak", stats.currentStreak],
            ["Best", stats.bestStreak],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-land py-2">
              <dd className="font-display text-xl font-semibold">{value}</dd>
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
    sound.tap();
    const text = shareText({ game: GAME_NAME, number, preview, marks, url: `${location.origin}/slice/` });
    const outcome = await shareResult(text);
    if (outcome !== "shared") {
      setState(outcome);
      window.setTimeout(() => setState("idle"), 2200);
    }
  }
  return (
    <button type="button" onClick={share} className="h-12 rounded-full bg-coral text-[18px] font-bold text-white transition-colors hover:bg-coral-deep">
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
          // A plain link: a fresh page load gives each preview a fresh board.
          <a key={n} href={`/slice/?puzzle=${n}`} className="grid size-10 place-items-center rounded-full bg-white text-sm font-bold ring-1 ring-line hover:ring-coral">
            {n}
          </a>
        ))}
      </div>
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
      <circle cx="7" cy="6.5" r="2.6" fill="currentColor" />
      <circle cx="13.6" cy="7.4" r="2.1" fill="currentColor" opacity="0.75" />
      <path d="M2.5 16c.4-3 2.2-4.6 4.5-4.6s4.1 1.6 4.5 4.6zM12 16c.2-2.1.9-3.6 2.2-4.1 1.7.2 2.9 1.6 3.3 4.1z" fill="currentColor" />
    </svg>
  );
}

function LandIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
      <path d="M2 16l5-8 3.2 4.6L12.5 9 18 16z" fill="currentColor" />
    </svg>
  );
}

/** Sound on/off, remembered (storage setting "slice" / "muted"). */
function SoundButton() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) sound.tap();
      }}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={!muted}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-card"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
        <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
        {muted ? (
          <path d="M13.5 7.5l4 5m0-5l-4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M13 7.2a4 4 0 0 1 0 5.6M15.4 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

function Notice({ load }: { load: Exclude<Load, { status: "ready" }> }) {
  return (
    <div className="font-sans grid min-h-svh place-items-center bg-[#bccdbd] p-6 text-ink">
      {load.status !== "loading" && (
        <div className="max-w-[420px] rounded-[26px] bg-white p-7 shadow-card">
          <p className="font-display text-2xl font-semibold">
            {load.status === "missing" ? "A new Slice is on its way. Check back soon." : "There's no puzzle with that number."}
          </p>
          <Countdown prefix="Next slices in" className="mt-3 block text-ink-soft" />
          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-coral-deep">
            ← All games
          </Link>
        </div>
      )}
    </div>
  );
}
