import { describe, expect, it } from "vitest";
import { lineAt } from "../../../games/slice/geometry";
import { bandOf, formatShare, maxScore, missOf, scoreCut, scoreOf, totalScore } from "../../../games/slice/scoring";
import type { Ring, Round } from "../../../games/slice/types";

const square: Ring = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];
const r = (target: number): Round => ({ country: "Testland", mode: "area", target, outline: [square], population: 1, fact: "" });

describe("missOf", () => {
  it("is the gap in percentage points, whatever the target", () => {
    expect(missOf(0.47, 0.5)).toBeCloseTo(0.03);
    expect(missOf(0.13, 0.1)).toBeCloseTo(0.03);
    expect(missOf(0.87, 0.9)).toBeCloseTo(0.03);
  });
});

describe("scoreOf", () => {
  it("starts at 100 and loses 10 per percentage point off", () => {
    expect([0, 0.01, 0.03, 0.08, 0.1].map(scoreOf)).toEqual([100, 90, 70, 20, 0]);
  });

  it("rounds to whole points and never goes below 0", () => {
    expect(scoreOf(0.0234)).toBe(77);
    expect(scoreOf(0.4)).toBe(0);
  });

  it("scores exactly 3 points off as 70, despite floating point", () => {
    expect(scoreOf(missOf(0.47, 0.5))).toBe(70);
  });
});

describe("bandOf", () => {
  it("90+, 70+, 20+, below", () => {
    expect([100, 90, 89, 70, 69, 20, 19, 0].map(bandOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe("scoreCut", () => {
  it("scores the piece closer to the target", () => {
    // x > 70 cuts off 30% of the square; target a third.
    const result = scoreCut(r(1 / 3), lineAt(0, 70));
    expect(result.share).toBeCloseTo(0.3);
    expect(result.positive).toBe(true);
    expect(result.miss).toBeCloseTo(1 / 30); // 3.3 points off
    expect(result.score).toBe(67);
  });

  it("gives the same score whichever way the line faces", () => {
    const a = scoreCut(r(1 / 3), lineAt(0, 70));
    const b = scoreCut(r(1 / 3), lineAt(Math.PI, -70));
    expect(b.share).toBeCloseTo(a.share);
    expect(b.score).toBe(a.score);
    expect(b.positive).toBe(!a.positive);
  });

  it("gives the same score for the same miss in points, whatever the target", () => {
    const half = scoreCut(r(0.5), lineAt(0, 52)); // 48%: 2 points off
    const third = scoreCut(r(1 / 3), lineAt(0, 64.6667)); // 35.3%: 2 points off
    const tenth = scoreCut(r(0.1), lineAt(0, 88)); // 12%: 2 points off
    const ninety = scoreCut(r(0.9), lineAt(0, 12)); // 88%: 2 points off
    expect([half.score, third.score, tenth.score, ninety.score]).toEqual([80, 80, 80, 80]);
  });
});

describe("totals", () => {
  it("adds the cuts up, out of 100 a round", () => {
    expect(totalScore([{ score: 94 }, { score: 0 }, { score: 71 }])).toBe(165);
    expect(maxScore(4)).toBe(400);
  });
});

describe("formatShare", () => {
  it("shows one decimal, dropping .0", () => {
    expect(formatShare(1 / 3)).toBe("33.3%");
    expect(formatShare(0.5)).toBe("50%");
    expect(formatShare(0.314)).toBe("31.4%");
  });
});
