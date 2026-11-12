import { describe, expect, it } from "vitest";
import { flagEmoji } from "../../../lib/flags";
import { sliceShareText } from "../../../games/slice/shareText";

const day = {
  game: "Slice",
  number: 22,
  points: 135,
  maxPoints: 400,
  rounds: [
    { iso: "JP", score: 32, hinted: false },
    { iso: "DE", score: 27, hinted: false },
    { iso: "BR", score: 24, hinted: true },
    { iso: "AU", score: 52, hinted: true },
  ],
  url: "https://pondo.games/slice",
};

describe("flagEmoji", () => {
  it("turns a two-letter code into its flag", () => {
    expect(flagEmoji("JP")).toBe("🇯🇵");
    expect(flagEmoji("de")).toBe("🇩🇪");
  });

  it("gives nothing for anything that isn't a two-letter code", () => {
    expect(flagEmoji("-99")).toBe("");
    expect(flagEmoji("")).toBe("");
  });
});

describe("sliceShareText", () => {
  it("is the score, each round with its flag, what the game is and the address", () => {
    expect(sliceShareText({ ...day, flags: true })).toBe(
      "Slice #22 · 135/400\n🇯🇵 32 · 🇩🇪 27 · 🇧🇷 24💡 · 🇦🇺 52💡\nSplit a country's population in half with one line\nhttps://pondo.games/slice",
    );
  });

  it("uses the codes where the device can't draw flags", () => {
    expect(sliceShareText({ ...day, flags: false }).split("\n")[1]).toBe("JP 32 · DE 27 · BR 24💡 · AU 52💡");
  });

  it("adds the current streak to the first line when there is one", () => {
    expect(sliceShareText({ ...day, flags: true, streak: 5 }).split("\n")[0]).toBe("Slice #22 · 135/400 · 🔥 5-day streak");
    expect(sliceShareText({ ...day, flags: true, streak: 0 }).split("\n")[0]).toBe("Slice #22 · 135/400");
    expect(sliceShareText({ ...day, flags: true, streak: 1 }).split("\n")[0]).toBe("Slice #22 · 135/400");
  });

  it("leaves a round without a code as just its score", () => {
    const rounds = [{ score: 80, hinted: false }, { iso: "FR", score: 3, hinted: true }];
    expect(sliceShareText({ ...day, rounds, flags: true }).split("\n")[1]).toBe("80 · 🇫🇷 3💡");
  });
});
