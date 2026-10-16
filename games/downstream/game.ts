// Downstream game rules as a pure state machine, separate from React so it can
// be unit tested. The component holds a GameState and calls step() on each click.

import { type DropResult } from "./scoring";
import type { Puzzle } from "./types";

export type GameState = {
  drop: number; // index of the current drop; drops.length = day finished
  stage: number; // route stops revealed for the current drop (0 = pin only)
  results: DropResult[]; // one per drop played so far
};

export type Action =
  | { type: "reveal" } // show the route up to the next stop (or give up after the last one)
  | { type: "guess"; option: string } // lock in a guess: one per drop
  | { type: "next" }; // move on to the next drop after seeing the result

export type Phase = "guessing" | "result" | "finished";

export const initialState: GameState = { drop: 0, stage: 0, results: [] };

export function phase(state: GameState, puzzle: Puzzle): Phase {
  if (state.drop >= puzzle.drops.length) return "finished";
  return state.results.length > state.drop ? "result" : "guessing";
}

/** Returns the next state, or the same object if the action isn't allowed right now. */
export function step(state: GameState, action: Action, puzzle: Puzzle): GameState {
  const current = phase(state, puzzle);
  const drop = puzzle.drops[state.drop];

  switch (action.type) {
    case "reveal":
      if (current !== "guessing") return state;
      if (state.stage < drop.stages.length) return { ...state, stage: state.stage + 1 };
      // Every stop shown and still no guess: the drop ends with no points.
      return { ...state, results: [...state.results, { guess: null, stage: state.stage, correct: false }] };

    case "guess":
      if (current !== "guessing" || !drop.options.includes(action.option)) return state;
      return {
        ...state,
        results: [
          ...state.results,
          { guess: action.option, stage: state.stage, correct: action.option === drop.answer },
        ],
      };

    case "next":
      if (current !== "result") return state;
      return { drop: state.drop + 1, stage: 0, results: state.results };
  }
}

/** Is a saved state usable with this puzzle? Guards against stale or corrupted storage. */
export function isValidState(state: unknown, puzzle: Puzzle): state is GameState {
  if (typeof state !== "object" || state === null) return false;
  const s = state as GameState;
  return (
    Number.isInteger(s.drop) && s.drop >= 0 && s.drop <= puzzle.drops.length &&
    Number.isInteger(s.stage) && s.stage >= 0 &&
    Array.isArray(s.results) && s.results.length >= s.drop && s.results.length <= s.drop + 1
  );
}
