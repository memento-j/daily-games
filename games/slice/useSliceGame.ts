"use client";

// The Slice game's state and loading. The screen only decides how it looks; this
// decides what happens.
//
// Runs in the browser only: today's date, fetch() of the puzzle file and
// localStorage must never run during the build, which happens on another day.

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { padPuzzleNumber } from "@/lib/daily";
import { computeStats } from "@/lib/stats";
import { clearInProgress, getHistory, getInProgress, getResult, saveInProgress, saveResult } from "@/lib/storage";
import { initialState, isValidState, phase, step, type Action, type GameState, type Phase, type SavedCut } from "./game";
import { practiceCountry, practicePuzzle, type PracticeCountry } from "./practice";
import { maxScore, totalScore } from "./scoring";
import { GAME_KEY, puzzleToPlay, storageKeyFor } from "./schedule";
import type { Puzzle } from "./types";

// `points` feeds the shared streaks and stats (lib/stats.ts averages it).
export type SavedResult = { cuts: SavedCut[]; points: number };

export type Load =
  | { status: "loading" }
  | { status: "comingSoon" }
  | { status: "missing" }
  | { status: "noPractice" } // ?country= names a country that isn't open for practice
  | { status: "ready"; number: number; puzzle: Puzzle; preview: boolean; practice: PracticeCountry | null };

export type SliceGameState = {
  load: Load;
  game: GameState;
  phase: Phase | null; // null until a puzzle is ready
  preview: boolean;
  act: (action: Action) => void;
};

export function useSliceGame(): SliceGameState {
  // ?puzzle=N plays yesterday's puzzle (lib/schedule.ts); ?country=japan practises one
  // past country (games/slice/practice.ts).
  const params = useSearchParams();
  const override = params.get("puzzle");
  const countryParam = params.get("country");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [game, setGame] = useState<GameState>(initialState);

  // Puzzles are fetched at runtime, never imported, so future answers aren't
  // bundled into the JavaScript.
  useEffect(() => {
    let cancelled = false;
    async function loadPractice() {
      const country = practiceCountry(countryParam);
      if (!country) {
        setLoad({ status: "noPractice" });
        return;
      }
      let puzzle: Puzzle | null = null;
      try {
        const res = await fetch(`/data/slice/${padPuzzleNumber(country.puzzle)}.json`);
        if (res.ok) puzzle = practicePuzzle((await res.json()) as Puzzle, country);
      } catch {
        // offline or similar: treated like a missing puzzle below
      }
      if (cancelled) return;
      if (!puzzle) {
        setLoad({ status: "missing" });
        return;
      }
      // Always a fresh start: practice is saved nowhere.
      setGame(initialState);
      setLoad({ status: "ready", number: country.puzzle, puzzle, preview: true, practice: country });
    }
    async function loadPuzzle() {
      if (countryParam !== null) return loadPractice();
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
      // Already finished? Show the summary. Half-way through? Resume. Yesterday's puzzle
      // counts as finished if it was played on its own day too (the real key), so it
      // shows that result rather than starting a fresh catch-up game.
      const finished = getResult<SavedResult>(storageKey, number) ?? (preview ? getResult<SavedResult>(GAME_KEY, number) : null);
      const saved = getInProgress<unknown>(storageKey, number);
      if (finished) setGame({ ...initialState, round: puzzle.rounds.length, cuts: finished.cuts });
      else if (isValidState(saved, puzzle)) setGame(saved);
      else setGame(initialState);
      setLoad({ status: "ready", number, puzzle, preview, practice: null });
    }
    loadPuzzle();
    return () => {
      cancelled = true;
    };
  }, [override, countryParam]);

  function act(action: Action) {
    if (load.status !== "ready") return;
    const { number, puzzle } = load;
    const storageKey = storageKeyFor(load.preview);
    const next = step(game, action, puzzle);
    if (next === game) return;
    setGame(next);
    // Practice: nothing saved, and its own analytics events.
    if (load.practice) {
      const country = load.practice.name;
      if (action.type === "cut" && game.round === 0 && game.tries === 0) track("practice_started", { country });
      if (phase(next, puzzle) === "finished") track("practice_finished", { country, points: totalScore(next.cuts) });
      return;
    }
    // Analytics (lib/analytics.ts): the first cut of a fresh puzzle and the finished day.
    const play = { game: "slice", puzzle: number, preview: load.preview } as const;
    if (action.type === "cut" && game.round === 0 && game.tries === 0) track("puzzle_started", play);
    if (phase(next, puzzle) === "finished") {
      saveResult<SavedResult>(storageKey, number, { cuts: next.cuts, points: totalScore(next.cuts) });
      clearInProgress(storageKey);
      // After saving, so the streak includes today.
      const streak = computeStats(getHistory<SavedResult>(storageKey), number).currentStreak;
      track("puzzle_finished", { ...play, points: totalScore(next.cuts), maxPoints: maxScore(puzzle.rounds.length), streak });
    } else {
      saveInProgress(storageKey, number, next);
    }
  }

  return {
    load,
    game,
    phase: load.status === "ready" ? phase(game, load.puzzle) : null,
    preview: load.status === "ready" ? load.preview : override !== null || countryParam !== null,
    act,
  };
}
