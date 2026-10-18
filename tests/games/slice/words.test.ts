import { describe, expect, it } from "vitest";
import { capitalise, fractionWords, instruction, possessive, resultLine } from "../../../games/slice/words";
import type { Round } from "../../../games/slice/types";

const round = (country: string, mode: Round["mode"], target: number): Round => ({
  country,
  mode,
  target,
  outline: [],
  population: 1,
  fact: "",
});

describe("possessive", () => {
  it("adds 's, or just ' after an s", () => {
    expect(possessive("Egypt")).toBe("Egypt's");
    expect(possessive("the Philippines")).toBe("the Philippines'");
  });
});

describe("fractionWords", () => {
  it("names simple fractions and falls back to a percentage", () => {
    expect(fractionWords(0.5)).toBe("half");
    expect(fractionWords(1 / 3)).toBe("a third");
    expect(fractionWords(0.333333)).toBe("a third"); // as rounded in the puzzle file
    expect(fractionWords(0.1)).toBe("10%");
    expect(fractionWords(0.9)).toBe("90%");
  });
});

describe("instruction", () => {
  it("says what to cut off, of land or of people", () => {
    expect(instruction(round("Egypt", "population", 1 / 3))).toBe("Cut off a third of Egypt's people.");
    expect(instruction(round("the United Kingdom", "area", 0.5))).toBe("Cut off half of the United Kingdom's land.");
  });
});

describe("resultLine", () => {
  it("gives the share cut off and the target", () => {
    expect(resultLine(0.314, 1 / 3)).toBe("You cut off 31.4%. Target 33.3%.");
  });
});

describe("capitalise", () => {
  it("upper-cases the first letter only", () => {
    expect(capitalise("the United States")).toBe("The United States");
  });
});
