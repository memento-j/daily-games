import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";

const played = (...days: number[]) => Object.fromEntries(days.map((d) => [d, { points: 10 }]));

describe("streaks", () => {
  it("counts consecutive days", () => {
    expect(computeStats(played(1, 2, 3, 4), 4)).toMatchObject({ currentStreak: 4, bestStreak: 4, played: 4 });
  });

  it("stays alive until today is over (yesterday played)", () => {
    expect(computeStats(played(1, 2, 3), 4).currentStreak).toBe(3);
  });

  it("forgives one missed day", () => {
    expect(computeStats(played(1, 2, 4, 5), 5).currentStreak).toBe(4);
  });

  it("forgives at most once a week", () => {
    expect(computeStats(played(1, 3, 5), 5).currentStreak).toBe(1); // second miss within 7 days breaks it
    expect(computeStats(played(1, 3, 4, 5, 6, 7, 8, 9, 11), 11).currentStreak).toBe(9); // misses on day 2 and 10: 8 days apart
  });

  it("breaks after two missed days in a row", () => {
    expect(computeStats(played(1, 2, 5), 5)).toMatchObject({ currentStreak: 1, bestStreak: 2 });
  });

  it("keeps a streak alive while today's miss is still forgivable", () => {
    expect(computeStats(played(1, 2, 3), 5).currentStreak).toBe(3); // day 4 missed, day 5 not over
    expect(computeStats(played(1, 2, 3), 6).currentStreak).toBe(0); // days 4 and 5 missed
  });

  it("is zero with no history", () => {
    expect(computeStats({}, 9)).toEqual({ played: 0, currentStreak: 0, bestStreak: 0, averagePoints: null });
  });
});

describe("stats", () => {
  it("averages points to one decimal", () => {
    expect(computeStats({ 1: { points: 12 }, 2: { points: 15 }, 3: { points: 14 } }, 3).averagePoints).toBe(13.7);
  });

  it("ignores future days", () => {
    expect(computeStats(played(1, 2, 9), 2).played).toBe(2);
  });
});
