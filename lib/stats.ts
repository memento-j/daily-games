// Streaks and stats, derived from a game's history (one result per puzzle day).
// Shared by all games; pure, so it's unit tested.
//
// Streaks are forgiving: missing a single day doesn't break one, at most once a
// week. Coming back after a short break shouldn't wipe out weeks of play.

export const FORGIVE_EVERY_DAYS = 7; // at most one forgiven missed day per this many days

export type Stats = {
  played: number;
  currentStreak: number; // 0 if the streak has lapsed
  bestStreak: number;
  averagePoints: number | null; // null before the first finished day
};

type Run = { length: number; lastDay: number; lastForgiven: number };

/** Walk the played days in order, growing streak runs; a new run starts at a break. */
function streakRuns(days: number[]): Run[] {
  const runs: Run[] = [];
  let run: Run | null = null;
  for (const day of days) {
    if (run) {
      const gap = day - run.lastDay;
      const missed = day - 1;
      if (gap === 1) {
        run.length++;
        run.lastDay = day;
        continue;
      }
      if (gap === 2 && missed - run.lastForgiven >= FORGIVE_EVERY_DAYS) {
        run.length++;
        run.lastDay = day;
        run.lastForgiven = missed;
        continue;
      }
    }
    run = { length: 1, lastDay: day, lastForgiven: -Infinity };
    runs.push(run);
  }
  return runs;
}

export function computeStats(history: Record<number, { points: number }>, today: number): Stats {
  const days = Object.keys(history)
    .map(Number)
    .filter((d) => Number.isInteger(d) && d <= today)
    .sort((a, b) => a - b);
  const runs = streakRuns(days);
  const last = runs[runs.length - 1];
  // Still alive: played today or yesterday, or the day before with yesterday forgivable.
  const alive =
    !!last &&
    (last.lastDay >= today - 1 || (last.lastDay === today - 2 && today - 1 - last.lastForgiven >= FORGIVE_EVERY_DAYS));
  const points = days.map((d) => history[d].points);
  return {
    played: days.length,
    currentStreak: alive ? last.length : 0,
    bestStreak: runs.reduce((best, r) => Math.max(best, r.length), 0),
    averagePoints: points.length ? Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 10) / 10 : null,
  };
}
