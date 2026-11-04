"use client";

// How a finished daily puzzle compares with everyone else's, on both games' summaries: the
// one-line standing under the score (ScoreStanding, with a link down to the chart) and the
// chart (ScoreChart): real scores as bars, the player's marked, and the average. The data comes
// from the scores API (lib/scores.ts); the player's own scores from the game.
//
// Nothing here ever blocks the result: while waiting there's one quiet line, and if the
// server can't be reached that line says so and the chart isn't shown. No head counts
// anywhere, only shares (developer's call, 2026-11-03: small numbers would read as an empty
// room). The share text carries the same standing, as "Top X%" (shareStanding).

import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import {
  averageScore,
  betterThanPercent,
  bucketIndex,
  buckets,
  CHART_SCALES,
  chartX,
  includePlayer,
  loadComparison,
  isFirstPlayer,
  playerCount,
  standingLine,
  type LoadedScores,
  type ScoreGame,
  type ScoresResponse,
} from "@/lib/scores";

const CHART_ID = "score-chart";
/** Under this many players the chart says it's still filling in. */
const FEW_PLAYERS = 10;
/** An average of one or two scores isn't saying anything. */
const MIN_PLAYERS_FOR_AVERAGE = 3;
/** The chart's tallest bar stands for at least this many players. */
const MIN_SCALE = 3;

export type Comparison = { status: "loading" } | { status: "failed" } | { status: "ready"; data: ScoresResponse };

export function useScoreComparison(game: ScoreGame, puzzle: number, score: number, roundScores: number[]): Comparison {
  const [loaded, setLoaded] = useState<{ puzzle: number; result: LoadedScores | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadComparison(game, puzzle).then(
      (result) => !cancelled && setLoaded({ puzzle, result }),
      () => !cancelled && setLoaded({ puzzle, result: null }),
    );
    return () => {
      cancelled = true;
    };
  }, [game, puzzle]);
  // Once, here, before the chart and the percentile, so they always agree.
  const rounds = roundScores.join();
  return useMemo((): Comparison => {
    if (loaded?.puzzle !== puzzle) return { status: "loading" };
    if (!loaded.result) return { status: "failed" };
    const { data, fromRead } = loaded.result;
    return { status: "ready", data: fromRead ? includePlayer(data, score, rounds === "" ? [] : rounds.split(",").map(Number)) : data };
  }, [loaded, puzzle, score, rounds]);
}

/** Scrolls only what holds the chart: the summary's own sheet where it has one (Slice, and
 *  Downstream's sidebar), so the page behind doesn't move and show empty table. */
