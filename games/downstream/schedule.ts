// Which Downstream puzzle a visit plays. Pure, so it's unit tested.

import { getPuzzleNumber } from "../../lib/daily"; // relative: tests run without the @/ alias

// Before launch there's no "today's puzzle" yet; Play opens this preview instead
// of a "coming soon" screen, so it's always one click into a puzzle.
export const PRE_LAUNCH_PREVIEW = 1;

/** ?puzzle=N if given, else today's puzzle, else (before launch) the first preview. */
export function puzzleToPlay(override: string | null, today = getPuzzleNumber()): { number: number; preview: boolean } {
  if (override !== null) return { number: Number(override), preview: true };
  if (today >= 1) return { number: today, preview: false };
  return { number: PRE_LAUNCH_PREVIEW, preview: true };
}

// Storage keys. Previews (?puzzle=N, or Play before launch) are kept apart from
// real results, so playtesting puzzle #1 now doesn't mark the real #1 as played.
export const GAME_KEY = "downstream";
export const PREVIEW_KEY = "downstream-preview";
export const storageKeyFor = (preview: boolean) => (preview ? PREVIEW_KEY : GAME_KEY);
