// Dev only: helpers in the browser console for checking the shared streak, with
// `?debugDay=N` (lib/devDay.ts) to move today. Installed by components/ScoreSync.tsx when
// running `npm run dev`; production builds never install them. They only touch this
// browser's own storage, never the scores API.
//
//   pondoStreak.show()                  the streak today: current, best, freezes, the week
//   pondoStreak.play("slice", 18, 19)   mark past days as played (a stand-in result, 0 points)
//   pondoStreak.unplay("slice", 19)     forget a day
//   pondoStreak.old()                   forget the migration seed: the next page load makes it
//                                       again from the per-game histories, as for a returning player
//   pondoStreak.clear()                 forget both games' histories, the seed and the milestones shown
//
// Mark only past days: today's own puzzle should be played, so its summary has a real result.

import { getPuzzleNumber } from "./daily";
import { getHistory, removeResult, removeSetting, saveResult } from "./storage";
import { MILESTONES_SHOWN, readStreak, SEED, STREAK_GAMES } from "./useStreak";

export function installStreakHelpers(): void {
  if (process.env.NODE_ENV !== "development") return;
  const check = (game: string) => {
    if (!STREAK_GAMES.includes(game)) throw new Error(`game is one of ${STREAK_GAMES.join(", ")}`);
  };
  (window as unknown as { pondoStreak: unknown }).pondoStreak = {
    show() {
      const today = getPuzzleNumber();
      const s = readStreak(today);
      console.log(`Today is #${today}.`, s);
      console.table(STREAK_GAMES.map((g) => ({ game: g, played: Object.keys(getHistory(g)).join(", ") })));
      return s;
    },
    play(game: string, ...days: number[]) {
      check(game);
      days.forEach((d) => saveResult(game, d, { points: 0, devStandIn: true }));
    },
    unplay(game: string, ...days: number[]) {
      check(game);
      days.forEach((d) => removeResult(game, d));
    },
    old() {
      removeSetting("site", SEED);
    },
    clear() {
      STREAK_GAMES.forEach((g) => Object.keys(getHistory(g)).forEach((d) => removeResult(g, Number(d))));
      removeSetting("site", SEED);
      removeSetting("site", MILESTONES_SHOWN);
    },
  };
}
