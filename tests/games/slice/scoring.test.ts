import { describe, expect, it } from "vitest";
import { lineAt } from "../../../games/slice/geometry";
import {
  cutEmoji,
  cutPoints,
  formatShare,
  maxPoints,
  relativeMiss,
  scoreCut,
  tierOf,
  totalPoints,
} from "../../../games/slice/scoring";
import type { Ring, Round } from "../../../games/slice/types";

const square: Ring = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];
const r = (target: number): Round => ({ country: "Testland", mode: "area", target, outline: [square], population: 1, fact: "" });

describe("relativeMiss", () => {
  it("is the miss as a fraction of the target", () => {
    expect(relativeMiss(0.47, 0.5)).toBeCloseTo(0.06);
    expect(relativeMiss(0.13, 0.1)).toBeCloseTo(0.3);
  });

  it("treats a 90% target like 10% from the other side", () => {
    expect(relativeMiss(0.87, 0.9)).toBeCloseTo(relativeMiss(0.13, 0.1));
  });
});

describe("tierOf", () => {
  it("maps misses to tiers, best first", () => {
    expect([0, 0.019, 0.02, 0.059, 0.1, 0.16, 0.5].map(tierOf)).toEqual([0, 0, 1, 1, 2, 3, 3]);
  });
});

describe("scoreCut", () => {
  it("scores the piece closer to the target", () => {
    // x > 70 cuts off 30% of the square; target a third.
    const result = scoreCut(r(1 / 3), lineAt(0, 70));
    expect(result.share).toBeCloseTo(0.3);
    expect(result.positive).toBe(true);
    expect(result.miss).toBeCloseTo(0.1);
    expect(result.tier).toBe(2);
  });

  it("gives the same score whichever way the line faces", () => {
    const a = scoreCut(r(1 / 3), lineAt(0, 70));
    const b = scoreCut(r(1 / 3), lineAt(Math.PI, -70));
    expect(b.share).toBeCloseTo(a.share);
    expect(b.tier).toBe(a.tier);
    expect(b.positive).toBe(!a.positive);
  });

  it("is more lenient at 50% than at 10% for the same miss in points", () => {
    const half = scoreCut(r(0.5), lineAt(0, 52)); // 48%: 2 points off
    const tenth = scoreCut(r(0.1), lineAt(0, 88)); // 12%: 2 points off
    expect(half.tier).toBeLessThan(tenth.tier);
  });
});

describe("emoji and points", () => {
  it("one square and points per tier", () => {
    expect([0, 1, 2, 3].map((tier) => cutEmoji({ tier }))).toEqual(["🟩", "🟦", "🟨", "🟥"]);
    expect([0, 1, 2, 3].map((tier) => cutPoints({ tier }))).toEqual([3, 2, 1, 0]);
    expect(totalPoints([{ tier: 0 }, { tier: 3 }, { tier: 1 }])).toBe(5);
    expect(maxPoints(5)).toBe(15);
  });
});

describe("formatShare", () => {
  it("shows one decimal, dropping .0", () => {
    expect(formatShare(1 / 3)).toBe("33.3%");
    expect(formatShare(0.5)).toBe("50%");
    expect(formatShare(0.314)).toBe("31.4%");
  });
});
