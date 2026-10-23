// Practice mode (/slice/?country=japan): one country from a past daily puzzle, played
// exactly like a daily round (two tries, the reveal, the perfect cut) but saved nowhere,
// so it never touches the day's score, streaks or stats (developer's call, 2026-10-23).
//
// Only add a country here once its daily puzzle is over everywhere (a day after its
// date): practice shows the perfect cut, so it would spoil a puzzle still being played.
// The round is read from that day's puzzle file, so there's nothing to generate.

import type { Puzzle } from "./types";

export type PracticeCountry = {
  slug: string; // the address: /slice/?country=<slug>
  name: string; // as a button says it ("United States")
  id: string; // the round's `id` in the puzzle file (Natural Earth's name)
  puzzle: number; // the daily puzzle it came from
};

// The famous ones from #1 and #2 (developer's call, 2026-10-23).
export const PRACTICE: PracticeCountry[] = [
  { slug: "japan", name: "Japan", id: "Japan", puzzle: 1 },
  { slug: "united-states", name: "United States", id: "United States of America", puzzle: 2 },
  { slug: "australia", name: "Australia", id: "Australia", puzzle: 1 },
  { slug: "germany", name: "Germany", id: "Germany", puzzle: 1 },
  { slug: "south-korea", name: "South Korea", id: "South Korea", puzzle: 2 },
];

/** The practice country at this address (?country=), or null. */
export function practiceCountry(slug: string | null): PracticeCountry | null {
  if (!slug) return null;
  return PRACTICE.find((c) => c.slug === slug.toLowerCase()) ?? null;
}

/** A one-round puzzle of the practice country, from its day's puzzle file. Always
 *  half the population, whatever that day asked. */
export function practicePuzzle(day: Puzzle, country: PracticeCountry): Puzzle | null {
  const round = day.rounds.find((r) => r.id === country.id);
  return round ? { puzzle: day.puzzle, rounds: [{ ...round, mode: "population", target: 0.5 }] } : null;
}

/** The other practice countries, to offer after one. */
export function otherPractice(slug: string | null): PracticeCountry[] {
  return PRACTICE.filter((c) => c.slug !== slug);
}
