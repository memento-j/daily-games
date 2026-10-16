// Settings shared by the hero's river bake (scripts/bake-hero-rivers.ts) and its test.

export const HERO_RIVER_COUNT = 30;

/** 3 decimals is ~1/1000 of the world: invisible on screen, and keeps the file small. */
export const roundRiver = (path: [number, number][]): [number, number][] =>
  path.map(([x, z]) => [Math.round(x * 1000) / 1000, Math.round(z * 1000) / 1000]);
