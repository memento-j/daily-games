import { describe, expect, it } from "vitest";
import { shareText } from "../../lib/share";

const base = { game: "Downstream", number: 12, marks: ["🟩", "🟨", "🟥", "🟩", "🟧"], points: 14, maxPoints: 20, url: "https://example.com/downstream/" };

describe("shareText", () => {
  it("is the puzzle number, one mark per drop, the score and the link", () => {
    expect(shareText(base)).toBe("Downstream #12 🟩🟨🟥🟩🟧 14/20\nhttps://example.com/downstream/");
  });

  it("labels previews", () => {
    expect(shareText({ ...base, preview: true }).startsWith("Downstream preview #12 ")).toBe(true);
  });
});
