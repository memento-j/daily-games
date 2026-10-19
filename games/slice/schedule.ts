// Which Slice puzzle a visit plays (the rule is shared: lib/schedule.ts), and where
// its results are stored.

export { puzzleToPlay } from "../../lib/schedule"; // relative: tests run without the @/ alias

// Previews (?puzzle=N, or any play before launch) are kept apart from real results.
// The preview key moved on 2026-10-19 when cuts started scoring out of 100 instead of
// in colour tiers: playtest results saved the old way are left behind, not misread.
export const GAME_KEY = "slice";
export const PREVIEW_KEY = "slice-preview-v2";
export const storageKeyFor = (preview: boolean) => (preview ? PREVIEW_KEY : GAME_KEY);
