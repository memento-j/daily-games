// The shared streak (developer's call, 2026-11-12): one streak for the whole site. A day
// counts when the player finishes either game's daily puzzle (never practice, never
// yesterday's puzzle played late). Days are puzzle numbers, which roll over at the player's
// local midnight (lib/daily.ts). Pure, so it's unit tested; lib/useStreak.ts reads storage.
//
// Freezes: every FREEZE_EVERY days played earns one, up to MAX_FREEZES held. When the player
// comes back after missing days, one freeze covers each missed day, used as they finish
// that next puzzle. If they missed more days than they hold, the streak starts again at 1
// and the freezes are kept (nothing was saved with them). A frozen day keeps the streak
// unbroken but doesn't add to it: the streak counts days played. Freezes replaced the old
// rule (one missed day a week forgiven, lib/stats.ts), which would otherwise double up.
//
// Migration: players' old per-game streaks (the old rule, per game) are kept as a `Seed`,
// worked out once: on the day each old streak was last played, the shared streak is at
// least that long, and the best streak is at least the old best. So switching never cuts
// anyone's streak, even where the old rule forgave a gap that freezes can't cover.

import { computeStats } from "./stats";

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const MILESTONES = [3, 7, 30, 100];

/** One of the last seven days: played, saved by a freeze, missed, or today not yet played. */
export type DayMark = "played" | "frozen" | "missed" | "today";

/** The old per-game streaks: `streaks[day]` is a streak that ran through that played day. */
export type Seed = { streaks: Record<number, number>; best: number };

export type Streak = {
  /** Days played in the current run; 0 once it's broken beyond what freezes can save. */
  current: number;
  best: number;
  /** Freezes held now. */
  freezes: number;
  playedToday: boolean;
  /** Freezes used by today's first finished puzzle (0 if none, or not played yet). */
  frozenToday: number;
  /** The last seven days, oldest first, ending today. */
  week: DayMark[];
  /** A milestone reached today (3, 7, 30, 100), or null. */
  milestone: number | null;
};

export function computeStreak(played: number[], today: number, seed?: Seed | null): Streak {
  const days = [...new Set(played)].filter((d) => Number.isInteger(d) && d <= today).sort((a, b) => a - b);
  const frozen = new Set<number>();
  const usedOn = new Map<number, number>();
  let length = 0;
  let best = seed?.best ?? 0;
  let freezes = 0;
  let last: number | null = null;
  days.forEach((day, i) => {
    const missed = last === null ? 0 : day - last - 1;
    if (last === null) length = 1;
    else if (missed === 0) length++;
    else if (missed <= freezes) {
      freezes -= missed;
      usedOn.set(day, missed);
      for (let d = last + 1; d < day; d++) frozen.add(d);
      length++;
    } else length = 1;
    length = Math.max(length, seed?.streaks[day] ?? 0);
    // Earned after this day counts, so it can't cover the gap just before it.
    if ((i + 1) % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    best = Math.max(best, length);
    last = day;
  });
  const playedToday = last === today;
  // Not played today: still alive while the days missed since could all be frozen.
  const alive = last !== null && (playedToday || today - 1 - last <= freezes);
  const current = alive ? length : 0;
  const set = new Set(days);
  const week: DayMark[] = [];
  for (let d = today - 6; d <= today; d++) {
    week.push(set.has(d) ? "played" : frozen.has(d) ? "frozen" : d === today ? "today" : "missed");
  }
  return {
    current,
    best,
    freezes,
    playedToday,
    frozenToday: playedToday ? (usedOn.get(today) ?? 0) : 0,
    week,
    milestone: playedToday && MILESTONES.includes(current) ? current : null,
  };
}

/**
 * The migration seed, from each game's own history under the old per-game rule
 * (`computeStats`): each live old streak, pinned to the day it was last played, and the
 * best of the old bests. Worked out once and kept (lib/useStreak.ts).
 */
export function seedFrom(histories: Record<number, { points: number }>[], today: number): Seed {
  const seed: Seed = { streaks: {}, best: 0 };
  for (const history of histories) {
    const stats = computeStats(history, today);
    const days = Object.keys(history).map(Number).filter((d) => Number.isInteger(d) && d <= today);
    seed.best = Math.max(seed.best, stats.bestStreak);
    if (stats.currentStreak > 0 && days.length) {
      const last = Math.max(...days);
      seed.streaks[last] = Math.max(seed.streaks[last] ?? 0, stats.currentStreak);
    }
  }
  return seed;
}

/** The one-line message for a milestone. Calm and pleased, never a warning. */
export function milestoneText(days: number): string {
  if (days >= 100) return `${days} days in a row. Remarkable.`;
  if (days >= 30) return `${days} days in a row. That's a habit.`;
  if (days >= 7) return `${days} days in a row. Nice.`;
  return `${days} days in a row. Good start.`;
}
