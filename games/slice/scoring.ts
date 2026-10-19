// All Slice scoring knobs, in one place. Placeholders until the playtest.
//
// A cut is scored on the piece whose share is closer to the target ("You cut off
// 31.4%. Target 33.3%."). The miss is RELATIVE to the target: 3 points off a 10% target
// is a far worse cut than 3 points off 50%. A target of 90% is the same cut as 10%
// from the other side, so the miss is measured against the smaller of the two.

import { positiveCounts, share } from "./cut";
import type { Line, Round } from "./types";

/** Upper bounds on the miss, as a fraction of the target (0.02 = within 2% of it),
 *  for each square. At a 50% target these are 1, 3 and 8 percentage points. */
export const THRESHOLDS = [0.02, 0.06, 0.16];
// One square per tier, best first, then the miss. Distinct hues: 🟨 and 🟧 look alike
// on Windows (the lesson from Downstream), so they're never neighbours.
export const EMOJI_BY_TIER = ["🟩", "🟦", "🟨"];
export const EMOJI_MISS = "🟥";
export const POINTS_BY_TIER = [3, 2, 1];

/** What each square means, for a legend. */
export const EMOJI_LEGEND: [string, string][] = [
  ...EMOJI_BY_TIER.map((e, i): [string, string] => [e, `within ${THRESHOLDS[i] * 100}%`]),
  [EMOJI_MISS, "further off"],
];

export type CutResult = {
  share: number; // the counted piece's share, 0..1 ("You cut off 31.4%")
  miss: number; // |share - target| / min(target, 1 - target)
  tier: number; // index into THRESHOLDS; THRESHOLDS.length = missed them all
  positive: boolean; // the counted piece is on the line's positive side
};

export function relativeMiss(share: number, target: number): number {
  return Math.abs(share - target) / Math.min(target, 1 - target);
}

export function tierOf(miss: number): number {
  const i = THRESHOLDS.findIndex((t) => miss < t);
  return i === -1 ? THRESHOLDS.length : i;
}

/** Score one cut. Pure: the same round and line always give the same result. */
export function scoreCut(round: Round, line: Line): CutResult {
  const s = share(round, line);
  const positive = positiveCounts(s, round.target);
  const counted = positive ? s : 1 - s;
  const miss = relativeMiss(counted, round.target);
  return { share: counted, miss, tier: tierOf(miss), positive };
}

export function cutEmoji(result: Pick<CutResult, "tier">): string {
  return EMOJI_BY_TIER[result.tier] ?? EMOJI_MISS;
}

export function cutPoints(result: Pick<CutResult, "tier">): number {
  return POINTS_BY_TIER[result.tier] ?? 0;
}

export function totalPoints(results: Pick<CutResult, "tier">[]): number {
  return results.reduce((sum, r) => sum + cutPoints(r), 0);
}

export function maxPoints(roundCount: number): number {
  return roundCount * POINTS_BY_TIER[0];
}

/** "33.3%", "10%", "50%": a share as the game shows it. */
export function formatShare(share: number): string {
  const pct = Math.round(share * 1000) / 10;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`;
}
