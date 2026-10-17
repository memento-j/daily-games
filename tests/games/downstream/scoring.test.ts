import { describe, expect, it } from "vitest";
import { dropEmoji, dropPoints, maxPoints, totalPoints, type DropResult } from "../../../games/downstream/scoring";

const right = (stage: number): DropResult => ({ guess: "Black Sea", stage, correct: true });
const wrong = (stage: number): DropResult => ({ guess: "Red Sea", stage, correct: false });
const noGuess: DropResult = { guess: null, stage: 3, correct: false };

describe("dropPoints", () => {
  it("scores earlier correct guesses higher: 4/3/2/1", () => {
    expect([0, 1, 2, 3].map((s) => dropPoints(right(s)))).toEqual([4, 3, 2, 1]);
  });

  it("gives 0 for a wrong guess or no guess", () => {
    expect(dropPoints(wrong(0))).toBe(0);
    expect(dropPoints(noGuess)).toBe(0);
  });

  it("gives 0 for a stage beyond the table", () => {
    expect(dropPoints(right(9))).toBe(0);
  });
});

describe("dropEmoji", () => {
  it("maps each outcome to its emoji", () => {
    expect([0, 1, 2, 3].map((s) => dropEmoji(right(s)))).toEqual(["🟩", "🟦", "🟨", "🟧"]);
    expect(dropEmoji(wrong(1))).toBe("🟥");
    expect(dropEmoji(noGuess)).toBe("⬜");
  });
});

describe("totals", () => {
  it("adds up a day", () => {
    expect(totalPoints([right(0), right(2), wrong(1), noGuess, right(3)])).toBe(4 + 2 + 0 + 0 + 1);
    expect(totalPoints([])).toBe(0);
    expect(maxPoints(5)).toBe(20);
  });
});
