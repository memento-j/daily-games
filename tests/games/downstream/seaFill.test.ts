import { describe, expect, it } from "vitest";
import { disc, FILL_BANDS, fillBands, fillReach, type SeaShape } from "../../../games/downstream/seaFill";

// A square of sea east of a straight coast at longitude 0, from 0 to 10 east, 0 to 10 north.
const SEA: SeaShape = [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]];
const MOUTH: [number, number] = [0, 5];

describe("seaFill", () => {
  it("draws nothing before the wash starts", () => {
    expect(fillBands(SEA, MOUTH, 0).features).toHaveLength(0);
  });

  it("makes one band per disc, each cut to the sea", () => {
    const bands = fillBands(SEA, MOUTH, 4).features;
    expect(bands).toHaveLength(FILL_BANDS);
    for (const band of bands) {
      const coords = (band.geometry as GeoJSON.MultiPolygon).coordinates.flat(2);
      // Never on land (west of the coast), never past the reach.
      expect(Math.min(...coords.map((c) => c[0]))).toBeGreaterThanOrEqual(-1e-9);
      expect(Math.max(...coords.map((c) => c[1]))).toBeLessThanOrEqual(5 + 4 + 1e-9);
    }
  });

  it("stops short of the clipped outline's straight edges", () => {
    // The pipeline grows the clip box by half the framing (at least 2 degrees) past every point.
    const points: [number, number][] = [[-3, 5], MOUTH, [4, 8], [5, 2]];
    const reach = fillReach(points, MOUTH);
    expect(reach).toBeGreaterThan(0);
    expect(reach).toBeLessThan(4); // half of the 8-degree span
  });

  it("draws discs round on the ground, wider in longitude away from the equator", () => {
    const ring = disc([0, 60], 1)[0];
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4, 1); // 2 / cos(60°)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 5);
  });
});
