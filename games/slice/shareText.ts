// Slice's share text (developer's call, 2026-11-12, to lift a low share rate: the old text
// was only numbers, "Slice #4 312/400" and the round scores, which said nothing to a friend
// who'd never heard of the game):
//
//   Slice #22 · 135/400 · 🔥 5-day streak
//   🇯🇵 32 · 🇩🇪 27 · 🇧🇷 24💡 · 🇦🇺 52💡
//   Split a country's population in half with one line
//   https://pondo.games/slice
//
// The player's current streak (left out under 2 days, as on the results screen, and on yesterday's puzzle, which
// never counts toward it); each round's country as its flag, or its two-letter code where
// the device doesn't draw flags ("JP 32"), then its score and a 💡 if the round took the
// hint; one line saying what the game is; the address. Pure, unit tested.

import { flagEmoji } from "../../lib/flags";

export const SLICE_PITCH = "Split a country's population in half with one line";

export type ShareRound = { iso?: string; score: number; hinted: boolean };

export function sliceShareText({
  game,
  number,
  points,
  maxPoints,
  rounds,
  streak = 0,
  flags,
  url,
}: {
  game: string;
  number: number;
  points: number;
  maxPoints: number;
  rounds: ShareRound[];
  /** The current streak, days; under 2 shows none (as the results screen). */
  streak?: number;
  /** Flags where the device draws them (`canShowFlags`), else the codes. */
  flags: boolean;
  /** The address ("https://pondo.games/slice"). */
  url: string;
}): string {
  const line = rounds
    .map((r) => {
      const mark = r.iso ? (flags ? flagEmoji(r.iso) : r.iso.toUpperCase()) : "";
      return `${mark ? `${mark} ` : ""}${r.score}${r.hinted ? "💡" : ""}`;
    })
    .join(" · ");
  const first = [`${game} #${number}`, `${points}/${maxPoints}`, ...(streak >= 2 ? [`🔥 ${streak}-day streak`] : [])].join(" · ");
  return [first, line, SLICE_PITCH, url].join("\n");
}
