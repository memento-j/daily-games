import { describe, expect, it } from "vitest";
import { otherPractice, PRACTICE, practiceCountry, practicePuzzle } from "../../../games/slice/practice";
import type { Puzzle, Round } from "../../../games/slice/types";

const round = (id: string, target = 0.5): Round => ({
  id,
  country: id,
  mode: "population",
  target,
  outline: [[[0, 0], [10, 0], [10, 10]]],
  points: [[1, 1, 5]],
  population: 5,
  fact: "",
});

describe("practiceCountry", () => {
  it("finds a country by its address, in any case", () => {
    expect(practiceCountry("japan")?.name).toBe("Japan");
    expect(practiceCountry("United-States")?.id).toBe("United States of America");
  });

  it("is null for anything not open for practice", () => {
    expect(practiceCountry(null)).toBeNull();
    expect(practiceCountry("")).toBeNull();
    expect(practiceCountry("kenya")).toBeNull();
  });

  it("only offers countries from puzzles that are over", () => {
    // Launch day was #1 (21 Oct 2026); practice was opened on #3.
    for (const c of PRACTICE) expect(c.puzzle).toBeLessThan(3);
  });
});

describe("practicePuzzle", () => {
  const day: Puzzle = { puzzle: 1, rounds: [round("Germany"), round("Japan", 1 / 3)] };

  it("is one round of that country, always half the population", () => {
    const p = practicePuzzle(day, practiceCountry("japan")!);
    expect(p?.rounds).toHaveLength(1);
    expect(p?.rounds[0].id).toBe("Japan");
    expect(p?.rounds[0].target).toBe(0.5);
  });

  it("is null if that day doesn't have the country", () => {
    expect(practicePuzzle(day, practiceCountry("australia")!)).toBeNull();
  });
});

describe("otherPractice", () => {
  it("leaves out the one just played", () => {
    const others = otherPractice("japan");
    expect(others).toHaveLength(PRACTICE.length - 1);
    expect(others.some((c) => c.slug === "japan")).toBe(false);
  });
});
