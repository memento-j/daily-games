// Which puzzle a visit plays, shared by all games. Pure, so it's unit tested.

import { getPuzzleNumber } from "./daily";

// Before launch there's no "today's puzzle" yet; Play opens this preview instead
// of a "coming soon" screen, so it's always one click into a puzzle.
export const PRE_LAUNCH_PREVIEW = 1;

/** The last puzzle a visit may open. Once launched that's today's: past puzzles stay
 *  playable, future ones don't (no peeking ahead). Before launch, any (playtesting). */
export function lastOpenPuzzle(today = getPuzzleNumber()): number {
  return today >= 1 ? today : Infinity;
}

/** ?puzzle=N if given, else today's puzzle, else (before launch) the first preview.
 *  A future ?puzzle=N gives NaN, which the games show as "coming soon". */
export function puzzleToPlay(override: string | null, today = getPuzzleNumber()): { number: number; preview: boolean } {
  if (override !== null) {
    const n = Number(override);
    return { number: n > lastOpenPuzzle(today) ? NaN : n, preview: true };
  }
  if (today >= 1) return { number: today, preview: false };
  return { number: PRE_LAUNCH_PREVIEW, preview: true };
}
