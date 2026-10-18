// Which Slice puzzle a visit plays (the rule is shared: lib/schedule.ts), and where
// its results are stored.

export { puzzleToPlay } from "../../lib/schedule"; // relative: tests run without the @/ alias

// Previews (?puzzle=N, or any play before launch) are kept apart from real results.
export const GAME_KEY = "slice";
export const PREVIEW_KEY = "slice-preview";
export const storageKeyFor = (preview: boolean) => (preview ? PREVIEW_KEY : GAME_KEY);
