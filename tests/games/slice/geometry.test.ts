import { describe, expect, it } from "vitest";
import {
  area,
  centroid,
  clipRing,
  clipRings,
  flip,
  lineAt,
  lineThrough,
  offsetRange,
  segmentInBox,
  signedArea,
} from "../../../games/slice/geometry";
import type { Ring } from "../../../games/slice/types";

const square: Ring = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];
const hole: Ring = [
  [25, 25],
  [25, 75],
  [75, 75],
  [75, 25],
]; // wound the other way
// A U shape: two 20-wide prongs joined by a 20-tall base, open at the top.
const u: Ring = [
  [0, 0],
  [20, 0],
  [20, 80],
  [80, 80],
  [80, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];

describe("lineThrough", () => {
  it("makes a unit normal and an offset that both points satisfy", () => {
    const line = lineThrough([0, 10], [50, 10])!;
    expect(Math.hypot(...line.normal)).toBeCloseTo(1);
    expect(line.normal[0] * 30 + line.normal[1] * 10).toBeCloseTo(line.offset);
  });

  it("returns null for two equal points", () => {
    expect(lineThrough([5, 5], [5, 5])).toBeNull();
  });
});

describe("area", () => {
  it("measures a square", () => {
    expect(area([square])).toBe(10000);
  });

  it("subtracts a hole wound the other way", () => {
    expect(Math.sign(signedArea(hole))).toBe(-Math.sign(signedArea(square)));
    expect(area([square, hole])).toBe(10000 - 2500);
  });

  it("adds separate islands", () => {
    const island = square.map(([x, y]): [number, number] => [x + 200, y]);
    expect(area([square, island])).toBe(20000);
  });

  it("doesn't care which way the outline winds", () => {
    expect(area([[...square].reverse()])).toBe(10000);
  });
});

describe("clipRing", () => {
  it("keeps the part on the positive side", () => {
    // normal (1, 0), offset 25: keeps x > 25
    const right = clipRing(square, lineAt(0, 25));
    expect(Math.abs(signedArea(right))).toBeCloseTo(7500);
  });

  it("keeps everything or nothing when the line misses", () => {
    expect(Math.abs(signedArea(clipRing(square, lineAt(0, -10))))).toBeCloseTo(10000);
    expect(clipRing(square, lineAt(0, 110))).toEqual([]);
  });

  it("gets a concave ring's area right where the line crosses it twice", () => {
    // y > 50 cuts both prongs (2 x 20 x 30) and keeps the whole base (100 x 20).
    expect(area(clipRings([u], lineAt(Math.PI / 2, 50)))).toBeCloseTo(1200 + 2000);
  });

  it("clips holes too", () => {
    // x > 50 keeps half the square and half the hole.
    expect(area(clipRings([square, hole], lineAt(0, 50)))).toBeCloseTo(5000 - 1250);
  });

  it("the two sides of a line add up to the whole", () => {
    const line = lineThrough([10, 0], [90, 100])!;
    const a = area(clipRings([u], line));
    const b = area(clipRings([u], flip(line)));
    expect(a + b).toBeCloseTo(area([u]));
  });
});

describe("centroid", () => {
  it("is the middle of a square, and moves away from a hole", () => {
    expect(centroid([square])).toEqual([50, 50]);
    const offHole: Ring = [
      [60, 10],
      [60, 40],
      [90, 40],
      [90, 10],
    ];
    const [x, y] = centroid([square, offHole])!;
    expect(x).toBeLessThan(50);
    expect(y).toBeGreaterThan(50);
  });

  it("is null for an empty outline", () => {
    expect(centroid([])).toBeNull();
  });
});

describe("offsetRange", () => {
  it("spans the outline along the normal", () => {
    expect(offsetRange([square], [1, 0])).toEqual([0, 100]);
  });
});

describe("segmentInBox", () => {
  it("runs a line from edge to edge of the box", () => {
    const seg = segmentInBox(lineAt(0, 30), [0, 0], [100, 100])!;
    const xs = seg.map((p) => p[0]);
    const ys = seg.map((p) => p[1]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(30);
    expect(xs[1]).toBeCloseTo(30);
    expect(ys[0]).toBeCloseTo(0);
    expect(ys[1]).toBeCloseTo(100);
  });

  it("returns null when the line misses the box", () => {
    expect(segmentInBox(lineAt(0, 300), [0, 0], [100, 100])).toBeNull();
  });
});
