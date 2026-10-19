// Slice's rules as a small state machine. Pure (no React, no storage), so it's unit
// tested and the saved state can be checked.
//
// Each round allows MAX_TRIES cuts (developer's call, 2026-10-19, replacing unlimited
// playtest tries): cut, see how you did, then cut again or keep it. The best cut
// counts. Only once the round is settled (kept, or every try used) can the perfect cut
// be shown, so it never helps a try.
//
//   cutting --cut--> result --again--> cutting --cut--> settled --next--> next round
//                       \--keep--> settled

import { crosses } from "./cut";
import { scoreCut } from "./scoring";
import type { Line, Puzzle } from "./types";

export const MAX_TRIES = 2;

/** One cut: the line and how it scored (kept so a reload shows it again). */
export type SavedCut = { line: Line; share: number; miss: number; score: number };

export type GameState = {
  round: number; // the round on screen; rounds.length = the day is done
  cuts: SavedCut[]; // each round's best cut so far (the current round's once it's been cut)
  tries: number; // cuts made in the current round
  last: SavedCut | null; // the current round's latest cut: what the board shows
  again: boolean; // the player chose to cut again: the board is clear for the next try
  kept: boolean; // the player kept their cut before using every try
};

export type Action = { type: "cut"; line: Line } | { type: "again" } | { type: "keep" } | { type: "next" };

export type Phase = "cutting" | "result" | "settled" | "finished";

export const initialState: GameState = { round: 0, cuts: [], tries: 0, last: null, again: false, kept: false };

export function phase(state: GameState, puzzle: Puzzle): Phase {
  if (state.round >= puzzle.rounds.length) return "finished";
  if (state.tries === 0 || state.again) return "cutting";
  if (state.kept || state.tries >= MAX_TRIES) return "settled";
  return "result";
}

/** Tries left in the current round. */
export function triesLeft(state: GameState): number {
  return Math.max(0, MAX_TRIES - state.tries);
}

/** The next state, or the same object if the action doesn't apply (e.g. a line that
 *  misses the country, which the screen explains before it gets here). */
export function step(state: GameState, action: Action, puzzle: Puzzle): GameState {
  const now = phase(state, puzzle);
  switch (action.type) {
    case "cut": {
      const round = puzzle.rounds[state.round];
      if (now !== "cutting" || !crosses(round, action.line)) return state;
      const { share, miss, score } = scoreCut(round, action.line);
      const cut = { line: action.line, share, miss, score };
      const best = state.cuts[state.round];
      const keep = best && best.score >= score ? best : cut;
      return { ...state, cuts: [...state.cuts.slice(0, state.round), keep], tries: state.tries + 1, last: cut, again: false };
    }
    case "again":
      return now === "result" ? { ...state, again: true } : state;
    case "keep":
      return now === "result" ? { ...state, kept: true } : state;
    case "next":
      return now === "settled" ? { ...state, round: state.round + 1, tries: 0, last: null, again: false, kept: false } : state;
  }
}

const isCut = (c: unknown): c is SavedCut => {
  const x = c as SavedCut;
  return !!x && Array.isArray(x.line?.normal) && Number.isFinite(x.line.offset) && Number.isInteger(x.score);
};

/** Is a saved in-progress state usable with this puzzle? (Storage can hold anything.) */
export function isValidState(saved: unknown, puzzle: Puzzle): saved is GameState {
  if (!saved || typeof saved !== "object") return false;
  const s = saved as GameState;
  return (
    Number.isInteger(s.round) &&
    s.round >= 0 &&
    s.round < puzzle.rounds.length &&
    Number.isInteger(s.tries) &&
    s.tries >= 0 &&
    s.tries <= MAX_TRIES &&
    typeof s.again === "boolean" &&
    typeof s.kept === "boolean" &&
    Array.isArray(s.cuts) &&
    s.cuts.length === s.round + (s.tries > 0 ? 1 : 0) &&
    s.cuts.every(isCut) &&
    (s.tries === 0 ? s.last === null : isCut(s.last))
  );
}
