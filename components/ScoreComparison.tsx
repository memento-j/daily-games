"use client";

// How a finished daily puzzle compares with everyone else's, on both games' results screens.
// ScoreSummary sits right under the score: a compact chart of the day's totals and one line,
// "Better than X% of today's players". ScoreChart sits in the round breakdown further down: the
// same chart with a switch between the total and each round. The data comes from the scores API
// (lib/scores.ts); the player's own scores from the game.
//
// Nothing here ever blocks the result: while waiting there's an empty scale and one quiet line,
// and if the server can't be reached that line says so. No head counts anywhere, only shares
// (developer's call, 2026-11-03: small numbers would read as an empty room).

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
  isFirstPlayer,
  loadComparison,
  playerCount,
  type LoadedScores,
  type ScoreCount,
  type ScoreGame,
  type ScoresResponse,
} from "@/lib/scores";

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

/** "12%", or "under 1%" rather than a 0% for a bar that plainly has someone in it. */
function shareOf(count: number, players: number): string {
  if (count === 0) return "0%";
  const percent = Math.round((count / players) * 100);
  return percent === 0 ? "Under 1%" : `${percent}%`;
}

const range = (b: { from: number; to: number }) => (b.from === b.to ? `${b.from}` : `${b.from}–${b.to}`);

function chartOf(counts: ScoreCount[], max: number, size: number) {
  const bars = buckets(counts, max, size);
  const players = playerCount(counts);
  return {
    bars,
    max,
    size,
    players,
    // A floor on the scale, so with few players one person's bar isn't a full-height tower.
    top: Math.max(MIN_SCALE, ...bars.map((b) => b.count)),
    mean: averageScore(counts),
    hasMean: players >= MIN_PLAYERS_FOR_AVERAGE,
  };
}
type Chart = ReturnType<typeof chartOf>;

