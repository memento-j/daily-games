import { describe, expect, it } from "vitest";
import { initialState, isValidState, phase, step } from "../../../games/slice/game";
import { lineAt } from "../../../games/slice/geometry";
import type { Puzzle, Ring, Round } from "../../../games/slice/types";

const square: Ring = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];
const round: Round = { country: "Testland", mode: "area", target: 0.5, outline: [square], population: 1, fact: "" };
const puzzle: Puzzle = { puzzle: 1, rounds: [round, round] };
const through = lineAt(0, 50);
const misses = lineAt(0, 500);

describe("step", () => {
  it("cut -> result -> next round -> ... -> finished", () => {
    let s = initialState;
    expect(phase(s, puzzle)).toBe("cutting");
    s = step(s, { type: "cut", line: through }, puzzle);
    expect(phase(s, puzzle)).toBe("result");
    expect(s.cuts[0].share).toBeCloseTo(0.5);
    expect(s.cuts[0].tier).toBe(0);
    s = step(s, { type: "next" }, puzzle);
    expect(phase(s, puzzle)).toBe("cutting");
    s = step(step(s, { type: "cut", line: lineAt(0, 70) }, puzzle), { type: "next" }, puzzle);
    expect(phase(s, puzzle)).toBe("finished");
    expect(s.cuts.map((c) => c.tier)).toEqual([0, 3]);
  });

  it("ignores a line that misses the country", () => {
    expect(step(initialState, { type: "cut", line: misses }, puzzle)).toBe(initialState);
  });

  it("ignores actions that don't fit the phase", () => {
    expect(step(initialState, { type: "next" }, puzzle)).toBe(initialState);
    const cut = step(initialState, { type: "cut", line: through }, puzzle);
    expect(step(cut, { type: "cut", line: through }, puzzle)).toBe(cut);
  });
});

describe("isValidState", () => {
  it("accepts real states and rejects junk", () => {
    const cut = step(initialState, { type: "cut", line: through }, puzzle);
    expect(isValidState(initialState, puzzle)).toBe(true);
    expect(isValidState(cut, puzzle)).toBe(true);
    expect(isValidState(null, puzzle)).toBe(false);
    expect(isValidState({ round: 5, cuts: [] }, puzzle)).toBe(false);
    expect(isValidState({ round: 1, cuts: [] }, puzzle)).toBe(false);
  });
});
