import { describe, expect, it } from "vitest";
import { initialState, isValidState, phase, step, type Action, type GameState } from "../../../games/downstream/game";
import type { Drop, Puzzle } from "../../../games/downstream/types";

const drop = (answer: string): Drop => ({
  pin: [0, 0],
  answer,
  options: [answer, "Red Sea", "Arabian Sea", "Indian Ocean"],
  distanceKm: 1000,
  route: [[0, 0], [1, 1]],
  stages: [150, 400, 700],
  fact: "",
  difficulty: 1,
});
const puzzle: Puzzle = { puzzle: 1, drops: [drop("Black Sea"), drop("North Sea")] };

const run = (actions: Action[], from: GameState = initialState) =>
  actions.reduce((s, a) => step(s, a, puzzle), from);

describe("guessing", () => {
  it("records a correct guess with the stage it was made at", () => {
    const s = run([{ type: "reveal" }, { type: "guess", option: "Black Sea" }]);
    expect(s.results).toEqual([{ guess: "Black Sea", stage: 1, correct: true }]);
    expect(phase(s, puzzle)).toBe("result");
  });

  it("records a wrong guess, which ends the drop", () => {
    const s = run([{ type: "guess", option: "Red Sea" }]);
    expect(s.results).toEqual([{ guess: "Red Sea", stage: 0, correct: false }]);
    expect(phase(s, puzzle)).toBe("result");
  });

  it("allows only one guess per drop", () => {
    const once = run([{ type: "guess", option: "Red Sea" }]);
    expect(step(once, { type: "guess", option: "Black Sea" }, puzzle)).toBe(once);
  });

  it("ignores options that aren't on offer", () => {
    expect(step(initialState, { type: "guess", option: "Atlantis" }, puzzle)).toBe(initialState);
  });
});

describe("revealing", () => {
  it("steps through each stop, then ends the drop unscored if still no guess", () => {
    const allStops = run([{ type: "reveal" }, { type: "reveal" }, { type: "reveal" }]);
    expect(allStops.stage).toBe(3);
    expect(phase(allStops, puzzle)).toBe("guessing"); // last chance to guess

    const gaveUp = step(allStops, { type: "reveal" }, puzzle);
    expect(gaveUp.results).toEqual([{ guess: null, stage: 3, correct: false }]);
    expect(phase(gaveUp, puzzle)).toBe("result");
  });

  it("does nothing while showing a result", () => {
    const s = run([{ type: "guess", option: "Black Sea" }]);
    expect(step(s, { type: "reveal" }, puzzle)).toBe(s);
  });
});

describe("moving on", () => {
  it("goes to the next drop at stage 0, then finishes after the last", () => {
    const second = run([{ type: "reveal" }, { type: "guess", option: "Black Sea" }, { type: "next" }]);
    expect(second).toMatchObject({ drop: 1, stage: 0 });
    expect(phase(second, puzzle)).toBe("guessing");

    const done = run([{ type: "guess", option: "North Sea" }, { type: "next" }], second);
    expect(phase(done, puzzle)).toBe("finished");
    expect(done.results).toHaveLength(2);
  });

  it("can't skip a drop without a result", () => {
    expect(step(initialState, { type: "next" }, puzzle)).toBe(initialState);
  });
});

describe("isValidState", () => {
  it("accepts real states and rejects junk", () => {
    expect(isValidState(initialState, puzzle)).toBe(true);
    expect(isValidState(run([{ type: "guess", option: "Red Sea" }]), puzzle)).toBe(true);
    expect(isValidState(null, puzzle)).toBe(false);
    expect(isValidState({ drop: 9, stage: 0, results: [] }, puzzle)).toBe(false);
    expect(isValidState({ drop: 0 }, puzzle)).toBe(false);
  });
});
