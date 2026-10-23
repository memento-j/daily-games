// Slice's data types. A puzzle file (public/data/slice/NNNN.json) is a Puzzle.
//
// Coordinates are in a 0..1000 box on an equal-area map of the country, y pointing
// down (as SVG draws). The pipeline is scripts/slice/generate.py.

export type Point = [number, number];

/** One closed ring of the outline (the first point is not repeated at the end).
 *  Outer rings and holes wind in opposite directions, so signed areas add up. */
export type Ring = Point[];

/** A population point: [x, y, people]. */
export type PeoplePoint = [number, number, number];

export type Mode = "area" | "population";

export type Round = {
  id?: string; // Natural Earth's name, for reuse tracking and practice (games/slice/practice.ts)
  country: string;
  mode: Mode;
  target: number; // the share to cut off, 0..1 (e.g. 0.5, 1/3, 0.1)
  outline: Ring[];
  points?: PeoplePoint[]; // population mode only
  population: number;
  fact: string;
};

export type Puzzle = {
  puzzle: number;
  rounds: Round[];
};

/** An endless straight line: the points p where p · normal == offset. `normal` is a
 *  unit vector; the side where p · normal > offset is the line's "positive" side. */
export type Line = {
  normal: Point;
  offset: number;
};
