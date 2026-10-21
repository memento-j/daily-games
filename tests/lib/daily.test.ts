import { afterAll, describe, expect, it } from "vitest";
import { formatCountdown, getPuzzleNumber, msUntilNextPuzzle, padPuzzleNumber } from "../../lib/daily";

// Node applies TZ changes at runtime. A zone with daylight saving makes the
// DST tests meaningful wherever the tests run.
const originalTz = process.env.TZ;
process.env.TZ = "America/New_York";
afterAll(() => {
  process.env.TZ = originalTz;
});

// new Date(y, m, d, h) is *local* time; months are 0-based.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h);

describe("getPuzzleNumber", () => {
  it("is 1 on launch day, at any time of day", () => {
    expect(getPuzzleNumber(local(2026, 9, 21, 0))).toBe(1);
    expect(getPuzzleNumber(local(2026, 9, 21, 23))).toBe(1);
  });

  it("counts whole days after launch", () => {
    expect(getPuzzleNumber(local(2026, 9, 22))).toBe(2);
    expect(getPuzzleNumber(local(2026, 10, 10))).toBe(21); // the last generated day at launch
    expect(getPuzzleNumber(local(2026, 11, 25))).toBe(66);
  });

  it("is below 1 before launch", () => {
    expect(getPuzzleNumber(local(2026, 9, 20))).toBe(0);
    expect(getPuzzleNumber(local(2026, 9, 1))).toBeLessThan(1);
  });

  it("goes up by exactly one across daylight-saving changes", () => {
    // Guard: the time zone really has DST here (UTC-5 in winter, UTC-4 in summer).
    expect(local(2027, 0, 1).getTimezoneOffset()).toBe(300);
    expect(local(2027, 6, 1).getTimezoneOffset()).toBe(240);

    // US clocks spring forward on 2027-03-14 and fall back on 2027-11-07.
    for (const [m, d] of [[2, 14], [10, 7]]) {
      const before = getPuzzleNumber(local(2027, m, d - 1, 23));
      expect(getPuzzleNumber(local(2027, m, d, 0))).toBe(before + 1);
      expect(getPuzzleNumber(local(2027, m, d, 23))).toBe(before + 1);
      expect(getPuzzleNumber(local(2027, m, d + 1, 0))).toBe(before + 2);
    }
  });
});

describe("padPuzzleNumber", () => {
  it("zero-pads to four digits", () => {
    expect(padPuzzleNumber(1)).toBe("0001");
    expect(padPuzzleNumber(42)).toBe("0042");
    expect(padPuzzleNumber(1234)).toBe("1234");
  });
});

describe("countdown to the next puzzle", () => {
  it("runs to the next local midnight", () => {
    expect(msUntilNextPuzzle(local(2026, 10, 15, 22))).toBe(2 * 60 * 60 * 1000);
    expect(msUntilNextPuzzle(new Date(2026, 10, 15, 23, 59, 30))).toBe(30 * 1000);
  });

  it("is a normal length across daylight saving (23 or 25 hours from midnight)", () => {
    expect(msUntilNextPuzzle(new Date(2027, 2, 14, 0, 0))).toBe(23 * 60 * 60 * 1000); // spring forward
    expect(msUntilNextPuzzle(new Date(2027, 10, 7, 0, 0))).toBe(25 * 60 * 60 * 1000); // fall back
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown((5 * 60 + 12) * 60000 + 30000)).toBe("5h 12m");
    expect(formatCountdown(42 * 60000)).toBe("42m");
    expect(formatCountdown(20000)).toBe("under a minute");
  });
});
