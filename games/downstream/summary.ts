// Pure helpers for the day's summary (unit tested in tests/games/downstream/summary.test.ts).

import type { Drop } from "./types";

/**
 * The drop the summary map opens on: the day's biggest surprise. Hardest first;
 * among equals, one whose water skips the nearest sea; then the longest journey.
 */
export function mostSurprisingDrop(drops: Pick<Drop, "difficulty" | "nearestSea" | "answer" | "distanceKm">[]): number {
  let best = 0;
  const score = (d: (typeof drops)[number]) => [d.difficulty ?? 0, d.nearestSea && d.nearestSea !== d.answer ? 1 : 0, d.distanceKm];
  for (let i = 1; i < drops.length; i++) {
    const a = score(drops[i]);
    const b = score(drops[best]);
    for (let k = 0; k < a.length; k++) {
      if (a[k] !== b[k]) {
        if (a[k] > b[k]) best = i;
        break;
      }
    }
  }
  return best;
}
