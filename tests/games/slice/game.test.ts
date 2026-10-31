import { describe, expect, it } from "vitest";
import { hintCount, hinted, initialState, isValidState, MAX_TRIES, phase, step, triesLeft, withHints, type GameState } from "../../../games/slice/game";
import { lineAt } from "../../../games/slice/geometry";
import type { Puzzle, Ring, Round } from "../../../games/slice/types";

const square: Ring = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];
const round: Round = {
  country: "Testland",
  mode: "area",
  target: 0.5,
  outline: [square],
  population: 1,
  fact: "",
  cities: [
    [20, 20],
    [50, 50],
    [80, 30],
  ],
};
const puzzle: Puzzle = { puzzle: 1, rounds: [round, round] };
const perfect = lineAt(0, 50); // 50%: scores 100
const near = lineAt(0, 53); // 47%: 3 points off, scores 70
const far = lineAt(0, 70); // 30%: 20 points off, scores 0
const misses = lineAt(0, 500);

const run = (s: GameState, ...actions: Parameters<typeof step>[1][]) => actions.reduce((st, a) => step(st, a, puzzle), s);

describe("two tries per round", () => {
  it("allows two tries", () => {
    expect(MAX_TRIES).toBe(2);
  });

  it("cut -> result -> keep -> settled -> next round", () => {
    let s = step(initialState, { type: "cut", line: near }, puzzle);
    expect(phase(s, puzzle)).toBe("result");
    expect(triesLeft(s)).toBe(1);
    expect(s.cuts[0].score).toBe(74);
    s = step(s, { type: "keep" }, puzzle);
    expect(phase(s, puzzle)).toBe("settled");
    s = step(s, { type: "next" }, puzzle);
    expect(phase(s, puzzle)).toBe("cutting");
    expect(s).toMatchObject({ round: 1, tries: 0, last: null });
  });

  it("cut again: a fresh board, then the round settles by itself and keeps the best", () => {
    let s = run(initialState, { type: "cut", line: near }, { type: "again" });
    expect(phase(s, puzzle)).toBe("cutting");
    s = step(s, { type: "cut", line: far }, puzzle);
    expect(phase(s, puzzle)).toBe("settled");
    expect(s.last!.score).toBe(14); // the board shows the latest cut...
    expect(s.cuts[0].score).toBe(74); // ...but the better one counts
    expect(step(s, { type: "again" }, puzzle)).toBe(s); // no third try
  });

  it("a better second cut replaces the first", () => {
    const s = run(initialState, { type: "cut", line: far }, { type: "again" }, { type: "cut", line: perfect });
    expect(s.cuts[0].score).toBe(100);
  });

  it("plays through to the end", () => {
    const s = run(initialState, { type: "cut", line: perfect }, { type: "keep" }, { type: "next" }, { type: "cut", line: far }, { type: "keep" }, { type: "next" });
    expect(phase(s, puzzle)).toBe("finished");
    expect(s.cuts.map((c) => c.score)).toEqual([100, 14]);
  });

  it("ignores a line that misses the country", () => {
    expect(step(initialState, { type: "cut", line: misses }, puzzle)).toBe(initialState);
  });

  it("ignores actions that don't fit the phase", () => {
    expect(step(initialState, { type: "next" }, puzzle)).toBe(initialState);
    expect(step(initialState, { type: "keep" }, puzzle)).toBe(initialState);
    const cut = step(initialState, { type: "cut", line: perfect }, puzzle);
    expect(step(cut, { type: "cut", line: perfect }, puzzle)).toBe(cut); // must choose again or keep
    expect(step(cut, { type: "next" }, puzzle)).toBe(cut); // the perfect cut is still hidden: no skipping
  });
});

describe("the hint", () => {
  it("can be taken while cutting, once per round, and stays through both tries", () => {
    let s = run(initialState, { type: "hint" });
    expect(hinted(s, 0)).toBe(true);
    expect(run(s, { type: "hint" })).toBe(s); // once per round
    s = run(s, { type: "cut", line: near }, { type: "again" });
    expect(hinted(s, 0)).toBe(true);
    s = run(s, { type: "cut", line: perfect }, { type: "next" });
    expect(hinted(s, 1)).toBe(false);
    expect(s.hints).toEqual([true]);
  });

  it("never changes the score", () => {
    const plain = run(initialState, { type: "cut", line: near });
    const helped = run(initialState, { type: "hint" }, { type: "cut", line: near });
    expect(helped.cuts[0].score).toBe(plain.cuts[0].score);
  });

  it("isn't available after cutting, or for a round without cities", () => {
    const cut = run(initialState, { type: "cut", line: near });
    expect(run(cut, { type: "hint" })).toBe(cut);
    const noCities: Puzzle = { puzzle: 1, rounds: [{ ...round, cities: undefined }] };
    expect(step(initialState, { type: "hint" }, noCities)).toBe(initialState);
  });

  it("counts for analytics, and old saves without hints still load", () => {
    expect(hintCount([true, false, true])).toBe(2);
    expect(hintCount(undefined)).toBe(0);
    const old = { round: 0, cuts: [], tries: 0, last: null, again: false, kept: false };
    expect(isValidState(old, puzzle)).toBe(true);
    expect(withHints(old as unknown as GameState).hints).toEqual([]);
    expect(isValidState({ ...old, hints: ["yes"] }, puzzle)).toBe(false);
  });
});

describe("isValidState", () => {
  it("accepts real states and rejects junk", () => {
    const cut = step(initialState, { type: "cut", line: perfect }, puzzle);
    expect(isValidState(initialState, puzzle)).toBe(true);
    expect(isValidState(cut, puzzle)).toBe(true);
    expect(isValidState(run(cut, { type: "again" }), puzzle)).toBe(true);
    expect(isValidState(null, puzzle)).toBe(false);
    expect(isValidState({ round: 5, cuts: [] }, puzzle)).toBe(false);
    // Saved by the old one-cut version (no tries): start the round again.
    expect(isValidState({ round: 0, cuts: [] }, puzzle)).toBe(false);
  });
});
