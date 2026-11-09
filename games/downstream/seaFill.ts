// "The sea fills": when the water reaches the sea, a soft wash of water-blue spreads
// across the answer's sea from the river mouth, so the answer reads as a place, not
// just a word. The sea's outline comes from the puzzle file (`seaShape`, clipped to
// the drop's framing by the pipeline). The wash is a few nested discs, each cut to the
// sea and drawn faintly on top of each other, so it's strongest at the mouth and fades
// out before it reaches the edge of the clipped outline (whose straight cuts in open
// water would otherwise show). Pure (no map), unit tested.

import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";
import type { LngLat } from "./types";

/** GeoJSON MultiPolygon coordinates, as `seaShape` holds them. */
export type SeaShape = number[][][][];

/** How many nested discs make the wash (more = smoother fade, more work per frame). */
export const FILL_BANDS = 9; // 5 read as a bullseye

/**
 * How far the wash reaches, in degrees of latitude: the pipeline grows the clip box by
 * half the framing's size (at least 2 degrees) beyond every point, so a disc this big
 * around the mouth never reaches the box's straight edges. Discs are drawn round on the
 * ground, so their east-west reach in degrees is wider away from the equator.
 */
export function fillReach(points: LngLat[], mouth: LngLat): number {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const grow = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 4) * 0.5;
  return grow * Math.min(1, Math.cos((mouth[1] * Math.PI) / 180)) * 0.95;
}

/** A disc of `radius` degrees of latitude around `center`, round on the ground. */
export function disc(center: LngLat, radius: number, steps = 48): Polygon {
  const k = 1 / Math.max(0.2, Math.cos((center[1] * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([center[0] + Math.cos(a) * radius * k, center[1] + Math.sin(a) * radius]);
  }
  return [ring];
}

/**
 * The wash at `reach` degrees (grows from 0 as it spreads): one feature per band, the
 * sea cut to a disc of a growing share of the reach. Drawn at low opacity each, their
 * overlap makes the fade.
 */
export function fillBands(shape: SeaShape, mouth: LngLat, reach: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  if (reach <= 0) return { type: "FeatureCollection", features };
  for (let i = 1; i <= FILL_BANDS; i++) {
    const cut = polygonClipping.intersection(shape as MultiPolygon, disc(mouth, (reach * i) / FILL_BANDS));
    if (cut.length) features.push({ type: "Feature", geometry: { type: "MultiPolygon", coordinates: cut }, properties: { band: i } });
  }
  return { type: "FeatureCollection", features };
}
