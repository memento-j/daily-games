// Slice's rules as a small state machine: cut, see the result, go on. Pure (no
// React, no storage), so it's unit tested and the saved state can be checked.

import { crosses } from "./cut";
import { scoreCut } from "./scoring";
import type { Line, Puzzle } from "./types";

/** One confirmed cut: the line and how it scored (kept so a reload shows it again). */
export type SavedCut = { line: Line; share: number; miss: number; score: number };

export type GameState = {
  round: number; // the round on screen; rounds.length = the day is done
  cuts: SavedCut[]; // one per confirmed round
};

// "retry" takes back the current round's cut so the same country can be cut again. The
// screen offers it while ENDLESS_TRIES is on (config.ts; playtesting).
export type Action = { type: "cut"; line: Line } | { type: "next" } | { type: "retry" };

export type Phase = "cutting" | "result" | "finished";

export const initialState: GameState = { round: 0, cuts: [] };

export function phase(state: GameState, puzzle: Puzzle): Phase {
  if (state.round >= puzzle.rounds.length) return "finished";
  return state.cuts.length > state.round ? "result" : "cutting";
}

/** The next state, or the same object if the action doesn't apply (e.g. a line that
 *  misses the country, which the screen explains before it gets here). */
export function step(state: GameState, action: Action, puzzle: Puzzle): GameState {
  const now = phase(state, puzzle);
  if (action.type === "cut") {
    const round = puzzle.rounds[state.round];
    if (now !== "cutting" || !crosses(round, action.line)) return state;
    const { share, miss, score } = scoreCut(round, action.line);
    return { ...state, cuts: [...state.cuts, { line: action.line, share, miss, score }] };
  }
  if (now !== "result") return state;
  if (action.type === "retry") return { ...state, cuts: state.cuts.slice(0, state.round) };
  return { ...state, round: state.round + 1 };
}

/** Is a saved in-progress state usable with this puzzle? (Storage can hold anything.) */
export function isValidState(saved: unknown, puzzle: Puzzle): saved is GameState {
  if (!saved || typeof saved !== "object") return false;
  const s = saved as GameState;
  return (
    Number.isInteger(s.round) &&
    s.round >= 0 &&
    s.round < puzzle.rounds.length &&
    Array.isArray(s.cuts) &&
    s.cuts.length <= puzzle.rounds.length &&
    (s.cuts.length === s.round || s.cuts.length === s.round + 1) &&
    s.cuts.every((c) => c && Array.isArray(c.line?.normal) && Number.isFinite(c.line.offset) && Number.isInteger(c.score))
  );
}
