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
import NextUp, { type NextUpItem } from "@/components/NextUp";
import { ScoreChart, ScoreStanding, shareStanding, useScoreComparison } from "@/components/ScoreComparison";
import ScrollHint from "@/components/ScrollHint";
import ShareButton from "@/components/ShareButton";
import { useYesterdayItem } from "@/components/YesterdayLink";
import { SupportLine } from "@/components/SupportLink";
import Loading from "@/components/Loading";
import ThemeToggle from "@/components/ThemeToggle";
import { shareText } from "@/lib/share";
import { useShareCard } from "@/lib/shareCard";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { subscribe } from "@/lib/storage";
import { useTheme } from "@/lib/useTheme";
import { GAME_NAME } from "@/games/slice/config";
import { crosses, perfectLine, share } from "@/games/slice/cut";
import { hinted, triesLeft, type SavedCut } from "@/games/slice/game";
import { HintIcon, HintMark } from "@/games/slice/HintIcon";
import { lineThrough } from "@/games/slice/geometry";
import { otherPractice, PRACTICE, type PracticeCountry } from "@/games/slice/practice";
import type { SliceScene } from "@/games/slice/scene";
import { drawSliceCard } from "@/games/slice/shareCard";
import { GAME_KEY, PREVIEW_KEY, storageKeyFor } from "@/games/slice/schedule";
import { bandOf, formatShare, HALF_EVERY_POINTS, MAX_SCORE, maxScore, missOf, scoreCut, totalScore } from "@/games/slice/scoring";
import { isMuted, setMuted, sound } from "@/games/slice/sound";
import type { Puzzle, Round } from "@/games/slice/types";
import { useSliceGame, type Load } from "@/games/slice/useSliceGame";
import { useStats, useTodayResult as useSliceToday } from "@/games/slice/useTodayResult";
import { useTodayResult as useDownstreamToday } from "@/games/downstream/useTodayResult";
import { capitalise, fractionWords, goal, instruction, measure, perfectLineText, possessive } from "@/games/slice/words";

// One word for each band (bandOf in scoring.ts: up to 1 point off, up to 5, under 10, 10 or more).
const BAND_WORDS = ["Spot on", "Pretty close", "Not bad", "Way off"];
const LABEL = "pointer-events-none absolute top-0 left-0 rounded-full bg-card/90 px-3 py-1 text-[17px] font-bold tabular-nums shadow-card";
// Every button on the board's card: one height, shape and type size, in every phase.
const BUTTON = "h-12 rounded-full px-3 text-[15px] font-semibold whitespace-nowrap sm:px-4 sm:text-[16px]"; // one line even at 360 px
// A city's name on the settled board: clearly second to the share labels (smaller,
// lighter type on a fainter pill, a hairline shadow), with a small ink dot like the
// hint's, so it reads as a place rather than a number.
const CITY_LABEL =
  "pointer-events-none absolute top-0 left-0 flex items-center gap-1 rounded-full bg-card/75 py-px pr-1.5 pl-1 text-[11px] leading-tight font-medium whitespace-nowrap text-ink-soft shadow-[0_1px_3px_rgb(18_26_43/0.14)] transition-opacity duration-300 lg:text-[12px]";

export default function SliceGame() {
  const g = useSliceGame();
  if (g.load.status !== "ready") return <Notice load={g.load} />;
  return <Board load={g.load} game={g} />;
}

