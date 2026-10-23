import { describe, expect, it } from "vitest";
import { compassOf, denseShare, lopsidedHalf, peopleOnLandHalf, simplifyRing, splitBoard } from "../../../games/slice/countryFacts";
import { peopleShare } from "../../../games/slice/cut";
import type { Round } from "../../../games/slice/types";

// A 1000 x 100 strip: everyone lives in its east end, the last tenth of the land.
const strip: Round = {
  country: "Stripland",
  mode: "population",
  target: 0.5,
  outline: [[[0, 0], [1000, 0], [1000, 100], [0, 100]]],
  points: [
    [920, 50, 100],
    [940, 50, 100],
    [960, 50, 100],
    [980, 50, 100],
  ],
  population: 400,
  fact: "Half of Stripland's population lives on just 0.4% of its land.",
};

describe("compassOf", () => {
  it("names the way a normal points, with north up (-y)", () => {
    expect(compassOf([1, 0])).toBe("east");
    expect(compassOf([0, -1])).toBe("north");
    expect(compassOf([-Math.SQRT1_2, Math.SQRT1_2])).toBe("south-west");
  });
});

describe("lopsidedHalf", () => {
  const cut = lopsidedHalf(strip);

  it("splits the people exactly in half", () => {
    expect(peopleShare(strip.points!, cut.line)).toBeCloseTo(0.5);
  });

  it("finds the cut with the least land on the crowded side", () => {
    expect(cut.side).toBe("east");
    expect(cut.land).toBeLessThan(0.06);
  });

  it("puts most people on the crowded half when the land is halved instead", () => {
    expect(peopleOnLandHalf(strip, cut)).toBe(1);
  });
});

describe("splitBoard", () => {
  it("keeps every person, on the right side", () => {
    const board = splitBoard(strip, lopsidedHalf(strip).line, 10);
    expect(board.columns.reduce((s, c) => s + c.people, 0)).toBe(400);
    expect(board.columns.filter((c) => c.crowded).reduce((s, c) => s + c.people, 0)).toBe(200);
    expect(board.crowded.length).toBeGreaterThan(0);
    expect(board.other.length).toBeGreaterThan(0);
  });
});

describe("denseShare", () => {
  it("reads the share from the round's fact", () => {
    expect(denseShare(strip)).toBe("0.4%");
    expect(denseShare({ ...strip, fact: "" })).toBeNull();
  });
});

describe("simplifyRing", () => {
  it("drops points that barely bend the outline, keeps corners", () => {
    const ring: [number, number][] = [[0, 0], [5, 0.1], [10, 0], [10, 10], [5, 10.1], [0, 10], [0, 5], [0.1, 2]];
    const out = simplifyRing(ring, 1);
    expect(out).toContainEqual([10, 10]);
    expect(out).not.toContainEqual([5, 0.1]);
  });
});
