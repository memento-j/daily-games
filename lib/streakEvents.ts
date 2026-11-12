// The streak's analytics, sent as a daily puzzle finishes (both games' hooks call this
// right after saving the result). Only the day's first finished puzzle counts the day, so
// a milestone or a used freeze is sent once, whichever game came first.

import { track } from "./analytics";
import type { Streak } from "./streak";
import { readStreak } from "./useStreak";

/** The shared streak after this finish, for `puzzle_finished`. Sends `streak_milestone` and
 *  `streak_freeze_used` when this finish was the day's first (`firstToday`). */
export function streakAfterFinish(today: number, firstToday: boolean): Streak {
  const s = readStreak(today);
  if (firstToday && s.playedToday) {
    if (s.milestone) track("streak_milestone", { days: s.milestone });
    if (s.frozenToday > 0) track("streak_freeze_used", { streak: s.current, freezes_left: s.freezes });
  }
  return s;
}
