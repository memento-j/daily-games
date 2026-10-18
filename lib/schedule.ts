// Which puzzle a visit plays, shared by all games. Pure, so it's unit tested.

import { getPuzzleNumber } from "./daily";

// Before launch there's no "today's puzzle" yet; Play opens this preview instead
// of a "coming soon" screen, so it's always one click into a puzzle.
export const PRE_LAUNCH_PREVIEW = 1;

/** ?puzzle=N if given, else today's puzzle, else (before launch) the first preview. */
export function puzzleToPlay(override: string | null, today = getPuzzleNumber()): { number: number; preview: boolean } {
  if (override !== null) return { number: Number(override), preview: true };
  if (today >= 1) return { number: today, preview: false };
  return { number: PRE_LAUNCH_PREVIEW, preview: true };
}
