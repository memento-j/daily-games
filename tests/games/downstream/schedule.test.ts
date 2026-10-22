import { describe, expect, it } from "vitest";
import { puzzleToPlay } from "../../../games/downstream/schedule";

describe("puzzleToPlay", () => {
  it("plays today's puzzle, with or without ?puzzle=", () => {
    expect(puzzleToPlay(null, 12)).toEqual({ number: 12, preview: false });
    expect(puzzleToPlay("12", 12)).toEqual({ number: 12, preview: false });
  });

  it("plays yesterday's as a preview, so it never touches the real streak", () => {
    expect(puzzleToPlay("11", 12)).toEqual({ number: 11, preview: true });
  });

  it("opens nothing older than yesterday, nothing in the future, and no nonsense", () => {
    expect(puzzleToPlay("10", 12).number).toBeNaN();
    expect(puzzleToPlay("1", 12).number).toBeNaN();
    expect(puzzleToPlay("13", 12).number).toBeNaN();
    expect(puzzleToPlay("nonsense", 12).number).toBeNaN();
    expect(puzzleToPlay("0", 1).number).toBeNaN(); // launch day has no yesterday
  });
});
