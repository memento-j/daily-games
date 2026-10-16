import { describe, expect, it } from "vitest";
import { PRE_LAUNCH_PREVIEW, puzzleToPlay } from "../../../games/downstream/schedule";

describe("puzzleToPlay", () => {
  it("plays today's puzzle once launched", () => {
    expect(puzzleToPlay(null, 12)).toEqual({ number: 12, preview: false });
  });

  it("goes straight into a preview before launch, not a coming-soon screen", () => {
    expect(puzzleToPlay(null, 0)).toEqual({ number: PRE_LAUNCH_PREVIEW, preview: true });
    expect(puzzleToPlay(null, -30)).toEqual({ number: PRE_LAUNCH_PREVIEW, preview: true });
  });

  it("plays ?puzzle=N as a preview, whatever the date", () => {
    expect(puzzleToPlay("3", 12)).toEqual({ number: 3, preview: true });
    expect(puzzleToPlay("3", -5)).toEqual({ number: 3, preview: true });
  });
});
