import { describe, expect, it } from "vitest";
import { HERO_RIVER_COUNT, roundRiver } from "../../../app/downstream/heroRivers";
import { findRivers, height, seededRandom, trace, WORLD } from "../../../app/downstream/heroWorld";

describe("atlas world", () => {
  it("has open sea far away (top of the hero) and land near the viewer", () => {
    expect(height(0, WORLD.minZ + 0.2)).toBeLessThan(0);
    expect(height(0, WORLD.maxZ - 0.2)).toBeGreaterThan(0);
  });

  it("traces water downhill until it reaches the sea", () => {
    const rivers = findRivers(10);
    expect(rivers.length).toBeGreaterThanOrEqual(6);
    for (const path of rivers) {
      const [sx, sz] = path[0];
      const [ex, ez] = path[path.length - 1];
      expect(height(ex, ez)).toBeLessThan(0.02);
      expect(height(sx, sz)).toBeGreaterThan(height(ex, ez));
    }
  });

  it("ends a trace straight away when it starts in the sea", () => {
    const t = trace(0, WORLD.minZ + 0.2);
    expect(t.reachedSea).toBe(true);
    expect(t.path).toHaveLength(1);
  });

  it("is the same world on every visit", () => {
    expect(findRivers(5)).toEqual(findRivers(5));
    const a = seededRandom(1);
    const b = seededRandom(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("baked hero rivers", () => {
  it("match the world (re-run `npm run bake:hero` after changing heroWorld.ts)", async () => {
    const baked = (await import("../../../app/downstream/heroRivers.json")).default;
    expect(baked).toEqual(findRivers(HERO_RIVER_COUNT).map(roundRiver));
  });
});
