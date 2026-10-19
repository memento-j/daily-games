"use client";

// The Slice game's state and loading. The screen only decides how it looks; this
// decides what happens.
//
// Runs in the browser only: today's date, fetch() of the puzzle file and
// localStorage must never run during the build, which happens on another day.

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { padPuzzleNumber } from "@/lib/daily";
import { clearInProgress, getInProgress, getResult, saveInProgress, saveResult } from "@/lib/storage";
import { initialState, isValidState, phase, step, type Action, type GameState, type Phase, type SavedCut } from "./game";
import { maxPoints, totalPoints } from "./scoring";
import { puzzleToPlay, storageKeyFor } from "./schedule";
import type { Puzzle } from "./types";

// `points` feeds the shared streaks and stats (lib/stats.ts averages it).
export type SavedResult = { cuts: SavedCut[]; points: number };

export type Load =
  | { status: "loading" }
  | { status: "comingSoon" }
  | { status: "missing" }
  | { status: "ready"; number: number; puzzle: Puzzle; preview: boolean };

export type SliceGameState = {
  load: Load;
  game: GameState;
  phase: Phase | null; // null until a puzzle is ready
  preview: boolean;
  act: (action: Action) => void;
};

export function useSliceGame(): SliceGameState {
  // ?puzzle=3 plays a specific puzzle (for playtesting before launch).
  const override = useSearchParams().get("puzzle");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [game, setGame] = useState<GameState>(initialState);
  const started = useRef(false); // puzzle_started sent (analytics)

  // Puzzles are fetched at runtime, never imported, so future answers aren't
  // bundled into the JavaScript.
  useEffect(() => {
    let cancelled = false;
    async function loadPuzzle() {
      const { number, preview } = puzzleToPlay(override);
      const storageKey = storageKeyFor(preview);
      if (!Number.isInteger(number) || number < 1) {
        setLoad({ status: "comingSoon" });
        return;
      }
      let puzzle: Puzzle | null = null;
      try {
        const res = await fetch(`/data/slice/${padPuzzleNumber(number)}.json`);
        if (res.ok) puzzle = (await res.json()) as Puzzle;
      } catch {
        // offline or similar: treated like a missing puzzle below
      }
      if (cancelled) return;
      if (!puzzle) {
        setLoad({ status: "missing" });
        return;
      }
      // Already finished today? Show the summary. Half-way through? Resume.
      const finished = getResult<SavedResult>(storageKey, number);
      const saved = getInProgress<unknown>(storageKey, number);
      if (finished) setGame({ round: puzzle.rounds.length, cuts: finished.cuts });
      else if (isValidState(saved, puzzle)) setGame(saved);
      else setGame(initialState);
      setLoad({ status: "ready", number, puzzle, preview });
    }
    loadPuzzle();
    return () => {
      cancelled = true;
    };
  }, [override]);

  function act(action: Action) {
    if (load.status !== "ready") return;
    const { number, puzzle } = load;
    const storageKey = storageKeyFor(load.preview);
    const next = step(game, action, puzzle);
    if (next === game) return;
    setGame(next);
    // Analytics (lib/analytics.ts): the first cut of a fresh puzzle, each cut (a retry
    // and a new cut of the same round count again), and the finished day.
    const play = { game: "slice", puzzle: number, preview: load.preview } as const;
    if (action.type === "cut") {
      if (game.round === 0 && game.cuts.length === 0 && !started.current) {
        started.current = true; // a retry of round 1 isn't a new start
        track("puzzle_started", play);
      }
      const cut = next.cuts[game.round];
      if (cut) track("round_cut", { ...play, round: game.round + 1, mode: puzzle.rounds[game.round].mode, tier: cut.tier });
    }
    if (phase(next, puzzle) === "finished") {
      track("puzzle_finished", { ...play, points: totalPoints(next.cuts), maxPoints: maxPoints(puzzle.rounds.length) });
      saveResult<SavedResult>(storageKey, number, { cuts: next.cuts, points: totalPoints(next.cuts) });
      clearInProgress(storageKey);
    } else {
      saveInProgress(storageKey, number, next);
    }
  }

  return {
    load,
    game,
    phase: load.status === "ready" ? phase(game, load.puzzle) : null,
    preview: load.status === "ready" ? load.preview : override !== null,
    act,
  };
}
