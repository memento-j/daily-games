// How Slice says things: the round's question, its goal, where the perfect cut lies.
// Pure, unit tested. A people round says "population" (friendlier than "people").

import { formatShare } from "./scoring";
import type { Line, Round } from "./types";

/** "Egypt's", "the Philippines'". */
export function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

const FRACTIONS: [number, string][] = [
  [1 / 2, "half"],
  [1 / 3, "a third"],
  [2 / 3, "two thirds"],
  [1 / 4, "a quarter"],
  [3 / 4, "three quarters"],
];

/** "half", "a third", or a percentage for anything else ("10%"). */
export function fractionWords(target: number): string {
  const hit = FRACTIONS.find(([f]) => Math.abs(f - target) < 1e-6);
  return hit ? hit[1] : formatShare(target);
}

/** What a round measures: "land" or "population". */
export function measure(round: Round): string {
  return round.mode === "area" ? "land" : "population";
}

/** "Cut off a third of Egypt's population." */
export function instruction(round: Round): string {
  return `Cut off ${fractionWords(round.target)} of ${possessive(round.country)} ${measure(round)}.`;
}

/** The goal on its own, for the day's summary: "Half the land", "A third of the population". */
export function goal(round: Round): string {
  const amount = fractionWords(round.target);
  return amount === "half" ? `Half the ${measure(round)}` : `${capitalise(amount)} of the ${measure(round)}`;
}

/** "the United States" -> "The United States", for the start of a sentence. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const COMPASS = ["east", "north-east", "north", "north-west", "west", "south-west", "south", "south-east"];

/** Which way the perfect cut lies from the player's (same angle), as a compass word.
 *  Board y points down, so north is -y. Null when the two lines (nearly) coincide. */
export function perfectDirection(line: Line, perfect: Line): string | null {
  const gap = perfect.offset - line.offset;
  if (Math.abs(gap) < 0.5) return null; // half a board unit: on the line
  const dx = line.normal[0] * gap;
  const dy = -line.normal[1] * gap;
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return COMPASS[(sector + 8) % 8];
}

/** "At this angle, the perfect cut sits further north." */
export function perfectLineText(line: Line, perfect: Line): string {
  const dir = perfectDirection(line, perfect);
  return dir ? `At this angle, the perfect cut sits further ${dir}.` : "You found the perfect line.";
}
