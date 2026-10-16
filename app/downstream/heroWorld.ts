// The little procedural world behind the homepage hero: a heightfield whose
// negative heights are sea, and downhill tracing so raindrops follow it to the
// coast, the same idea as the game itself. Pure functions, no three.js.
//
// Coordinates are world units on the ground plane: x across, z towards the
// viewer (far = negative z). The continent rises towards the viewer, with the
// open sea beyond it.

export const WORLD = { minX: -2.2, maxX: 2.2, minZ: -2.6, maxZ: 1.3 };

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  // Quintic easing: the slope stays continuous across grid lines, so hillshade shows no squares.
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const ROT_COS = Math.cos(0.65);
const ROT_SIN = Math.sin(0.65);

function fbm(x: number, y: number): number {
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < 5; i++) {
    sum += amp * valueNoise(x, y);
    // Rotate each octave (~37 degrees) so the noise grids never line up into squares.
    const rx = (x * ROT_COS - y * ROT_SIN) * 2.03 + 17.1;
    y = (x * ROT_SIN + y * ROT_COS) * 2.03 + 3.7;
    x = rx;
    amp *= 0.5;
  }
  return sum; // roughly 0..1
}

/** Height at a point. Below 0 is sea. */
export function height(x: number, z: number): number {
  const continent = 0.62 * (z + 0.35) + 0.1 * x; // land rises towards the viewer
  const bays = (fbm(x * 0.55 + 11.3, z * 0.55 + 2.9) - 0.47) * 1.1; // broad gulfs and headlands
  const relief = fbm(x * 1.25 + 3.1, z * 1.25 + 7.7) - 0.47;
  return continent + bays + relief * 1.05;
}

export function gradient(x: number, z: number): [number, number] {
  const e = 0.004;
  return [
    (height(x + e, z) - height(x - e, z)) / (2 * e),
    (height(x, z + e) - height(x, z - e)) / (2 * e),
  ];
}

export type Trace = { path: [number, number][]; reachedSea: boolean };

/**
 * Follow the slope downhill from (x, z) until the water reaches the sea.
 * A little momentum carries it across tiny dips, the way water fills a hollow
 * and spills over; a real pit, or leaving the world, ends the trace.
 */
export function trace(x: number, z: number, step = 0.006, maxSteps = 1500): Trace {
  const path: [number, number][] = [[x, z]];
  let dx = 0;
  let dz = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (height(x, z) < 0) return { path, reachedSea: true };
    const [gx, gz] = gradient(x, z);
    const len = Math.hypot(gx, gz);
    if (len > 1e-6) {
      dx = 0.55 * dx - (0.45 * gx) / len;
      dz = 0.55 * dz - (0.45 * gz) / len;
    }
    const dlen = Math.hypot(dx, dz);
    if (dlen < 1e-3) break; // stuck in a pit
    x += (dx / dlen) * step;
    z += (dz / dlen) * step;
    if (x < WORLD.minX || x > WORLD.maxX || z < WORLD.minZ || z > WORLD.maxZ) break;
    path.push([x, z]);
  }
  return { path, reachedSea: false };
}

/** Small seeded random generator, so the world looks the same on every visit. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Length of a traced path in world units. */
export function pathLength(path: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  return total;
}

/** The world's rivers: the longest downhill traces from random high ground. */
export function findRivers(count: number, seed = 7): [number, number][][] {
  const rand = seededRandom(seed);
  const rivers: [number, number][][] = [];
  for (let i = 0; i < count * 30 && rivers.length < count * 4; i++) {
    const x = WORLD.minX + rand() * (WORLD.maxX - WORLD.minX);
    const z = WORLD.minZ + rand() * (WORLD.maxZ - WORLD.minZ);
    if (height(x, z) < 0.32) continue;
    const t = trace(x, z);
    if (t.reachedSea && t.path.length > 40) rivers.push(t.path);
  }
  return rivers.sort((a, b) => b.length - a.length).slice(0, count);
}
