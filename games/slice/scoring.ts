// All Slice scoring knobs, in one place. Placeholders until the playtest.
//
// A cut is scored on the piece whose share is closer to the target ("You cut off
// 47.7%. The aim was 50%."). Every cut starts at 100 and halves for every 7 percentage
// points it's off: 1 off scores 91, 3 off 74, 7 off 50, 10 off 37, 20 off 14. The day is
// the sum, out of 400 for four rounds (developer's call, 2026-10-19: a real score suits
// a precision game better than Wordle-style squares, which Downstream keeps).
//
// A curve, not a straight line (developer's call, 2026-10-22, from player feedback):
// it used to lose 10 per point, so anything 10+ off scored 0, and many players saw 0
// too often. Halving keeps 100 hard (the first points off cost the most) while a
// reasonable miss still earns something; only a wild cut gets near 0.
//
// The miss is the plain gap in percentage points, the number the player sees, so the
// same miss scores the same on every round. (Until 2026-10-19 it was relative to the
// target, so 3 points off was fine at 50% but poor at 10%; a tester found that
// inconsistent.)

import { positiveCounts, share } from "./cut";
import type { Line, Round } from "./types";

export const MAX_SCORE = 100; // a perfect cut
export const HALF_EVERY_POINTS = 7; // the score halves for every this many percentage points off

export type CutResult = {
  share: number; // the counted piece's share, 0..1 ("You cut off 31.4%")
  miss: number; // |share - target|, 0..1 (0.03 = 3 percentage points)
  score: number; // 0..100, whole numbers
  positive: boolean; // the counted piece is on the line's positive side
};

/** How far the cut is from the target, in percentage points (as a fraction). */
export function missOf(share: number, target: number): number {
  return Math.abs(share - target);
}

/** A cut's score from its miss: 100, halving for every HALF_EVERY_POINTS points off. */
export function scoreOf(miss: number): number {
  // Round the miss to a hundredth of a point first: 0.47 - 0.5 is
  // 0.030000000000000027 in floating point, and 3 points off should score exactly as 3.
  const points = Math.round(miss * 100 * 100) / 100;
  return Math.round(MAX_SCORE * 0.5 ** (points / HALF_EVERY_POINTS));
}

/** The words and the closing sound ("Spot on", "Pretty close", "Not bad", "Way off") go by
 *  how far off the cut is, in percentage points, not by its score: up to 1 off, up to
 *  5, under 10, then 10 or more. Lenient on purpose (developer's call, 2026-10-22:
 *  8.6 points off read "Way off", which felt harsh); "Way off" means 10+. (By miss
 *  rather than score because near 10 off, misses either side round to the same score.) */
export const BAND_POINTS = [1, 5, 10];

/** 0 = best band ... BAND_POINTS.length = way off. */
export function bandOf(miss: number): number {
  const points = Math.round(miss * 100 * 100) / 100; // as in scoreOf
  if (points <= BAND_POINTS[0]) return 0;
  if (points <= BAND_POINTS[1]) return 1;
  return points < BAND_POINTS[2] ? 2 : 3;
}

/** Score one cut. Pure: the same round and line always give the same result. */
export function scoreCut(round: Round, line: Line): CutResult {
  const s = share(round, line);
  const positive = positiveCounts(s, round.target);
  const counted = positive ? s : 1 - s;
  const miss = missOf(counted, round.target);
  return { share: counted, miss, score: scoreOf(miss), positive };
}

export function totalScore(results: Pick<CutResult, "score">[]): number {
  return results.reduce((sum, r) => sum + r.score, 0);
}

export function maxScore(roundCount: number): number {
  return roundCount * MAX_SCORE;
}

/** "33.3%", "10%", "50%": a share as the game shows it. */
export function formatShare(share: number): string {
  const pct = Math.round(share * 1000) / 10;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`;
}
