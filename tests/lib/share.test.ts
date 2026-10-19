import { describe, expect, it } from "vitest";
import { shareText } from "../../lib/share";

const base = { game: "Downstream", number: 12, marks: ["🟩", "🟨", "🟥", "🟩", "🟧"], points: 14, maxPoints: 20, url: "https://example.com/downstream/" };

describe("shareText", () => {
  it("is the puzzle number, one mark per drop, the score and the link", () => {
    expect(shareText(base)).toBe("Downstream #12 🟩🟨🟥🟩🟧 14/20\nhttps://example.com/downstream/");
  });

  it("can leave the score out", () => {
    expect(shareText({ game: "Downstream", number: 4, marks: ["🟩", "🟥"], url: "https://example.com/downstream/" })).toBe(
      "Downstream #4 🟩🟥\nhttps://example.com/downstream/",
    );
  });

  it("can be a score with a detail line and no marks (Slice)", () => {
    expect(
      shareText({ game: "Slice", number: 4, points: 312, maxPoints: 400, detail: "94 · 81 · 62 · 75", url: "https://example.com/slice/" }),
    ).toBe("Slice #4 312/400\n94 · 81 · 62 · 75\nhttps://example.com/slice/");
  });
});
