// Which puzzle a visit plays, shared by all games. Pure, so it's unit tested.

import { getPuzzleNumber } from "./daily";

/** Today's puzzle, or ?puzzle=N. Only today's and yesterday's can be played
 *  (developer's call, 2026-10-22): ?puzzle=today is the real puzzle; yesterday's plays
 *  as a preview (`preview: true`), saved apart so it never changes streaks or stats.
 *  Any other N, older, future or not a number, gives NaN: "That puzzle isn't available". */
export function puzzleToPlay(override: string | null, today = getPuzzleNumber()): { number: number; preview: boolean } {
  if (override === null) return { number: today, preview: false };
  const n = Number(override);
  if (n === today) return { number: today, preview: false };
  if (n === today - 1 && n >= 1) return { number: n, preview: true };
  return { number: NaN, preview: true };
}
