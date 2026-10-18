// Plain-geometry helpers for Slice: lines, half-plane clipping, areas. Pure and
// framework-free, so a server could re-score a submitted line with the same code.

import type { Line, Point, Ring } from "./types";

export function dot(p: Point, n: Point): number {
  return p[0] * n[0] + p[1] * n[1];
}

/** The endless line through two points, or null if they're (nearly) the same point. */
export function lineThrough(a: Point, b: Point): Line | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  const normal: Point = [-dy / len, dx / len];
  return { normal, offset: dot(a, normal) };
}

/** The line whose normal points at `angle` (radians), at the given offset. */
export function lineAt(angle: number, offset: number): Line {
  return { normal: [Math.cos(angle), Math.sin(angle)], offset };
}

/** Shoelace formula. Its sign tells the winding: outer rings and holes have opposite signs. */
export function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/** Total area of an outline. Holes wind the other way, so they subtract. */
export function area(rings: Ring[]): number {
  return Math.abs(rings.reduce((sum, r) => sum + signedArea(r), 0));
}

/** The area-weighted centre of an outline (where to letter a piece), or null if it has
 *  no area. Holes count negatively, like in `area`. */
export function centroid(rings: Ring[]): Point | null {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const cross = x1 * y2 - x2 * y1;
      a += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
  }
  if (Math.abs(a) < 1e-9) return null;
  return [cx / (3 * a), cy / (3 * a)];
}

/** Sutherland–Hodgman against one half-plane: the part of `ring` on the line's
 *  positive side. A concave ring can come back as one ring joined by zero-width
 *  slivers along the line, which add no area, so areas stay right. */
export function clipRing(ring: Ring, line: Line): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const dp = dot(p, line.normal) - line.offset;
    const dq = dot(q, line.normal) - line.offset;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

export function clipRings(rings: Ring[], line: Line): Ring[] {
  return rings.map((r) => clipRing(r, line)).filter((r) => r.length >= 3);
}

/** The line flipped to face the other way (same place, opposite positive side). */
export function flip(line: Line): Line {
  return { normal: [-line.normal[0], -line.normal[1]], offset: -line.offset };
}

/** The lowest and highest offset of any outline point along `normal`: every line at
 *  this angle that touches the outline has an offset between the two. */
export function offsetRange(rings: Ring[], normal: Point): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      const d = dot(p, normal);
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
  }
  return [lo, hi];
}

/** Where the endless line enters and leaves a box (for drawing it), or null if it misses. */
export function segmentInBox(line: Line, min: Point, max: Point): [Point, Point] | null {
  const [nx, ny] = line.normal;
  const dir: Point = [-ny, nx];
  const base: Point = [nx * line.offset, ny * line.offset];
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const axis of [0, 1] as const) {
    if (Math.abs(dir[axis]) < 1e-12) {
      if (base[axis] < min[axis] || base[axis] > max[axis]) return null;
      continue;
    }
    let a = (min[axis] - base[axis]) / dir[axis];
    let b = (max[axis] - base[axis]) / dir[axis];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  if (t0 > t1) return null;
  return [
    [base[0] + dir[0] * t0, base[1] + dir[1] * t0],
    [base[0] + dir[0] * t1, base[1] + dir[1] * t1],
  ];
}