export function scrollToChart() {
  const chart = document.getElementById(CHART_ID);
  if (!chart) return;
  const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  let box = chart.parentElement;
  while (box && !(/auto|scroll/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
  if (box) box.scrollBy({ top: chart.getBoundingClientRect().top - box.getBoundingClientRect().top - 8, behavior });
  else chart.scrollIntoView({ behavior, block: "start" });
  chart.focus({ preventScroll: true });
}

/** The line under the score, and the way down to the chart. Its height is held from the
 *  start, so nothing shifts when it fills in. */
export function ScoreStanding({ comparison, score, today }: { comparison: Comparison; score: number; today: boolean }) {
  const players = comparison.status === "ready" ? playerCount(comparison.data.totalScores) : 0;
  // The button keeps nudging until the player has seen the chart, by tapping it or scrolling
  // to it, and then rests: it's an invitation, not a nag.
  const [chartSeen, setChartSeen] = useState(false);
  const hasChart = players > 0;
  useEffect(() => {
    const chart = document.getElementById(CHART_ID);
    if (!hasChart || !chart) return;
    const watch = new IntersectionObserver(([entry]) => entry.isIntersecting && setChartSeen(true), { threshold: 0.6 });
    watch.observe(chart);
    return () => watch.disconnect();
  }, [hasChart]);
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm leading-tight lg:min-h-9 lg:text-[17px]" aria-live="polite">
      {comparison.status === "loading" && <p className="text-ink-faint">Comparing with other players…</p>}
      {comparison.status === "failed" && <p className="text-ink-faint">Other players&apos; scores aren&apos;t available right now.</p>}
      {comparison.status === "ready" && <p className="text-ink-soft">{standingText(comparison.data, score, today)}</p>}
      {players > 0 && (
        <button
          type="button"
          onClick={() => {
            setChartSeen(true);
            scrollToChart();
          }}
          className={`relative flex h-7 shrink-0 items-center gap-1 rounded-full bg-coral-soft pr-2 pl-2.5 text-[13px] font-semibold whitespace-nowrap text-coral-deep transition-[scale] duration-150 after:absolute after:inset-x-0 after:-inset-y-2 hover:scale-105 active:scale-95 lg:h-9 lg:pr-3 lg:pl-3.5 lg:text-[15px] ${
            chartSeen ? "" : "see-scores-idle"
          }`}
        >
          See scores
          <svg viewBox="0 0 20 20" className="see-scores-arrow size-3.5 lg:size-4" aria-hidden="true">
            <path d="M10 4v11M5.5 11 10 15.5 14.5 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function standingText(data: ScoresResponse, score: number, today: boolean) {
  // Counted after includePlayer, so the player is always in here.
  if (isFirstPlayer(data.totalScores)) return today ? "You're first to play today" : "You're first to play this one";
  return (
    <>
      You beat{" "}
      <strong className="font-display text-[18px] leading-none font-semibold tracking-[-0.02em] text-ink lg:text-[26px]">{betterThanPercent(data.totalScores, score)}%</strong> of
      players so far
    </>
  );
}

/** The share text's "Top 28%": there whenever "You beat" is, gone when the player is first. */
export function shareStanding(comparison: Comparison, score: number): string | undefined {
  return comparison.status === "ready" ? (standingLine(comparison.data.totalScores, score) ?? undefined) : undefined;
}

type Props = {
  game: ScoreGame;
  comparison: Comparison;
  score: number;
  roundScores: number[];
  /** What each round was (a country, a sea), for the line above a round's chart. */
  roundNames: string[];
  today: boolean;
  /** The game's own button sound. */
  onTap?: () => void;
};

/** "12%", or "under 1%" rather than a 0% for a bar that plainly has someone in it. */
function shareOf(count: number, players: number): string {
  if (count === 0) return "0%";
  const percent = Math.round((count / players) * 100);
  return percent === 0 ? "Under 1%" : `${percent}%`;
}

/** The chart of the day's scores, with a switch between the total and each round. */
export function ScoreChart({ game, comparison, score, roundScores, roundNames, today, onTap }: Props) {
  const [view, setView] = useState(0); // 0 = total, 1.. = that round
  const [active, setActive] = useState<number | null>(null); // the bar being pointed at
  const data = comparison.status === "ready" ? comparison.data : null;
  const scale = CHART_SCALES[game];
  const chart = useMemo(() => {
    if (!data) return null;
    const counts = view > 0 ? data.roundScores.filter((r) => r.round === view) : data.totalScores;
    const max = view > 0 ? scale.maxRound : scale.maxRound * scale.rounds;
    const size = view > 0 ? scale.roundBucket : scale.totalBucket;
    const bars = buckets(counts, max, size);
    const players = playerCount(counts);
    // A floor on the scale, so with few players one person's bar isn't a full-height tower.
    const top = Math.max(MIN_SCALE, ...bars.map((b) => b.count));
    return { bars, max, size, players, top, mean: averageScore(counts), hasMean: players >= MIN_PLAYERS_FOR_AVERAGE };
  }, [data, view, scale]);

  if (!data || !chart || playerCount(data.totalScores) === 0) return null;

  const own = view > 0 ? (roundScores[view - 1] ?? 0) : score;
  const ownBar = bucketIndex(own, chart.bars.length, chart.size);
  const pointed = active !== null ? chart.bars[active] : null;
  const range = (b: { from: number; to: number }) => (b.from === b.to ? `${b.from}` : `${b.from}–${b.to}`);
  const height = (y: number) => (y / chart.top) * 100;
  const meanX = chartX(chart.mean, chart.max, chart.size) * 100;

  function choose(next: number) {
    if (next === view) return;
    onTap?.();
    setView(next);
    setActive(null);
    track("distribution_viewed", { game, view: next === 0 ? "total" : `round_${next}` });
  }

  return (
    <section id={CHART_ID} tabIndex={-1} aria-label="How your score compares" className="flex scroll-mt-2 flex-col gap-3 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="font-display text-[17px] leading-tight font-semibold tracking-[-0.02em]">
          {today ? "Today" : "Yesterday"}&apos;s scores<span className="text-coral">.</span>
        </h2>
        {/* A switch rather than tabs of cards: one track, one raised choice. */}
        <div className="flex rounded-full bg-land p-0.5" role="group" aria-label="Which scores to show">
          {["Total", ...roundNames.map((_, i) => `R${i + 1}`)].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={view === i}
              aria-label={i === 0 ? "Total" : `Round ${i}: ${roundNames[i - 1]}`}
              className={`relative h-8 rounded-full px-2.5 text-xs font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-200 after:absolute after:inset-x-0 after:-inset-y-1.5 ${
                view === i ? "bg-card text-ink shadow-[0_1px_3px_rgb(18_26_43/0.18)]" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* The readout: the player against the average, or the bar under the pointer. In a fixed
          line rather than a floating tooltip, which the scrolling sheet would clip. */}
      <p className="min-h-5 text-sm leading-5 text-ink-soft tabular-nums" aria-hidden="true">
        {pointed ? (
          <>
            <strong className="font-semibold text-ink">{shareOf(pointed.count, chart.players)}</strong> scored {range(pointed)}
          </>
        ) : (
          <>
            {view > 0 && <span className="text-ink-faint">{roundNames[view - 1]} · </span>}
            You <strong className="font-semibold text-ink">{own}</strong>
            {chart.hasMean && (
              <>
                {" "}
                · Average <strong className="font-semibold text-ink">{Math.round(chart.mean)}</strong>
              </>
            )}
          </>
        )}
      </p>

      <div className="pt-5">
        <div
          role="img"
          aria-label="Bars of how many players got each score. The table that follows has the same numbers."
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const step = e.key === "ArrowLeft" ? -1 : 1;
            setActive(Math.max(0, Math.min((active ?? ownBar) + step, chart.bars.length - 1)));
          }}
          onBlur={() => setActive(null)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          className="relative flex h-28 items-end gap-0.5 rounded-sm border-b border-ink/15 outline-offset-4 focus-visible:outline-2 focus-visible:outline-coral-deep"
        >
          {chart.bars.map((b, i) => {
            const mine = i === ownBar;
            return (
              <div
                key={b.from}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                onClick={() => setActive(active === i ? null : i)}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center"
              >
                {mine && (
                  // Not colour alone: the player's bar is named, in a row above everything so
                  // a taller neighbour can't cover it, with a thin line down.
                  <>
                    <span
                      className={`absolute bottom-full z-10 rounded-full bg-coral px-1.5 text-[11px] leading-4 font-bold text-white ${
                        i < 2 ? "left-0" : i > chart.bars.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      You
                    </span>
                    <span
                      style={{ bottom: `${height(b.count)}%` }}
                      className="absolute top-0 left-1/2 w-px -translate-x-1/2 bg-coral transition-[bottom] duration-300 ease-out motion-reduce:transition-none"
                    />
                  </>
                )}
                <div
                  // From a single baseline, rounded at the top; the player's own bar always shows.
                  style={{ height: `${height(b.count)}%` }}
                  // An empty score is a low stub, so sparse days still read as a scale, not gaps.
                  className={`w-full max-w-7 rounded-t-[3px] transition-[height,background-color] duration-300 ease-out motion-reduce:transition-none ${
                    mine ? "min-h-1 bg-coral" : b.count === 0 ? "min-h-[3px] bg-ink/6" : active === i ? "min-h-1 bg-ink/40" : "min-h-1 bg-ink/18"
                  }`}
                />
              </div>
            );
          })}
          {/* The average; its number is in the line above and under the axis. */}
          {chart.hasMean && <span style={{ left: `${meanX}%` }} className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-ink/45" />}
        </div>

        <ChartAxis bars={chart.bars} max={chart.max} mean={chart.hasMean ? { x: meanX, value: Math.round(chart.mean) } : null} />

        <table className="sr-only">
          <caption>
            {view > 0 ? `Scores on round ${view}, ${roundNames[view - 1]}` : "Total scores"}. You scored {own}.
          </caption>
          <thead>
            <tr>
              <th scope="col">Score</th>
              <th scope="col">Share of players</th>
            </tr>
          </thead>
          <tbody>
            {chart.bars.map((b) => (
              <tr key={b.from}>
                <td>{range(b)}</td>
                <td>{shareOf(b.count, chart.players)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chart.players < FEW_PLAYERS && <p className="text-xs text-ink-faint">Fills in as more people play.</p>}
    </section>
  );
}

/** A few bars (Downstream's rounds, 0-4) label each bar, with the average on a line under
 *  them; many get the two ends, with the average between them. */
function ChartAxis({ bars, max, mean }: { bars: { from: number }[]; max: number; mean: { x: number; value: number } | null }) {
  const row = "relative mt-1.5 flex h-4 text-[11px] leading-4 text-ink-faint tabular-nums";
  const average = mean && (
    <span style={{ left: `${Math.max(12, Math.min(mean.x, 88))}%` }} className="absolute -translate-x-1/2 font-semibold whitespace-nowrap text-ink-soft">
      avg {mean.value}
    </span>
  );
  if (bars.length <= 6) {
    return (
      <div aria-hidden="true">
        <div className={row}>
          {bars.map((b) => (
            <span key={b.from} className="flex-1 text-center">
              {b.from}
            </span>
          ))}
        </div>
        {average && <div className="relative h-4 text-[11px] leading-4 tabular-nums">{average}</div>}
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`${row} justify-between`}>
      <span>0</span>
      {average}
      <span>{max}</span>
    </div>
  );
}
