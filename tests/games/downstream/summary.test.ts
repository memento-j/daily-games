import { describe, expect, it } from "vitest";
import { mostSurprisingDrop } from "../../../games/downstream/summary";

const d = (difficulty: number, distanceKm: number, nearestSea = "A", answer = "A") => ({ difficulty, distanceKm, nearestSea, answer });

describe("mostSurprisingDrop", () => {
  it("picks the hardest drop", () => {
    expect(mostSurprisingDrop([d(1, 900), d(5, 100), d(3, 5000)])).toBe(1);
  });
  it("breaks ties by skipping the nearest sea, then by distance", () => {
    expect(mostSurprisingDrop([d(4, 900), d(4, 100, "A", "B")])).toBe(1);
    expect(mostSurprisingDrop([d(4, 900, "A", "B"), d(4, 3000, "A", "B")])).toBe(1);
  });
  it("keeps the first of exact equals", () => {
    expect(mostSurprisingDrop([d(2, 500), d(2, 500)])).toBe(0);
  });
});