/** The bars, the player's marked, the average dashed, and the axis. `own` null: an empty scale. */
function Bars({
  chart,
  own,
  heightClass,
  active = null,
  onPoint,
}: {
  chart: Chart;
  own: number | null;
  /** The height of the bars themselves; "You" sits in a row above and the axis below. */
  heightClass: string;
  active?: number | null;
  /** Pointing at bars, on the chart that has a readout. */
  onPoint?: (bar: number | null) => void;
}) {
  const ownBar = own === null ? -1 : bucketIndex(own, chart.bars.length, chart.size);
  const height = (y: number) => (y / chart.top) * 100;
  const meanX = chartX(chart.mean, chart.max, chart.size) * 100;
  return (
    <div className="pt-4">
      <div
        role="img"
        aria-label={own === null ? "No scores yet." : "Bars of how many players got each score. The table that follows has the same numbers."}
        tabIndex={onPoint ? 0 : undefined}
        onKeyDown={
          onPoint &&
          ((e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const step = e.key === "ArrowLeft" ? -1 : 1;
            onPoint(Math.max(0, Math.min((active ?? ownBar) + step, chart.bars.length - 1)));
          })
        }
        onBlur={onPoint && (() => onPoint(null))}
        onPointerLeave={onPoint && ((e) => e.pointerType === "mouse" && onPoint(null))}
        className={`relative flex items-end gap-0.5 rounded-sm border-b border-ink/15 outline-offset-4 focus-visible:outline-2 focus-visible:outline-coral-deep ${heightClass}`}
      >
        {chart.bars.map((b, i) => {
          const mine = i === ownBar;
          return (
            <div
              key={b.from}
              onPointerEnter={onPoint && ((e) => e.pointerType === "mouse" && onPoint(i))}
              onClick={onPoint && (() => onPoint(active === i ? null : i))}
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
        {chart.hasMean && <span style={{ left: `${meanX}%` }} className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-ink/45" />}
      </div>
      <ChartAxis bars={chart.bars} max={chart.max} mean={chart.hasMean ? { x: meanX, value: Math.round(chart.mean) } : null} />
      {own !== null && (
        <table className="sr-only">
          <caption>Scores. You scored {own}.</caption>
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
      )}
    </div>
  );
}

/** A few bars (Downstream's rounds, 0-4) label each bar, with the average on a line under
 *  them; many get the two ends, with the average between them. */
function ChartAxis({ bars, max, mean }: { bars: { from: number }[]; max: number; mean: { x: number; value: number } | null }) {
  const row = "relative mt-1 flex h-4 text-[11px] leading-4 text-ink-faint tabular-nums";
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

const CAPTION = "text-[13px] leading-[18px] text-ink-faint";
const NO_SCORES: ScoreCount[] = [];

function betterThan(counts: ScoreCount[], own: number, today: boolean): string {
  return `Better than ${betterThanPercent(counts, own)}% of ${today ? "today" : "yesterday"}’s players`;
}

/** Under the score: the day's totals and where the player stands. The chart's room is held while
 *  the numbers load, so the buttons below don't move when they arrive. */
export function ScoreSummary({ game, comparison, score, today }: { game: ScoreGame; comparison: Comparison; score: number; today: boolean }) {
  const scale = CHART_SCALES[game];
  const counts = comparison.status === "ready" ? comparison.data.totalScores : NO_SCORES;
  const chart = useMemo(() => chartOf(counts, scale.maxRound * scale.rounds, scale.totalBucket), [counts, scale]);

  if (comparison.status === "failed") return <p className={CAPTION}>Other players&apos; scores aren&apos;t available right now.</p>;
  if (comparison.status === "ready" && isFirstPlayer(counts)) {
    // Counted after includePlayer, so the player is always in here: nobody to compare with yet.
    return (
      <p aria-live="polite" className="text-sm leading-snug text-ink-soft">
        You&apos;re the first to play {today ? "today" : "this puzzle"}. Check back later to see how others did.
      </p>
    );
  }
  const ready = comparison.status === "ready";
  return (
    <div className="flex flex-col gap-1">
      <Bars chart={chart} own={ready ? score : null} heightClass="h-[76px] lg:h-24" />
      <p aria-live="polite" className={CAPTION}>
        {ready ? betterThan(counts, score, today) : "Comparing with other players…"}
      </p>
    </div>
  );
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

/** In the round breakdown: the same chart, for the total or any one round. Opens on the first
 *  round, as the total is already at the top of the screen. */
export function ScoreChart({ game, comparison, score, roundScores, roundNames, today, onTap }: Props) {
  const [view, setView] = useState(1); // 0 = total, 1.. = that round
  const [active, setActive] = useState<number | null>(null); // the bar being pointed at
  const data = comparison.status === "ready" ? comparison.data : null;
  const scale = CHART_SCALES[game];
  const counts = useMemo(() => (!data ? [] : view > 0 ? data.roundScores.filter((r) => r.round === view) : data.totalScores), [data, view]);
  const chart = useMemo(
    () => (view > 0 ? chartOf(counts, scale.maxRound, scale.roundBucket) : chartOf(counts, scale.maxRound * scale.rounds, scale.totalBucket)),
    [counts, view, scale],
  );

  // Nobody to compare with: ScoreSummary has said so.
  if (!data || isFirstPlayer(data.totalScores)) return null;

  const own = view > 0 ? (roundScores[view - 1] ?? 0) : score;
  const pointed = active !== null ? chart.bars[active] : null;

  function choose(next: number) {
    if (next === view) return;
    // Counted first, so nothing the tap does afterwards can lose it.
    track("distribution_viewed", { game, view: next === 0 ? "total" : `round_${next}` });
    onTap?.();
    setView(next);
    setActive(null);
  }

  return (
    <section aria-label="How each round compares" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="font-display text-[17px] leading-tight font-semibold tracking-[-0.02em]">{today ? "Today" : "Yesterday"}&apos;s scores</h2>
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

      <Bars chart={chart} own={own} heightClass="h-28" active={active} onPoint={setActive} />
      <p className={CAPTION}>{betterThan(counts, own, today)}</p>
    </section>
  );
}
