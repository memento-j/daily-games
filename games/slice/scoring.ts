// All Slice scoring knobs, in one place. Placeholders until the playtest.
//
// A cut is scored on the piece whose share is closer to the target ("You cut off
// 31.4%. The aim was 33.3%."). Every cut starts at 100 and loses 10 for each
// percentage point it's off, down to 0: 1 point off scores 90, 3 off 70, 10 off 0. The
// day is the sum, out of 400 for four rounds (developer's call, 2026-10-19: a real
// score suits a precision game better than Wordle-style squares, which Downstream keeps).
//
// The miss is the plain gap in percentage points, the number the player sees, so the
// same miss scores the same on every round. (Until 2026-10-19 it was relative to the
// target, so 3 points off was fine at 50% but poor at 10%; a tester found that
// inconsistent.)

import { positiveCounts, share } from "./cut";
import type { Line, Round } from "./types";

export const MAX_SCORE = 100; // a perfect cut
export const LOSS_PER_POINT = 10; // lost for each percentage point off

/** Bands for the words and the closing sound ("Spot on", "So close", "Not bad",
 *  "Way off"): the lowest score in each, best first. 90 / 70 / 20 are 1, 3 and 8
 *  points off. */
export const BANDS = [90, 70, 20];

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

/** A cut's score from its miss: 100, minus 10 per percentage point off, never below 0. */
export function scoreOf(miss: number): number {
  // Round the miss to a hundredth of a point first: 0.47 - 0.5 is
  // 0.030000000000000027 in floating point, and 3 points off should score exactly 70.
  const points = Math.round(miss * 100 * 100) / 100;
  return Math.max(0, Math.round(MAX_SCORE - points * LOSS_PER_POINT));
}

/** 0 = best band ... BANDS.length = below them all. */
export function bandOf(score: number): number {
  const i = BANDS.findIndex((b) => score >= b);
  return i === -1 ? BANDS.length : i;
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
