// Which Downstream puzzle a visit plays (the rule is shared: lib/schedule.ts), and
// where its results are stored.

export { PRE_LAUNCH_PREVIEW, lastOpenPuzzle, puzzleToPlay } from "../../lib/schedule"; // relative: tests run without the @/ alias

// Storage keys. Previews (?puzzle=N, or Play before launch) are kept apart from
// real results, so playtesting puzzle #1 now doesn't mark the real #1 as played.
export const GAME_KEY = "downstream";
export const PREVIEW_KEY = "downstream-preview";
export const storageKeyFor = (preview: boolean) => (preview ? PREVIEW_KEY : GAME_KEY);
