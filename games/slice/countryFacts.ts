// Facts about a country's population, measured from a Slice round (the same outline and
// people points the game scores with). Used by the country pages (/countries/...), at
// build time. Pure, so it's unit tested.
//
// Coordinates are the puzzle's: a 0..1000 box on an equal-area map of the country, y
// pointing down, so north is -y.

import { areaShare, peopleShare, perfectLine } from "./cut";
import { clipRings, lineAt } from "./geometry";
import type { Line, Point, Ring, Round } from "./types";

const COMPASS = ["east", "north-east", "north", "north-west", "west", "south-west", "south", "south-east"];

/** Which way a normal points, as a compass word ("south-east"). */
export function compassOf(normal: Point): string {
  const sector = Math.round(Math.atan2(-normal[1], normal[0]) / (Math.PI / 4));
  return COMPASS[(sector + 8) % 8];
}

export type HalfCut = {
  line: Line; // its normal points at the crowded side
  land: number; // the share of the land on the crowded side, 0..1
  side: string; // the crowded side, as a compass word
};

/**
 * Of all the straight lines that split the population exactly in half, the one that
 * leaves the least land on one side: the most lopsided half. Tries `steps` angles (one
 * degree apart by default); at each, the perfect half cut is the game's own perfectLine.
 */
export function lopsidedHalf(round: Round, steps = 180): HalfCut {
  const half: Round = { ...round, mode: "population", target: 0.5 };
  let best: HalfCut | null = null;
  for (let i = 0; i < steps; i++) {
    const cut = perfectLine(half, lineAt((i / steps) * Math.PI, 0));
    const positive = areaShare(round.outline, cut);
    // Point the line at whichever side has less land.
    const line: Line = positive <= 0.5 ? cut : { normal: [-cut.normal[0], -cut.normal[1]], offset: -cut.offset };
    const land = Math.min(positive, 1 - positive);
    if (!best || land < best.land) best = { line, land, side: compassOf(line.normal) };
  }
  return best!;
}

export type Column = { x: number; y: number; people: number; crowded: boolean };

export type Board = {
  crowded: Ring[]; // the outline on the crowded side of the cut
  other: Ring[];
  columns: Column[]; // people gathered onto a coarse grid, for drawing
};

/** The two pieces of the country either side of `line`, and its people gathered onto
 *  `cell`-unit squares (each at its people's weighted centre) so a drawing stays light. */
export function splitBoard(round: Round, line: Line, cell = 22): Board {
  const flip: Line = { normal: [-line.normal[0], -line.normal[1]], offset: -line.offset };
  const bins = new Map<string, { x: number; y: number; people: number; crowded: boolean }>();
  for (const [x, y, people] of round.points ?? []) {
    const crowded = x * line.normal[0] + y * line.normal[1] > line.offset;
    const key = `${Math.floor(x / cell)},${Math.floor(y / cell)},${crowded}`;
    const bin = bins.get(key) ?? { x: 0, y: 0, people: 0, crowded };
    bin.x += x * people;
    bin.y += y * people;
    bin.people += people;
    bins.set(key, bin);
  }
  const columns = [...bins.values()]
    .filter((b) => b.people > 0)
    .map((b) => ({ x: b.x / b.people, y: b.y / b.people, people: b.people, crowded: b.crowded }));
  return { crowded: clipRings(round.outline, line), other: clipRings(round.outline, flip), columns };
}

/** "2.2%" from the round's fact ("Half of Japan's population lives on just 2.2% of its
 *  land."), the pipeline's measure on the 1 km population squares. */
export function denseShare(round: Round): string | null {
  return round.fact.match(/([\d.]+%) of its land/)?.[1] ?? null;
}

/** Cut the land (not the people) in half at the same angle as `cut`: the share of the
 *  people that lands on the cut's crowded side. Shows how far the eye's fair cut is off. */
export function peopleOnLandHalf(round: Round, cut: HalfCut): number {
  const land: Round = { ...round, mode: "area", target: 0.5 };
  let line = perfectLine(land, cut.line);
  if (line.normal[0] !== cut.line.normal[0] || line.normal[1] !== cut.line.normal[1]) {
    line = { normal: cut.line.normal, offset: -line.offset };
  }
  return peopleShare(round.points ?? [], line);
}

/** Douglas-Peucker: drops outline points that bend the ring less than `tolerance`
 *  board units, so a drawing of the outline stays small. */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length < 8) return ring;
  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = keep[ring.length - 1] = true;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1;
    let dist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - ring[i][1]) - (ax - ring[i][0]) * (by - ay)) / len;
      if (d > dist) {
        dist = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}
