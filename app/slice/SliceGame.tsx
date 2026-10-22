"use client";

// The Slice game screen (/slice): the 3D board (games/slice/scene.ts) fills the screen
// under a thin layer of interface. Each round: the question announces itself (a
// People/Land badge, its key words highlighted, a two-note sound), the player draws a
// dashed cut and presses Cut, the scissors snip, the pieces part and the population rises;
// then "Show perfect cut" and Next. After the last round, the day's summary sits in a
// sheet at the bottom and tapping a round shows its cut again on the board.
//
// Game rules and loading live in games/slice (useSliceGame); this file only decides
// how it looks.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Countdown from "@/components/Countdown";
import Loading from "@/components/Loading";
import ThemeToggle from "@/components/ThemeToggle";
import { track } from "@/lib/analytics";
import { getPuzzleNumber } from "@/lib/daily";
import { lastOpenPuzzle } from "@/lib/schedule";
import { shareResult, shareText } from "@/lib/share";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { subscribe } from "@/lib/storage";
import { useTheme } from "@/lib/useTheme";
import { GAME_NAME } from "@/games/slice/config";
import { crosses, perfectLine, share } from "@/games/slice/cut";
import { triesLeft, type SavedCut } from "@/games/slice/game";
import { lineThrough } from "@/games/slice/geometry";
import type { SliceScene } from "@/games/slice/scene";
import { storageKeyFor } from "@/games/slice/schedule";
import { bandOf, formatShare, LOSS_PER_POINT, MAX_SCORE, maxScore, scoreCut, totalScore } from "@/games/slice/scoring";
import { isMuted, setMuted, sound } from "@/games/slice/sound";
import type { Puzzle, Round } from "@/games/slice/types";
import { useSliceGame, type Load } from "@/games/slice/useSliceGame";
import { useStats } from "@/games/slice/useTodayResult";
import { useTodayResult as useDownstreamToday } from "@/games/downstream/useTodayResult";
import { capitalise, fractionWords, goal, instruction, measure, perfectLineText, possessive } from "@/games/slice/words";

