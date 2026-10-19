import { describe, expect, it } from "vitest";
import { localDay, visitDay } from "../../lib/analytics";

describe("localDay", () => {
  it("counts the local calendar day, whatever the time", () => {
    expect(localDay(new Date(2026, 10, 15, 0, 1))).toBe(localDay(new Date(2026, 10, 15, 23, 59)));
    expect(localDay(new Date(2026, 10, 16, 0, 0)) - localDay(new Date(2026, 10, 15, 23, 59))).toBe(1);
  });

  it("isn't thrown off by daylight saving changes", () => {
    // Spring forward and fall back both sit inside these spans in most time zones.
    expect(localDay(new Date(2026, 3, 1)) - localDay(new Date(2026, 2, 1))).toBe(31);
    expect(localDay(new Date(2026, 10, 30)) - localDay(new Date(2026, 9, 1))).toBe(60);
  });
});

describe("visitDay", () => {
  it("is 0 on the first day and counts up", () => {
    expect(visitDay(100, 100)).toBe(0);
    expect(visitDay(100, 101)).toBe(1);
    expect(visitDay(100, 106)).toBe(6);
  });

  it("never goes negative (a clock set backwards) and caps at 60", () => {
    expect(visitDay(100, 95)).toBe(0);
    expect(visitDay(100, 400)).toBe(60);
  });
});
