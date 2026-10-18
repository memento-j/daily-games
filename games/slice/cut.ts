// What a straight cut does to a country: the share of its land or people on one
// side, whether the line crosses it at all, and the perfect cut at the same angle.

import { area, clipRings, dot, offsetRange } from "./geometry";
import type { Line, PeoplePoint, Point, Ring, Round } from "./types";

/** Share of the outline's area on the line's positive side, 0..1. */
export function areaShare(rings: Ring[], line: Line): number {
  const total = area(rings);
  return total > 0 ? area(clipRings(rings, line)) / total : 0;
}

/** Share of the people on the line's positive side, 0..1. */
export function peopleShare(points: PeoplePoint[], line: Line): number {
  let total = 0;
  let side = 0;
  for (const p of points) {
    total += p[2];
    if (p[0] * line.normal[0] + p[1] * line.normal[1] > line.offset) side += p[2];
  }
  return total > 0 ? side / total : 0;
}

/** The share the round measures (land or people) on the line's positive side. */
export function share(round: Round, line: Line): number {
  return round.mode === "population" && round.points ? peopleShare(round.points, line) : areaShare(round.outline, line);
}

/** Does the line actually cut through the country (land on both sides)? */
export function crosses(round: Round, line: Line): boolean {
  const s = areaShare(round.outline, line);
  return s > 1e-6 && s < 1 - 1e-6;
}

/** Of the two pieces, does the positive side count? The piece whose share is closer
 *  to the target is the one the player meant to cut off (for 1/3, either the third or
 *  the two thirds can be "the slice"; the player shouldn't have to pick a side). */
export function positiveCounts(positiveShare: number, target: number): boolean {
  return Math.abs(positiveShare - target) <= Math.abs(1 - positiveShare - target);
}

/** The perfect cut at the player's angle: the line parallel to `line` that cuts off
 *  the target, on the same side the player's cut is counted on. */
export function perfectLine(round: Round, line: Line): Line {
  const counts = positiveCounts(share(round, line), round.target);
  const want = counts ? round.target : 1 - round.target;
  const offset =
    round.mode === "population" && round.points
      ? peopleOffset(round.points, line.normal, want)
      : areaOffset(round.outline, line.normal, want);
  return { normal: line.normal, offset };
}

/** Binary search on the offset: sliding the line along its normal only shrinks the
 *  positive side, from all the land to none. */
function areaOffset(rings: Ring[], normal: Point, want: number): number {
  let [lo, hi] = offsetRange(rings, normal);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (areaShare(rings, { normal, offset: mid }) > want) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** People come in points, so the share moves in steps and a binary search can stop
 *  on the wrong side of one. Instead: walk the points from the positive end, and cut
 *  midway between the two neighbours where the running total gets closest to `want`. */
function peopleOffset(points: PeoplePoint[], normal: Point, want: number): number {
  const total = points.reduce((sum, p) => sum + p[2], 0);
  // Points at the same distance along the normal can't be separated: group them.
  const sorted = points.map((p) => [dot([p[0], p[1]], normal), p[2]]).sort((a, b) => b[0] - a[0]);
  const steps: [number, number][] = []; // [distance, people], furthest first
  for (const [d, w] of sorted) {
    const last = steps[steps.length - 1];
    if (last && last[0] - d < 1e-9) last[1] += w;
    else steps.push([d, w]);
  }
  let best = steps[0][0] + 1; // nothing on the positive side
  let bestGap = want;
  let cum = 0;
  for (let i = 0; i < steps.length; i++) {
    cum += steps[i][1] / total;
    const gap = Math.abs(cum - want);
    if (gap < bestGap) {
      bestGap = gap;
      best = i + 1 < steps.length ? (steps[i][0] + steps[i + 1][0]) / 2 : steps[i][0] - 1;
    }
    if (cum >= want) break;
  }
  return best;
}
