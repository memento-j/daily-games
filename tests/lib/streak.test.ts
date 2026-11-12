import { describe, expect, it } from "vitest";
import { computeStreak, milestoneText, seedFrom } from "../../lib/streak";

/** Days a to b, inclusive. */
const run = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** A game's history over those days. */
const history = (days: number[]) => Object.fromEntries(days.map((d) => [d, { points: 10 }]));

describe("the shared streak", () => {
  it("grows by one on a normal next-day play", () => {
    expect(computeStreak(run(10, 14), 14).current).toBe(5);
    expect(computeStreak(run(10, 15), 15).current).toBe(6);
  });

  it("stays alive until today is over (yesterday played)", () => {
    const s = computeStreak(run(10, 14), 15);
    expect(s.current).toBe(5);
    expect(s.playedToday).toBe(false);
    // The week is days 9-15: 9 before the streak began, 15 today, not yet played.
    expect(s.week).toEqual(["missed", "played", "played", "played", "played", "played", "today"]);
  });

  it("counts a day once when both games were played on it", () => {
    const both = [...run(10, 14), ...run(12, 14)];
    expect(computeStreak(both, 14).current).toBe(5);
  });

  it("counts a day played in either game", () => {
    // Slice on 10-12, Downstream on 13-14: one unbroken streak.
    expect(computeStreak([10, 11, 12, 13, 14], 14).current).toBe(5);
  });

  it("earns a freeze every 7 days played, holding at most 2", () => {
    expect(computeStreak(run(1, 6), 6).freezes).toBe(0);
    expect(computeStreak(run(1, 7), 7).freezes).toBe(1);
    expect(computeStreak(run(1, 14), 14).freezes).toBe(2);
    expect(computeStreak(run(1, 28), 28).freezes).toBe(2);
  });

  it("uses a freeze for a 1-day miss when the player comes back", () => {
    // 7 days played (1 freeze), day 8 missed, back on day 9.
    const s = computeStreak([...run(1, 7), 9], 9);
    expect(s.current).toBe(8); // days played; the frozen day keeps it unbroken but doesn't add
    expect(s.freezes).toBe(0);
    expect(s.frozenToday).toBe(1);
    expect(s.week).toEqual(["played", "played", "played", "played", "played", "frozen", "played"]);
  });

  it("resets after a 3-day miss with only 1 freeze, and keeps the freeze", () => {
    // 7 days played (1 freeze), days 8-10 missed, back on day 11.
    const s = computeStreak([...run(1, 7), 11], 11);
    expect(s.current).toBe(1);
    expect(s.best).toBe(7);
    expect(s.freezes).toBe(1);
    expect(s.frozenToday).toBe(0);
  });

  it("covers a 2-day miss with 2 freezes", () => {
    const s = computeStreak([...run(1, 14), 17], 17);
    expect(s.current).toBe(15);
    expect(s.freezes).toBe(0);
    expect(s.frozenToday).toBe(2);
  });

  it("can't use a freeze earned on the day it would have to cover", () => {
    // The 7th day played is the comeback day itself: its freeze comes too late for the gap.
    const s = computeStreak([...run(1, 6), 8], 8);
    expect(s.current).toBe(1);
    expect(s.freezes).toBe(1);
  });

  it("shows the streak while missed days could still be frozen, and 0 once they can't", () => {
    const sevenDays = run(1, 7); // 1 freeze held
    expect(computeStreak(sevenDays, 9).current).toBe(7); // day 8 missed, still savable today
    expect(computeStreak(sevenDays, 10).current).toBe(0); // days 8-9 missed: 2 > 1 freeze
  });

  it("is zero with no history, and ignores future days", () => {
    expect(computeStreak([], 20)).toMatchObject({ current: 0, best: 0, freezes: 0, playedToday: false });
    expect(computeStreak([20, 21], 20).current).toBe(1);
  });

  it("marks a milestone only on the day it's reached", () => {
    expect(computeStreak(run(1, 3), 3).milestone).toBe(3);
    expect(computeStreak(run(1, 7), 7).milestone).toBe(7);
    expect(computeStreak(run(1, 8), 8).milestone).toBeNull();
    expect(computeStreak(run(1, 6), 7).milestone).toBeNull(); // 6 days, today not played yet
    expect(computeStreak(run(1, 30), 30).milestone).toBe(30);
    expect(computeStreak(run(1, 100), 100).milestone).toBe(100);
  });

  it("says each milestone calmly", () => {
    expect(milestoneText(7)).toBe("7 days in a row. Nice.");
    expect(milestoneText(3)).toBe("3 days in a row. Good start.");
  });
});

describe("migration from the old per-game streaks", () => {
  it("takes the higher of the two games' streaks and bests", () => {
    // Slice: 5 days ending yesterday (19); Downstream: 2 days, best of 9 earlier.
    const slice = history(run(15, 19));
    const downstream = history([...run(1, 9), 18, 19]);
    const seed = seedFrom([slice, downstream], 20);
    expect(seed.best).toBe(9);
    const days = [...run(15, 19), ...run(1, 9)];
    const s = computeStreak(days, 20, seed);
    expect(s.current).toBe(5);
    expect(s.best).toBe(9);
  });

  it("keeps a streak the old rule forgave, even where freezes couldn't", () => {
    // Days 1-3 and 5-8: the old rule forgave day 4 (a 7-day streak); with no freeze yet held
    // (3 days played), the shared rule alone would reset at day 5.
    const days = [...run(1, 3), ...run(5, 8)];
    expect(computeStreak(days, 8).current).toBe(4);
    const seed = seedFrom([history(days)], 8);
    expect(seed.streaks[8]).toBe(7);
    expect(computeStreak(days, 8, seed).current).toBe(7);
    // And it carries on from there the next day.
    expect(computeStreak([...days, 9], 9, seed).current).toBe(8);
  });

  it("changes nothing for a player with no history", () => {
    const seed = seedFrom([{}, {}], 20);
    expect(seed).toEqual({ streaks: {}, best: 0 });
  });

  it("doesn't bring back a streak that had already ended", () => {
    const seed = seedFrom([history(run(1, 5))], 20);
    expect(seed.streaks).toEqual({});
    expect(seed.best).toBe(5);
    expect(computeStreak([...run(1, 5), 20], 20, seed).current).toBe(1);
  });
});
