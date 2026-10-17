// All Downstream scoring knobs, in one place. Placeholders until the playtest.
//
// "Stage" = how many route stops were revealed when the guess was locked in:
// 0 = pin only, 1..3 = after each stop. One guess per drop; a wrong guess ends
// the drop. If the player hasn't guessed after the last stop, the drop scores 0.
// (If the pipeline's stop count changes, give POINTS_BY_STAGE one entry per stage.)

export const POINTS_BY_STAGE = [4, 3, 2, 1];
// One square per score, in clearly different hues (🟨 and 🟧 look alike on
// Windows, so they're not neighbours): green 4, blue 3, yellow 2, orange 1.
export const EMOJI_BY_STAGE = ["🟩", "🟦", "🟨", "🟧"];
export const EMOJI_WRONG = "🟥";
export const EMOJI_NO_GUESS = "⬜";

/** What each square means, for the legend under the summary's share preview. */
export const EMOJI_LEGEND: [string, string][] = [
  ...EMOJI_BY_STAGE.map((e, i): [string, string] => [e, `${POINTS_BY_STAGE[i]}`]),
  [EMOJI_WRONG, "wrong"],
  [EMOJI_NO_GUESS, "no guess"],
];

export type DropResult = {
  guess: string | null; // null = never guessed
  stage: number;
  correct: boolean;
};

export function dropPoints(result: DropResult): number {
  return result.correct ? (POINTS_BY_STAGE[result.stage] ?? 0) : 0;
}

export function dropEmoji(result: DropResult): string {
  if (result.guess === null) return EMOJI_NO_GUESS;
  if (!result.correct) return EMOJI_WRONG;
  return EMOJI_BY_STAGE[result.stage] ?? EMOJI_BY_STAGE[EMOJI_BY_STAGE.length - 1];
}

export function totalPoints(results: DropResult[]): number {
  return results.reduce((sum, r) => sum + dropPoints(r), 0);
}

export function maxPoints(dropCount: number): number {
  return dropCount * POINTS_BY_STAGE[0];
}
