// How Slice says things: the round's instruction and its result. Pure, unit tested.

import { formatShare } from "./scoring";
import type { Round } from "./types";

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

/** "Cut off a third of Egypt's people." */
export function instruction(round: Round): string {
  const what = round.mode === "area" ? "land" : "people";
  return `Cut off ${fractionWords(round.target)} of ${possessive(round.country)} ${what}.`;
}

/** "You cut off 31.4%. Target 33.3%." */
export function resultLine(share: number, target: number): string {
  return `You cut off ${formatShare(share)}. Target ${formatShare(target)}.`;
}

/** "the United States" -> "The United States", for the start of a sentence. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
