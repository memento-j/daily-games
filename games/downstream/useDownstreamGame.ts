"use client";

// The Downstream game's state and loading, shared by every layout of the game
// screen. Layouts only decide how it looks; this decides what happens.
//
// Runs in the browser only: today's date, fetch() of the puzzle file and
// localStorage must never run during the build, which happens on another day.

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { padPuzzleNumber } from "@/lib/daily";
import { clearInProgress, getInProgress, getResult, saveInProgress, saveResult } from "@/lib/storage";
import { initialState, isValidState, phase, step, type Action, type GameState, type Phase } from "./game";
import { totalPoints, type DropResult } from "./scoring";
import { puzzleToPlay } from "./schedule";
import type { Puzzle } from "./types";

// Storage keys. Previews (?puzzle=N before launch) are kept apart from real
// results, so playtesting puzzle #1 now doesn't mark the real #1 as played.
const GAME = "downstream";
const PREVIEW_GAME = "downstream-preview";
type SavedResult = { results: DropResult[]; points: number };

export type Load =
  | { status: "loading" }
  | { status: "comingSoon" }
  | { status: "missing" }
  | { status: "ready"; number: number; puzzle: Puzzle; preview: boolean };

export type DownstreamGameState = {
  load: Load;
  game: GameState;
  phase: Phase | null; // null until a puzzle is ready
  preview: boolean; // playing ?puzzle=N
  act: (action: Action) => void;
};

export function useDownstreamGame(): DownstreamGameState {
  // ?puzzle=3 plays a specific puzzle (for playtesting before launch).
  const override = useSearchParams().get("puzzle");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [game, setGame] = useState<GameState>(initialState);

  // Work out today's puzzle and fetch it. Puzzles are fetched at runtime, never
  // imported, so future answers aren't bundled into the JavaScript.
  useEffect(() => {
    let cancelled = false;
    async function loadPuzzle() {
      const { number, preview } = puzzleToPlay(override);
      const storageKey = preview ? PREVIEW_GAME : GAME;
      if (!Number.isInteger(number) || number < 1) {
        setLoad({ status: "comingSoon" });
        return;
      }
      let puzzle: Puzzle | null = null;
      try {
        const res = await fetch(`/data/downstream/${padPuzzleNumber(number)}.json`);
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
      if (finished) setGame({ drop: puzzle.drops.length, stage: 0, results: finished.results });
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
    const storageKey = load.preview ? PREVIEW_GAME : GAME;
    const next = step(game, action, puzzle);
    if (next === game) return;
    setGame(next);
    if (phase(next, puzzle) === "finished") {
      saveResult<SavedResult>(storageKey, number, { results: next.results, points: totalPoints(next.results) });
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
