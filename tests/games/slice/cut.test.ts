import { describe, expect, it } from "vitest";
import { areaShare, crosses, peopleShare, perfectLine, positiveCounts, share } from "../../../games/slice/cut";
import { flip, lineAt, lineThrough } from "../../../games/slice/geometry";
import type { PeoplePoint, Ring, Round } from "../../../games/slice/types";

const square: Ring = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];
// 90 people on the left edge, 10 on the right.
const people: PeoplePoint[] = [
  [10, 20, 30],
  [10, 50, 30],
  [10, 80, 30],
  [90, 50, 10],
];

function round(mode: Round["mode"], target: number): Round {
  return { country: "Testland", mode, target, outline: [square], points: mode === "population" ? people : undefined, population: 100, fact: "" };
}

describe("areaShare / peopleShare", () => {
  it("measures land on the positive side", () => {
    expect(areaShare([square], lineAt(0, 75))).toBeCloseTo(0.25);
  });

  it("counts people on the positive side", () => {
    expect(peopleShare(people, lineAt(0, 50))).toBeCloseTo(0.1);
    expect(peopleShare(people, lineAt(Math.PI, -50))).toBeCloseTo(0.9);
  });

  it("uses people in population mode and land in area mode", () => {
    const line = lineAt(0, 50);
    expect(share(round("area", 0.5), line)).toBeCloseTo(0.5);
    expect(share(round("population", 0.5), line)).toBeCloseTo(0.1);
  });
});

describe("crosses", () => {
  it("is true only when there is land on both sides", () => {
    expect(crosses(round("area", 0.5), lineAt(0, 50))).toBe(true);
    expect(crosses(round("area", 0.5), lineAt(0, 150))).toBe(false);
    expect(crosses(round("area", 0.5), lineAt(0, -1))).toBe(false);
  });
});

describe("positiveCounts", () => {
  it("counts the piece closer to the target", () => {
    expect(positiveCounts(0.3, 1 / 3)).toBe(true);
    expect(positiveCounts(0.7, 1 / 3)).toBe(false);
    expect(positiveCounts(0.12, 0.9)).toBe(false); // the other piece is 88%
  });
});

describe("perfectLine", () => {
  it("keeps the player's angle and cuts off the target exactly", () => {
    const r = round("area", 1 / 3);
    const player = lineThrough([20, 0], [40, 100])!;
    const perfect = perfectLine(r, player);
    expect(perfect.normal).toEqual(player.normal);
    const s = areaShare([square], perfect);
    expect(Math.min(Math.abs(s - 1 / 3), Math.abs(1 - s - 1 / 3))).toBeLessThan(1e-9);
  });

  it("puts the target on the same side the player's cut is counted on", () => {
    const r = round("area", 0.25);
    // x > 70 cuts off 30%: the positive side counts, so the perfect line is at x = 75.
    expect(perfectLine(r, lineAt(0, 70)).offset).toBeCloseTo(75);
    // The same line facing the other way cuts off 70% on its positive side: the
    // counted piece is still the right-hand 30%, so the answer is the same place.
    const flipped = perfectLine(r, flip(lineAt(0, 70)));
    expect(-flipped.offset).toBeCloseTo(75);
  });

  it("cuts midway between the people points", () => {
    const perfect = perfectLine(round("population", 0.1), lineAt(0, 30));
    expect(peopleShare(people, perfect)).toBeCloseTo(0.1);
    expect(perfect.offset).toBeCloseTo(50); // between x = 10 and x = 90
  });

  it("gets as close as the points allow when no cut is exact", () => {
    // From the top: 30 (y=80), then 40 with the right-hand point (y=50): 1/3 is nearest 30%.
    const perfect = perfectLine(round("population", 1 / 3), lineAt(Math.PI / 2, 70));
    expect(peopleShare(people, perfect)).toBeCloseTo(0.3);
    expect(perfect.offset).toBeCloseTo(65); // between y = 80 and y = 50
  });
});
