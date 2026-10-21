// Date -> puzzle number, shared by all games.
//
// Every browser works this out independently from the player's local calendar
// date, so everyone on the same date gets the same puzzle. Only call this in the
// browser (after mount), never during render on the server/build: the build runs
// on a different day than the player's visit.

// Launch day, puzzle #1: 21 October 2026 (developer's call, 2026-10-20). Months are
// 0-based (9 = October). Never shown to players; it only sets which day is #1.
const LAUNCH = Date.UTC(2026, 9, 21);
const DAY_MS = 24 * 60 * 60 * 1000;

/** Launch day is #1. Below 1 means the game hasn't launched yet. */
export function getPuzzleNumber(now = new Date()): number {
  // Read the *local* year/month/day, then subtract as UTC midnights, so daylight
  // saving changes (23- or 25-hour days) can't shift the result by one.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - LAUNCH) / DAY_MS) + 1;
}

/** 42 -> "0042", matching the generated file names. */
export function padPuzzleNumber(n: number): string {
  return String(n).padStart(4, "0");
}

/** Milliseconds until the next puzzle: the player's next local midnight. */
export function msUntilNextPuzzle(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** "5h 12m", "42m", "under a minute". */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