function Board({ load, game: g }: { load: Extract<Load, { status: "ready" }>; game: ReturnType<typeof useSliceGame> }) {
  const { number, puzzle, preview, practice } = load;
  const holder = useRef<HTMLDivElement>(null);
  const labelA = useRef<HTMLDivElement>(null);
  const labelB = useRef<HTMLDivElement>(null);
  const perfectLabel = useRef<HTMLDivElement>(null);
  const cityLabels = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const cityLeaders = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
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
        made.setCityLabels(
          cityLabels.map((r) => r.current!),
          cityLeaders.map((r) => r.current!),
        );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the label refs are stable
  }, []);

  // Light or dark: the table recolours in place, even mid-round.
  useEffect(() => {
    if (sceneReady) scene.current?.setTheme(theme);
  }, [sceneReady, theme]);

  // Tell the scene how much of the screen the interface covers, so the country is
  // framed in the space between. Measured against the board itself, not the window:
  // with the page scrolled (the how-to-play text sits below the game), window-based
  // numbers framed the country too high, behind the header (fixed 2026-10-22).
  function measureInsets() {
    const box = holder.current?.getBoundingClientRect();
    const t = top.current?.getBoundingClientRect();
    const b = bottom.current?.getBoundingClientRect();
    if (!box || !t || !b || !scene.current) return;
    scene.current.setInsets({
      top: Math.round(t.bottom - box.top + 8),
      bottom: Math.round(box.bottom - b.top + 8),
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
    // The round's city hint, if taken, goes back on after every setRound (which clears it).
    const cities = hinted(g.game, roundIndex) ? (round.cities ?? null) : null;
    if (g.phase === "cutting") {
      s.setRound(round); // clears the draft, which resets the hint via onDraft
      s.showCities(cities);
      sound.announce(round.mode);
    } else if (cut && !wasCut) {
      // Not cut just now on this board: show the cut already made, finished, in silence.
      s.setRound(round);
      s.showCities(cities);
      s.reveal(
        cut.line,
        perfectLine(round, cut.line),
        share(round, cut.line),
        scoreCut(round, cut.line).positive,
        bandOf(missOf(cut.share, round.target)),
        () => setRevealDone(true),
        true,
      );
      if (finished) s.showPerfect(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- g.game is read for the hint only when the board changes
  }, [sceneReady, key, g.phase, round, roundIndex, cut, finished]);

  // The cities' names, once the round is over (both tries used, or the cut kept) and in
  // the day's summary: never before or between cuts, hinted or not.
  const namesShown = finished || (g.phase === "settled" && !!cut);
  useEffect(() => {
    if (sceneReady) scene.current?.showCityNames(namesShown ? (round.cityNames ?? null) : null);
  }, [sceneReady, namesShown, round, key]);

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
    scene.current?.reveal(line, perfectLine(round, line), share(round, line), scored.positive, bandOf(scored.miss), () => setRevealDone(true));
  }

  // The hint: the three biggest cities as dots, for the rest of this round. No score cost.
  const hintOn = !finished && hinted(g.game, roundIndex);
  // Most countries have three urban centres to show; a few small ones fewer (Lesotho: one).
  const cityCount = Math.min(round.cities?.length ?? 0, 3);
  const biggest = cityCount > 1 ? `the ${cityCount} biggest cities` : "the biggest city";
  function takeHint() {
    sound.tap();
    g.act({ type: "hint" });
    scene.current?.showCities(round.cities ?? null);
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
      {/* A name placed away from its city gets a thin leader line back to it, ending in a dot. */}
      {cityLeaders.map((ref, i) => (
        <div key={i} ref={ref} className="pointer-events-none absolute top-0 left-0 h-px origin-left bg-ink/35 transition-opacity duration-300" style={{ opacity: 0 }} aria-hidden="true">
          <span className="absolute -top-[1.5px] -left-[2px] size-1 rounded-full bg-ink/70" />
        </div>
      ))}
      {cityLabels.map((ref, i) => (
        <div key={i} ref={ref} className={CITY_LABEL} style={{ opacity: 0 }} aria-hidden="true">
          <span className="size-1 shrink-0 rounded-full bg-ink" />
          <span data-name />
        </div>
      ))}

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
            {practice ? (
              <span className="rounded-full bg-coral-soft px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-coral-deep shadow-card">Practice</span>
            ) : (
              <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-ink-soft shadow-card">
                {preview ? "Yesterday · No." : "No."} {number}
              </span>
            )}
          </div>
        </div>

        {finished && practice ? null : finished ? (
          <p className="font-display mt-4 max-w-[28ch] text-[17px] leading-snug font-semibold lg:text-[20px]">
            <span className="text-ink-faint">Round {roundIndex + 1}.</span> {instruction(round)}
          </p>
        ) : (
          <>
            {practice ? (
              <p className="mt-3 text-sm font-semibold">
                Practice round <span className="font-normal text-ink-faint">· doesn&apos;t count toward your streak</span>
              </p>
            ) : (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Round {g.game.round + 1} <span className="text-ink-faint">of {puzzle.rounds.length}</span>
                </p>
                {/* This round's score waits for the reveal, so it never gives the cut away. */}
                <RoundScores
                  scores={puzzle.rounds.map((_, i) => (i === g.game.round && !revealDone ? null : (g.game.cuts[i]?.score ?? null)))}
                  hints={g.game.hints}
                />
              </div>
            )}
            {/* Keyed by round, so the highlight replays for every new question. (A
                Population / Land badge sat above it until 2026-10-22: with every round
                a population round it said the same thing each time.) */}
            <div key={roundIndex} className="mt-2">
              <h1
                className={`font-display max-w-[22ch] leading-tight font-semibold tracking-[-0.02em] text-balance transition-[font-size] duration-300 ${
                  g.phase === "cutting" ? "text-[26px] lg:text-[34px]" : "text-[19px] lg:text-[22px]"
                }`}
              >
                <span className="sr-only">{instruction(round)}</span>
                {/* "Split Japan's population in half." (2026-10-31: "split", not "cut off";
                    other aims keep "Cut off a third of ..."). The marks sweep in reading order. */}
                <span aria-hidden="true">
                  {fractionWords(round.target) === "half" ? (
                    <>
                      Split {possessive(round.country)} <span className="slice-mark">{measure(round)}</span> in{" "}
                      <span className="slice-mark slice-mark-late">half</span>.
                    </>
                  ) : (
                    <>
                      Cut off <span className="slice-mark">{fractionWords(round.target)}</span> of {possessive(round.country)}{" "}
                      <span className="slice-mark slice-mark-late">{measure(round)}</span>.
                    </>
                  )}
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
          {finished && practice ? (
            <PracticeSummary country={practice} cut={g.game.cuts[0]} hinted={!!g.game.hints[0]} />
          ) : finished ? (
            <Summary number={number} preview={preview} puzzle={puzzle} cuts={g.game.cuts} hints={g.game.hints} viewing={viewing} onView={setViewing} />
          ) : g.phase === "cutting" ? (
            // Keyed apart from the result below: sharing one element, the result text
            // arrived at full opacity and faded out before the reveal (a flash of the score).
            <div key="cutting" className="flex flex-col gap-2.5">
              <p className={`px-1 text-[14px] ${message ? "font-semibold text-coral-deep" : "text-ink-soft"}`} aria-live="polite">
                {message ??
                  (g.game.again && g.game.last
                    ? `Second try. Your first cut took ${formatShare(g.game.last.share)} and scored ${g.game.last.score}. ${hasDraft ? "Press Slice when you're ready." : "Can you beat it?"}`
                    : hasDraft
                      ? "Drag either end to fine-tune, then press Slice."
                      : hintOn
                        ? `The ${cityCount > 1 ? "dots mark" : "dot marks"} ${biggest}. Your score isn't affected; your shared result just shows a 💡 for this round.`
                        : isPopulation
                          ? "Think about where most of the population lives, not how big the country looks. Drag across it to draw your cut."
                          : "Just the land this time: cities don't count. Drag across the country to draw your cut.")}
              </p>
              {/* The hint says what it does and what it costs on the button itself (developer's
                  call, 2026-10-31: a modal would be one more tap, and few read the how-to-play).
                  Every button on the card shares one shape (BUTTON): full-width rows, h-12, round. */}
              {isPopulation && cityCount > 0 && (
                <button
                  type="button"
                  onClick={takeHint}
                  disabled={hintOn}
                  aria-pressed={hintOn}
                  className={`${BUTTON} flex items-center justify-center gap-2 bg-card ring-1 ring-ink/15 transition-shadow hover:ring-ink/35 disabled:text-ink-soft disabled:ring-ink/10`}
                >
                  <HintIcon on={hintOn} />
                  <span>
                    {hintOn ? `Showing ${biggest}` : `Hint: show ${biggest}`}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={confirm}
                disabled={!hasDraft}
                className={`${BUTTON} bg-coral font-bold text-white transition-colors hover:bg-coral-strong disabled:bg-ink/10 disabled:text-ink-faint`}
              >
                Slice
              </button>
            </div>
          ) : cut ? (
            // Compact once cut, so the 3D board keeps most of a phone screen.
            <div key="result" className="flex flex-col gap-2">
              <p className="px-1 text-[15px] leading-snug">
                <span className="font-semibold">
                  {BAND_WORDS[bandOf(missOf(cut.share, round.target))]}. {cut.score} points.
                </span>{" "}
                You cut off {formatShare(cut.share)}. The aim was {formatShare(round.target)}.
              </p>
              <p className="px-1 text-[13px] leading-snug text-ink-soft" aria-live="polite">
                {g.phase === "result"
                  ? "Slice again to try to beat it, or keep it. The perfect cut shows once you're done."
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
                    onClick={again}
                    disabled={!revealDone}
                    className={`${BUTTON} flex-1 bg-card ring-1 ring-ink/15 transition-shadow hover:ring-ink/35`}
                  >
                    Slice again · {triesLeft(g.game)} left
                  </button>
                  <button
                    type="button"
                    onClick={keep}
                    disabled={!revealDone}
                    className={`${BUTTON} flex-1 bg-ink font-bold text-card`}
                  >
                    Keep this cut
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!perfectShown && (
                    <button
                      type="button"
                      onClick={showPerfect}
                      disabled={!revealDone}
                      className={`${BUTTON} flex-1 bg-card ring-1 ring-ink/15 transition-shadow hover:ring-ink/35`}
                    >
                      Show perfect cut
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={next}
                    disabled={!revealDone}
                    className={`${BUTTON} flex-1 bg-ink font-bold text-card`}
                  >
                    {practice ? "Done" : g.game.round + 1 >= puzzle.rounds.length ? "See results" : "Next round"}
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

/** The day so far in the top bar: each finished round's score, a dash for the rest, and a
 *  bulb on any round that used the hint (the current one as soon as it's taken). */
function RoundScores({ scores, hints }: { scores: (number | null)[]; hints: boolean[] }) {
  const done = scores.filter((s) => s !== null).length;
  return (
    <p className="flex gap-1" aria-label={`${done} of ${scores.length} rounds done`}>
      {scores.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`flex h-6 min-w-8 items-center justify-center gap-0.5 rounded-full px-1.5 text-xs font-bold tabular-nums ${
            s === null ? "bg-card/60 text-ink-faint" : "bg-card text-ink shadow-card"
          }`}
        >
          {s ?? "–"}
          {hints[i] && <HintMark />}
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
  hints,
  viewing,
  onView,
}: {
  number: number;
  preview: boolean;
  puzzle: Puzzle;
  cuts: SavedCut[];
  hints: boolean[];
  viewing: number;
  onView: (i: number) => void;
}) {
  const stats = useStats(storageKeyFor(preview), number);
  const points = totalScore(cuts);
  const max = maxScore(cuts.length);
  const comparison = useScoreComparison("slice", number, points, cuts.map((c) => c.score));
  const sheet = useRef<HTMLDivElement>(null);
  const nextGame = useNextDownstream();
  const yesterday = useYesterdayItem("/slice/", [GAME_KEY, PREVIEW_KEY], maxScore(4));
  // "Slice #4 312/400", then each round's score, with a 💡 after any round that took the
  // hint, then how it compares ("Top 28%") when there's anyone to compare with: no countries,
  // no answers.
  const text = shareText({
    game: GAME_NAME,
    number,
    points,
    maxPoints: max,
    detail: cuts.map((c, i) => `${c.score}${hints[i] ? "💡" : ""}`).join(" · "),
    standing: shareStanding(comparison, points),
    url: `${SITE_URL}/slice/`, // always the real address, whichever copy of the site is open
  });
  // The picture: one strip per round, showing how close the cut came to the aim.
  const rounds = cuts.map((c, i) => ({ share: c.share, target: puzzle.rounds[i].target, score: c.score }));
  const card = useShareCard(JSON.stringify([number, rounds]), `slice-${number}.png`, (ctx, f) => drawSliceCard(ctx, f, number, rounds, points, max));
  return (
    // The sheet scrolls; its blocks keep their size (in a flex column they'd shrink to fit).
    // On phones it stays low (about a third of the screen) so the board keeps most of it:
    // the score and Share show, the next card peeks in, and the fade at the bottom edge
    // says there's more below. On desktop it stays modest too, so the country can be big.
    // The strip under it is the "More below" pill's own, so the pill covers nothing.
    <>
    <div ref={sheet} className="sheet-fade flex max-h-[calc(34svh-20px)] flex-col gap-3 overflow-y-auto px-1 pb-5 *:shrink-0 lg:max-h-[36svh] [@media(max-height:720px)]:max-h-[calc(42svh-20px)] [@media(max-height:720px)]:gap-2">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em]">{preview ? "Yesterday\u2019s slices" : "Today\u2019s slices"}</h1>
        <p className="shrink-0 text-right">
          <span className="font-display text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{points}</span>
          <span className="text-sm text-ink-faint tabular-nums">/{max}</span>
        </p>
      </div>
      <ScoreStanding comparison={comparison} score={points} today={!preview} />
      <ShareButton
        game="slice"
        number={number}
        preview={preview}
        text={text}
        card={card}
        onTap={sound.tap}
        caption="How close you cut, never the countries."
      />
      {/* The next game is the main action after sharing, then the quieter choices. */}
      <NextUp from="slice" next={nextGame} tone={DOWNSTREAM_TONE} rows={[...(yesterday && !preview ? [yesterday] : []), practiceItem(number)]} />
      <ScoreChart
        game="slice"
        comparison={comparison}
        score={points}
        roundScores={cuts.map((c) => c.score)}
        roundNames={puzzle.rounds.map((r) => capitalise(r.country))}
        today={!preview}
        onTap={sound.tap}
      />

      <p className="-mb-1 text-xs text-ink-faint">
        Each cut starts at {MAX_SCORE} and halves for every {HALF_EVERY_POINTS} percentage points off.
      </p>
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
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {capitalise(r.country)}
                  {hints[i] && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-coral-deep">
                      <HintIcon on className="size-3.5" />
                      hint
                    </span>
                  )}
                </span>
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
      <SupportLine game="slice" />
    </div>
    <div className="pt-1">
      <ScrollHint ready={comparison.status !== "loading"} scroller={sheet} />
    </div>
    </>
  );
}

/** Practice countries as small links. Plain links: a fresh page load starts the board cleanly. */
function PracticeChips({ countries }: { countries: PracticeCountry[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {countries.map((c) => (
        <li key={c.slug}>
          <a
            href={`/slice/?country=${c.slug}`}
            className="block rounded-full bg-card px-3 py-1.5 text-[13px] font-semibold ring-1 ring-ink/15 transition-shadow hover:ring-coral-deep/60"
          >
            {c.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** On the day's summary: more to play, on countries from past days. */
/** Practice, as a row on the results screen. One country a day, in turn; its summary offers
 *  the others. A plain link: a fresh page load starts the board cleanly. */
function practiceItem(number: number): NextUpItem {
  const country = PRACTICE[number % PRACTICE.length];
  return {
    to: "practice",
    href: `/slice/?country=${country.slug}`,
    fullLoad: true,
    title: "Practice a past country",
    description: `Try ${country.name}. Never touches your streak.`,
    icon: (
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
        <path d="M6 9.5 14 5l12 4.5-1.5 11L17 27 6.5 22.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-ink-faint" />
        <path d="M3.5 19.5 28.5 10" fill="none" stroke="var(--color-coral)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2.6" />
      </svg>
    ),
  };
}

/** The end of a practice round: the score, then today's puzzle or another country. */
function PracticeSummary({ country, cut, hinted }: { country: PracticeCountry; cut: SavedCut; hinted: boolean }) {
  const today = useSliceToday();
  const nextGame = useNextDownstream();
  return (
    <div className="flex flex-col gap-3 px-1 pb-1">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
            Practice: {country.name}
            <span className="text-coral">.</span>
          </h1>
          <p className="text-xs text-ink-faint">Practice doesn&apos;t count toward your score, streak or stats.</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-display text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{cut.score}</span>
          <span className="text-sm text-ink-faint tabular-nums">/{MAX_SCORE}</span>
          {hinted && (
            <span className="mt-1 flex items-center justify-end gap-0.5 text-xs font-medium text-coral-deep">
              <HintIcon on className="size-3.5" />
              hint
            </span>
          )}
        </p>
      </div>
      {/* The one coral action: today's puzzle, while it's still to play. */}
      {today && !today.result && (
        <a
          href="/slice/"
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-coral text-[18px] font-bold text-white transition-colors hover:bg-coral-strong"
        >
          Play today&apos;s Slice
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
      {/* Then the other game: practice was pulling players away from Downstream (2026-10-27). */}
      <NextUp from="slice" next={nextGame} tone={DOWNSTREAM_TONE} />
      <div>
        {/* No "try again": today's puzzle is the next step (developer's call, 2026-10-23). */}
        <p className="mb-2 text-sm font-semibold text-ink-soft">Practice another</p>
        <PracticeChips countries={otherPractice(country.slug)} />
      </div>
      {today?.result && <Countdown prefix="New countries in" className="text-center text-sm text-ink-soft" />}
    </div>
  );
}

/** Done with Slice: point to today's Downstream, unless it's already been played today. */
const DOWNSTREAM_TONE = "bg-sea ring-drop/15 hover:ring-drop/40";

/** Today's Downstream as the results screen's next step, or null once it's done. */
function useNextDownstream(): NextUpItem | null {
  const today = useDownstreamToday();
  if (!today || today.result) return null; // still reading storage, or Downstream is done
  return {
    to: "downstream",
    href: "/downstream/",
    title: "Next: today's Downstream",
    description: "A raindrop lands somewhere on Earth. Which sea does it reach?",
    icon: (
      <svg viewBox="0 0 24 24" className="size-8 text-drop" aria-hidden="true">
        <path d="M12 2.5c3.2 4.3 6.5 8.4 6.5 12a6.5 6.5 0 0 1-13 0c0-3.6 3.3-7.7 6.5-12Z" fill="currentColor" />
        <path d="M9 15.5a3 3 0 0 0 2.5 2.8" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  };
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
          {load.status === "missing"
            ? "Today's countries are still being cut. Check back soon."
            : load.status === "noPractice"
              ? "That country isn't open for practice yet."
              : "That puzzle isn't available. Only today's and yesterday's puzzles can be played."}
        </p>
        <Countdown prefix="New countries in" className="mt-3 block text-ink-soft" />
        {/* A plain link: ?puzzle= is gone after a fresh load of /slice/. */}
        <a href="/slice/" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-deep">
          Play today&apos;s puzzle
          <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
            <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </div>
  );
}
