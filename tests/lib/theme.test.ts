import { describe, expect, it } from "vitest";
import { resolveTheme, toggledChoice } from "../../lib/theme";

describe("resolveTheme", () => {
  it("follows the device for 'system'", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("keeps an explicit choice whatever the device says", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});

describe("toggledChoice", () => {
  it("flips to the other theme", () => {
    expect(toggledChoice("light", false)).toBe("dark");
    expect(toggledChoice("dark", true)).toBe("light");
  });

  it("goes back to following the device when it lands on the device's theme", () => {
    expect(toggledChoice("dark", false)).toBe("system");
    expect(toggledChoice("light", true)).toBe("system");
  });
});
