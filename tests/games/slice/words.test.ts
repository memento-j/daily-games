import { describe, expect, it } from "vitest";
import { lineAt } from "../../../games/slice/geometry";
import { capitalise, fractionWords, instruction, perfectDirection, perfectLineText, possessive } from "../../../games/slice/words";
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

describe("capitalise", () => {
  it("upper-cases the first letter only", () => {
    expect(capitalise("the United States")).toBe("The United States");
  });
});

describe("perfectDirection", () => {
  // Board y points down: a normal of (0, 1) points south.
  it("names the compass direction from the player's line to the perfect one", () => {
    expect(perfectDirection(lineAt(Math.PI / 2, 300), lineAt(Math.PI / 2, 200))).toBe("north");
    expect(perfectDirection(lineAt(Math.PI / 2, 300), lineAt(Math.PI / 2, 400))).toBe("south");
    expect(perfectDirection(lineAt(0, 300), lineAt(0, 500))).toBe("east");
    expect(perfectDirection(lineAt(Math.PI / 4, 300), lineAt(Math.PI / 4, 350))).toBe("south-east");
  });

  it("is null when the cut is on the perfect line", () => {
    expect(perfectDirection(lineAt(0, 300), lineAt(0, 300.2))).toBeNull();
  });
});

describe("perfectLineText", () => {
  it("says where the perfect cut sits", () => {
    expect(perfectLineText(lineAt(Math.PI / 2, 300), lineAt(Math.PI / 2, 200))).toBe("The perfect cut at your angle sits further north.");
    expect(perfectLineText(lineAt(0, 300), lineAt(0, 300))).toBe("Your cut sits right on the perfect line.");
  });
});