// One word for each score band (bandOf in scoring.ts: 90+, 70+, 20+, below).
const BAND_WORDS = ["Spot on", "So close", "Not bad", "Way off"];
const LABEL = "pointer-events-none absolute top-0 left-0 rounded-full bg-card/90 px-3 py-1 text-[17px] font-bold tabular-nums shadow-card";

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
  const [boardShown, setBoardShown] = useState(false); // the first frame with the country is drawn
  const [failed, setFailed] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revealDone, setRevealDone] = useState(false);
  const [perfectShown, setPerfectShown] = useState(false);
  const [viewing, setViewing] = useState(0); // the summary's selected round
  const theme = useTheme();

  const finished = g.phase === "finished";
  const roundIndex = finished ? viewing : g.game.round;
  const round = puzzle.rounds[roundIndex];
  // The cut on the board: in play, the round's latest try; in the summary, each round's
  // best (the one that counted).
  const cut: SavedCut | undefined = finished ? g.game.cuts[roundIndex] : (g.game.last ?? undefined);
  const best: SavedCut | undefined = g.game.cuts[roundIndex];
  const isPopulation = round.mode === "population";
  const revealing = !finished && g.phase !== "cutting" && !revealDone; // a cut is playing out on the board

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
        made.onShown = () => setBoardShown(true);
        measureInsets();
        setSceneReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      made?.dispose();
      scene.current = null;
    };
  }, []);

  // Light or dark: the table recolours in place, even mid-round.
  useEffect(() => {
    if (sceneReady) scene.current?.setTheme(theme);
  }, [sceneReady, theme]);

  // Tell the scene how much of the screen the interface covers, so the country is
  // framed in the space between.
  function measureInsets() {
    const t = top.current?.getBoundingClientRect();
    const b = bottom.current?.getBoundingClientRect();
    if (!t || !b || !scene.current) return;
    scene.current.setInsets({
      top: Math.round(t.bottom + 8),
      bottom: Math.round(window.innerHeight - b.top + 8),
    });
  }
  useEffect(() => {
    const ro = new ResizeObserver(() => measureInsets());
    if (top.current) ro.observe(top.current);
    if (bottom.current) ro.observe(bottom.current);
    window.addEventListener("resize", measureInsets);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureInsets);
    };
  }, []);

  // Keep the board in step with the game: a fresh country to cut, a cut already made
  // (a resumed game), or a round picked in the day's summary, shown finished.
  const key = `${g.phase}:${roundIndex}`;
  useEffect(() => {
    const s = scene.current;
    if (!sceneReady || !s || shown.current === key) return;
    // Cut just now on this board (its reveal already played), or kept after that.
    const wasCut = shown.current === `cutting:${roundIndex}` || shown.current === `result:${roundIndex}`;
    shown.current = key;
    if (g.phase === "cutting") {
      s.setRound(round); // clears the draft, which resets the hint via onDraft
      sound.announce(round.mode);
    } else if (cut && !wasCut) {
      // Not cut just now on this board: show the cut already made, finished, in silence.
      s.setRound(round);
      s.reveal(
        cut.line,
        perfectLine(round, cut.line),
        share(round, cut.line),
        scoreCut(round, cut.line).positive,
        bandOf(cut.score),
        () => setRevealDone(true),
        true,
      );
      if (finished) s.showPerfect(true);
    }
  }, [sceneReady, key, g.phase, round, roundIndex, cut, finished]);

  function confirm() {
    const draft = scene.current?.getDraft();
    const line = draft && lineThrough(draft[0], draft[1]);
    if (!line) return;
    if (!crosses(round, line)) {
      setMessage(`That line misses ${round.country}. Draw it right across the country.`);
      return;
    }
    g.act({ type: "cut", line });
    const scored = scoreCut(round, line);
    scene.current?.reveal(line, perfectLine(round, line), share(round, line), scored.positive, bandOf(scored.score), () => setRevealDone(true));
  }

  function next() {
    sound.tap();
    setRevealDone(false);
    setPerfectShown(false);
    g.act({ type: "next" });
  }

  // A second try: the same country, a clear board.
  function again() {
    sound.tap();
    setRevealDone(false);
    setPerfectShown(false);
    g.act({ type: "again" });
  }

  // Happy with this cut: settle the round, which brings out the perfect cut.
  function keep() {
    sound.tap();
    g.act({ type: "keep" });
  }

  function showPerfect() {
    setPerfectShown(true);
    scene.current?.showPerfect();
  }

  return (
    <div className="font-sans relative h-svh overflow-hidden bg-mat text-ink">
      <div ref={holder} className="absolute inset-0" />
      {/* Until the 3D board is up (its code downloads after the puzzle), the same loading
          state as the page before it, in the same place, then it fades away. */}
      <Loading
        label="Laying out today's countries…"
        className={`absolute inset-0 bg-mat transition-opacity duration-500 ${boardShown || failed ? "pointer-events-none opacity-0" : ""}`}
      />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center">
          Slice draws its countries in 3D with WebGL, which this browser has turned off. Try another browser, or turn on hardware acceleration.
        </p>
      )}

      {/* Piece labels and the perfect cut's label, positioned by the scene every frame. */}
      <div ref={labelA} className={LABEL} style={{ opacity: 0 }} />
      <div ref={labelB} className={LABEL} style={{ opacity: 0 }} />
      <div ref={perfectLabel} className={`${LABEL} bg-ink! text-[13px]! text-card`} style={{ opacity: 0 }} />

      <div ref={top} className="pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[600px] p-4 lg:pt-6">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            aria-label={`${GAME_NAME}: back to ${SITE_NAME}`}
            className="group flex items-center gap-1.5 rounded-full bg-card py-1.5 pr-3.5 pl-2.5 text-xs font-semibold whitespace-nowrap shadow-card transition-colors hover:text-coral-deep"
          >
            <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true">
              <path d="M16 10H5M9 5.5 4.5 10 9 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              {GAME_NAME}
              <span className="text-coral">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SoundButton />
            <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-ink-soft shadow-card">
              {preview ? "Preview" : "No."} {number}
            </span>
          </div>
        </div>

        {finished ? (
          <p className="font-display mt-4 max-w-[28ch] text-[17px] leading-snug font-semibold lg:text-[20px]">
            <span className="text-ink-faint">Round {roundIndex + 1}.</span> {instruction(round)}
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                Round {g.game.round + 1} <span className="text-ink-faint">of {puzzle.rounds.length}</span>
              </p>
              {/* This round's score waits for the reveal, so it never gives the cut away. */}
              <RoundScores scores={puzzle.rounds.map((_, i) => (i === g.game.round && !revealDone ? null : (g.game.cuts[i]?.score ?? null)))} />
            </div>
            {/* Keyed by round, so the badge and highlight replay for every new question. */}
            <div key={roundIndex} className="mt-2">
              <span
                className={`rise-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase shadow-card ${
                  isPopulation ? "bg-coral text-white" : "bg-card text-ink"
                }`}
              >
                {isPopulation ? <PopulationIcon /> : <LandIcon />}
                {isPopulation ? "Population" : "Land"}
              </span>
              <h1
                className={`font-display mt-2 max-w-[22ch] leading-tight font-semibold tracking-[-0.02em] text-balance transition-[font-size] duration-300 ${
                  g.phase === "cutting" ? "text-[26px] lg:text-[34px]" : "text-[19px] lg:text-[22px]"
                }`}
              >
                <span className="sr-only">{instruction(round)}</span>
                <span aria-hidden="true">
                  Cut off <span className="slice-mark">{fractionWords(round.target)}</span> of {possessive(round.country)}{" "}
                  <span className="slice-mark slice-mark-late">{measure(round)}</span>.
                </span>
              </h1>
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* During a reveal the whole card is hidden, so the board has the stage; it rises
            in with the result. Hidden, not removed: it keeps its size, so the board's
            framing (setInsets) doesn't jump. */}
        <div
          ref={bottom}
          className={`mx-auto max-w-[568px] rounded-[22px] bg-card/95 p-3 shadow-card ${
            // Gone at once on Cut (a fade-out would show the result in it), back with a fade.
            revealing ? "pointer-events-none translate-y-3 opacity-0" : "pointer-events-auto transition-[opacity,translate] duration-500"
          }`}
        >
          {finished ? (
            <Summary number={number} preview={preview} puzzle={puzzle} cuts={g.game.cuts} viewing={viewing} onView={setViewing} />
          ) : g.phase === "cutting" ? (
            // Keyed apart from the result below: sharing one element, the result text
            // arrived at full opacity and faded out before the reveal (a flash of the score).
            <div key="cutting" className="flex flex-col gap-2.5">
              <p className={`px-1 text-[14px] ${message ? "font-semibold text-coral-deep" : "text-ink-soft"}`} aria-live="polite">
                {message ??
                  (g.game.again && g.game.last
                    ? `Second try. Your first cut took ${formatShare(g.game.last.share)} and scored ${g.game.last.score}. ${hasDraft ? "Press Cut when you're ready." : "Can you beat it?"}`
                    : hasDraft
                      ? "Drag either end to fine-tune, then press Cut."
                      : isPopulation
                        ? "Think about where most of the population lives, not how big the country looks. Drag across it to draw your cut."
                        : "Just the land this time: cities don't count. Drag across the country to draw your cut.")}
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={!hasDraft}
                className="h-12 rounded-full bg-coral text-[18px] font-bold text-white transition-colors hover:bg-coral-strong disabled:bg-ink/10 disabled:text-ink-faint"
              >
                Cut
              </button>
            </div>
          ) : cut ? (
            // Compact once cut, so the 3D board keeps most of a phone screen.
            <div key="result" className="flex flex-col gap-2">
              <p className="px-1 text-[15px] leading-snug">
                <span className="font-semibold">
                  {BAND_WORDS[bandOf(cut.score)]}. {cut.score} points.
                </span>{" "}
                You cut off {formatShare(cut.share)}. The aim was {formatShare(round.target)}.
              </p>
              <p className="px-1 text-[13px] leading-snug text-ink-soft" aria-live="polite">
                {g.phase === "result"
                  ? "Cut again to try to beat it, or keep it. The perfect cut shows once you're done."
                  : perfectShown
                    ? perfectLineText(cut.line, perfectLine(round, cut.line))
                    : best && best !== cut
                      ? `Your first cut was better: it scored ${best.score}, so that's the one that counts.`
                      : round.fact}
              </p>
              {g.phase === "result" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={keep}
                    disabled={!revealDone}
                    className="h-11 flex-1 rounded-full bg-card text-[15px] font-semibold ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
                  >
                    Keep this cut
                  </button>
                  <button
                    type="button"
                    onClick={again}
                    disabled={!revealDone}
                    className="h-11 flex-1 rounded-full bg-ink text-[15px] font-bold text-card"
                  >
                    Cut again · {triesLeft(g.game)} left
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!perfectShown && (
                    <button
                      type="button"
                      onClick={showPerfect}
                      disabled={!revealDone}
                      className="h-11 flex-1 rounded-full bg-card text-[15px] font-semibold ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
                    >
                      Show perfect cut
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={next}
                    disabled={!revealDone}
                    className="h-11 flex-1 rounded-full bg-ink text-[15px] font-bold text-card"
                  >
                    {g.game.round + 1 >= puzzle.rounds.length ? "See results" : "Next round"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The day so far in the top bar: each finished round's score, a dash for the rest. */
function RoundScores({ scores }: { scores: (number | null)[] }) {
  const done = scores.filter((s) => s !== null).length;
  return (
    <p className="flex gap-1" aria-label={`${done} of ${scores.length} rounds done`}>
      {scores.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`grid h-6 min-w-8 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
            s === null ? "bg-card/60 text-ink-faint" : "bg-card text-ink shadow-card"
          }`}
        >
          {s ?? "–"}
        </span>
      ))}
    </p>
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
  return (
    // The sheet scrolls; its blocks keep their size (in a flex column they'd shrink to fit).
    <div className="flex max-h-[50svh] flex-col gap-3 overflow-y-auto px-1 *:shrink-0">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Today&apos;s slices</h1>
          <p className="text-xs text-ink-faint">
            Each cut starts at {MAX_SCORE} and loses {LOSS_PER_POINT} for every percentage point off.
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-display text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{totalScore(cuts)}</span>
          <span className="text-sm text-ink-faint tabular-nums">/{maxScore(cuts.length)}</span>
        </p>
      </div>
      <ShareButton number={number} preview={preview} cuts={cuts} />
      <TryDownstream />

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
              <span className="font-display w-9 shrink-0 text-lg font-semibold tabular-nums" aria-label={`${cuts[i].score} points`}>
                {cuts[i].score}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{capitalise(r.country)}</span>
                <span className="block text-xs text-ink-soft">{goal(r)}</span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums">{formatShare(cuts[i].share)}</span>
                <span className="block text-xs text-ink-faint tabular-nums">aim {formatShare(r.target)}</span>
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
      <Countdown prefix="New countries in" className="text-center text-sm text-ink-soft" />
      {preview && <PreviewList />}
    </div>
  );
}

/** Done with Slice: point to today's Downstream, unless it's already been played today. */
function TryDownstream() {
  const today = useDownstreamToday();
  if (!today || today.result) return null; // still reading storage, or Downstream is done
  return (
    <Link
      href="/downstream/"
      className="group flex items-center gap-3 rounded-2xl bg-sea p-3 ring-1 ring-drop/15 transition-shadow hover:ring-drop/40"
    >
      <svg viewBox="0 0 24 24" className="size-8 shrink-0 text-drop" aria-hidden="true">
        <path d="M12 2.5c3.2 4.3 6.5 8.4 6.5 12a6.5 6.5 0 0 1-13 0c0-3.6 3.3-7.7 6.5-12Z" fill="currentColor" />
        <path d="M9 15.5a3 3 0 0 0 2.5 2.8" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Next: today&apos;s Downstream</span>
        <span className="block text-xs text-ink-soft">A raindrop lands somewhere on Earth. Which sea does it reach?</span>
      </span>
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
        <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function ShareButton({ number, preview, cuts }: { number: number; preview: boolean; cuts: SavedCut[] }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share() {
    sound.tap();
    // "Slice #4 312/400", then each round's score: no countries, no answers.
    const text = shareText({
      game: GAME_NAME,
      number,
      points: totalScore(cuts),
      maxPoints: maxScore(cuts.length),
      detail: cuts.map((c) => c.score).join(" · "),
      url: `${SITE_URL}/slice/`, // always the real address, whichever copy of the site is open
    });
    const outcome = await shareResult(text);
    track("result_shared", { game: "slice", puzzle: number, preview, outcome });
    if (outcome !== "shared") {
      setState(outcome);
      window.setTimeout(() => setState("idle"), 2200);
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="h-12 rounded-full bg-coral text-[18px] font-bold text-white transition-colors hover:bg-coral-strong"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}

/** Playtesting before launch: every generated puzzle, found by probing 0001.json, 0002.json, ...
 *  After launch: past puzzles only, never future ones. */
function PreviewList() {
  const [found, setFound] = useState<number[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: number[] = [];
      for (let n = 1; n <= Math.min(60, lastOpenPuzzle()); n++) {
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
      <p className="text-sm font-semibold text-ink-faint">{getPuzzleNumber() >= 1 ? "Play a past puzzle" : "Play a preview"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {found.map((n) => (
          // A plain link: a fresh page load gives each preview a fresh board.
          <a
            key={n}
            href={`/slice/?puzzle=${n}`}
            className="grid size-10 place-items-center rounded-full bg-card text-sm font-bold ring-1 ring-line hover:ring-coral"
          >
            {n}
          </a>
        ))}
      </div>
    </div>
  );
}

function PopulationIcon() {
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
      className="grid size-9 shrink-0 place-items-center rounded-full bg-card shadow-card"
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
  // Loading is the shared loading state, the same as the page shell before it.
  if (load.status === "loading") return <Loading label="Laying out today's countries…" className="h-svh bg-mat" />;
  return (
    <div className="font-sans grid h-svh place-items-center bg-mat p-6 text-ink">
      <div className="max-w-[420px] rounded-[26px] bg-card p-7 shadow-card">
        <p className="font-display text-2xl font-semibold">
          {load.status === "missing" ? "Today's countries are still being cut. Check back soon." : "There's no puzzle with that number."}
        </p>
        <Countdown prefix="New countries in" className="mt-3 block text-ink-soft" />
        <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-deep">
          <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
            <path d="M16 10H5M9 5.5 4.5 10 9 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All games
        </Link>
      </div>
    </div>
  );
}
