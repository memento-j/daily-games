// The country pages' data, read at build time from the same puzzle files the game plays
// (public/data/slice/NNNN.json) and measured with games/slice/countryFacts.ts. Only ever
// runs during the build (it reads files from disk), never in the browser.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { padPuzzleNumber } from "@/lib/daily";
import { denseShare, lopsidedHalf, peopleOnLandHalf, type HalfCut } from "@/games/slice/countryFacts";
import { PRACTICE, practicePuzzle, type PracticeCountry } from "@/games/slice/practice";
import type { Puzzle, Round } from "@/games/slice/types";
import { capitalise, possessive } from "@/games/slice/words";
import { CONTENT, type CountryContent } from "./content";

export type CountryPage = {
  country: PracticeCountry;
  content: CountryContent;
  round: Round;
  /** As a sentence says it: "Japan", "the United States". */
  name: string;
  question: string; // "Where does half of Japan's population live?"
  answer: string; // "Half of Japan's population lives on just 2.2% of its land."
  dense: string; // "2.2%"
  cut: HalfCut; // the most lopsided straight half-cut
  landHalfPeople: number; // people on the crowded side when the land is halved instead
  path: string; // "/countries/japan/"
  image: string; // the link-preview card (scripts/countries/images.py)
  gameShot: string; // a screenshot of the country in the game (same script)
};

function load(country: PracticeCountry, content: CountryContent): CountryPage {
  const file = join(process.cwd(), "public", "data", "slice", `${padPuzzleNumber(country.puzzle)}.json`);
  const round = practicePuzzle(JSON.parse(readFileSync(file, "utf8")) as Puzzle, country)?.rounds[0];
  if (!round) throw new Error(`No ${country.id} in puzzle #${country.puzzle}`);
  const cut = lopsidedHalf(round);
  return {
    country,
    content,
    round,
    name: round.country,
    question: `Where does half of ${possessive(round.country)} population live?`,
    answer: capitalise(round.fact),
    dense: denseShare(round) ?? "",
    cut,
    landHalfPeople: peopleOnLandHalf(round, cut),
    path: `/countries/${country.slug}/`,
    image: `/countries/${country.slug}-card.png`,
    gameShot: `/countries/${country.slug}-game.webp`,
  };
}

let cache: CountryPage[] | null = null;

/** Every published country page: the practice countries that have copy written. */
export function countryPages(): CountryPage[] {
  cache ??= PRACTICE.filter((c) => CONTENT[c.slug]).map((c) => load(c, CONTENT[c.slug]));
  return cache;
}

export function countryPage(slug: string): CountryPage | null {
  return countryPages().find((p) => p.country.slug === slug) ?? null;
}

/** "21.1%": a share as the pages print it. */
export const pct = (share: number) => `${(share * 100).toFixed(1)}%`;
