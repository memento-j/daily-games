// Words for what the map shows, for screen-reader players (announced in a live
// region): where the rain fell relative to each sea, and where the water has got
// to at each stop. Pure, unit tested in tests/games/downstream/describe.test.ts.

import type { Drop, LngLat } from "./types";

const R = 6371; // Earth radius, km
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function kmBetween(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const DIRECTIONS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

/** Compass direction from a to b, in one of eight words. */
export function direction(a: LngLat, b: LngLat): string {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return DIRECTIONS[Math.round(((bearing + 360) % 360) / 45) % 8];
}

/** Round a distance the way people say it: 80, 350, 1,200 km. */
export function roughKm(km: number): string {
  const step = km < 100 ? 10 : km < 1000 ? 50 : 100;
  return `${Math.max(step, Math.round(km / step) * step).toLocaleString("en-US")} km`;
}

/** The point `km` along a route (or its end). */
export function pointAlong(route: LngLat[], km: number): LngLat {
  let left = km;
  for (let i = 1; i < route.length; i++) {
    const seg = kmBetween(route[i - 1], route[i]);
    if (seg >= left) {
      const t = seg === 0 ? 0 : left / seg;
      return [route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t];
    }
    left -= seg;
  }
  return route[route.length - 1];
}

/** A new drop: where each option sea lies from the pin. */
export function describeStart(drop: Pick<Drop, "pin" | "options" | "seaLabels">): string {
  const seas = drop.options.map((name) => {
    const at = drop.seaLabels?.[name];
    return at ? `${name}, about ${roughKm(kmBetween(drop.pin, at))} ${direction(drop.pin, at)}` : name;
  });
  return `Rain falls on land. The four seas: ${seas.join("; ")}.`;
}

/** A stop: how far the water has come and which way it has gone. */
export function describeStop(drop: Pick<Drop, "pin" | "route">, km: number): string {
  const at = pointAlong(drop.route, km);
  return `The water has flowed ${roughKm(km)} and is now ${roughKm(kmBetween(drop.pin, at))} ${direction(drop.pin, at)} of where the rain fell.`;
}
