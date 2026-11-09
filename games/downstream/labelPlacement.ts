// Keeping the map's sea names off the raindrop's markers, in screen space.
//
// The start pin and the river mouth are never covered: a name that would touch
// either (with LABEL_GAP to spare) moves away from it, trying spots nearest first
// and, in each ring, the directions pointing away from the marker first. Names are
// placed in priority order and keep clear of the ones placed before them. A name
// that must stay (a sea button, the answer, the player's pick) takes the spot with
// the most room if nothing is fully clear; any other name is hidden. A moved name
// keeps last frame's offset while it's still clear, so it doesn't hop as the camera
// moves, and goes home as soon as its own spot is clear again.
// Pure (no DOM), unit tested; used by SeaButtons and by RouteMap's sea names.

export type Box = { x0: number; y0: number; x1: number; y1: number };

/** A name to place: its wanted centre and size in px, and whether it may be hidden. */
export type LabelItem = { id: string; x: number; y: number; w: number; h: number; keep: boolean };

/** Where a name goes: an offset from its wanted centre, or hidden. */
export type Placement = { id: string; dx: number; dy: number; hidden: boolean };

export const LABEL_GAP = 8; // px kept clear between a name and a marker
/** The pin's body on screen: a raindrop whose round body (radius 12, its centre on the
 * spot) has a tip reaching PIN_TIP above the spot (`.route-pin` in globals.css). */
export const PIN_RADIUS = 12;
export const PIN_TIP = 22;
/** The river mouth's ring on screen (RouteMap's "mouth" layer: radius 5 plus its stroke). */
export const MOUTH_RADIUS = 7;
const BETWEEN = 6; // px kept between two names
const STEP = 8; // px between rings of candidate spots
const ANGLES = 16; // candidate spots per ring

/** The box around a round marker of radius `r` at (x, y). */
export function markerBox(x: number, y: number, r: number): Box {
  return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
}

/** The box around the pin at (x, y): its round body and its tip. */
export function pinBox(x: number, y: number): Box {
  return { x0: x - PIN_RADIUS, y0: y - PIN_TIP, x1: x + PIN_RADIUS, y1: y + PIN_RADIUS };
}

/** How far apart two boxes are: negative when they overlap. */
export function boxGap(a: Box, b: Box): number {
  return Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
}

export function placeLabels(
  items: LabelItem[],
  markers: Box[],
  area: Box,
  options: { reach?: number; previous?: Map<string, [number, number]> } = {},
): Placement[] {
  const reach = options.reach ?? 140;
  const placed: Box[] = [];
  const out: Placement[] = [];
  for (const item of items) {
    const boxAt = (dx: number, dy: number): Box => {
      const x = item.x + dx;
      const y = item.y + dy;
      return { x0: x - item.w / 2, y0: y - item.h / 2, x1: x + item.w / 2, y1: y + item.h / 2 };
    };
    // Start inside the area (a name near the screen's edge is pulled in, as before).
    const sx = Math.min(Math.max(item.x, area.x0 + item.w / 2), area.x1 - item.w / 2) - item.x;
    const sy = Math.min(Math.max(item.y, area.y0 + item.h / 2), area.y1 - item.h / 2) - item.y;
    const inArea = (b: Box) => b.x0 >= area.x0 - 0.5 && b.x1 <= area.x1 + 0.5 && b.y0 >= area.y0 - 0.5 && b.y1 <= area.y1 + 0.5;
    const markerRoom = (b: Box) => Math.min(Infinity, ...markers.map((m) => boxGap(b, m)));
    const clear = ([dx, dy]: [number, number]) => {
      const b = boxAt(dx, dy);
      return inArea(b) && markerRoom(b) >= LABEL_GAP && placed.every((p) => boxGap(b, p) >= BETWEEN);
    };

    // Away from the nearest marker; straight up if it sits right on one.
    const centre = boxAt(sx, sy);
    const cx = (centre.x0 + centre.x1) / 2;
    const cy = (centre.y0 + centre.y1) / 2;
    let away = -Math.PI / 2;
    let nearest = Infinity;
    for (const m of markers) {
      const mx = (m.x0 + m.x1) / 2;
      const my = (m.y0 + m.y1) / 2;
      const d = Math.hypot(cx - mx, cy - my);
      if (d < nearest) {
        nearest = d;
        if (d > 0.5) away = Math.atan2(cy - my, cx - mx);
      }
    }
    const candidates: [number, number][] = [[sx, sy]];
    for (let r = STEP; r <= reach; r += STEP) {
      const ring: [number, number, number][] = [];
      for (let k = 0; k < ANGLES; k++) {
        const a = (k / ANGLES) * Math.PI * 2;
        const off = Math.abs(Math.atan2(Math.sin(a - away), Math.cos(a - away)));
        ring.push([sx + Math.cos(a) * r, sy + Math.sin(a) * r, off]);
      }
      ring.sort((p, q) => p[2] - q[2]);
      for (const [dx, dy] of ring) candidates.push([dx, dy]);
    }

    const last = options.previous?.get(item.id);
    // Its own spot when that's clear; otherwise last frame's, if still clear; otherwise search.
    let spot = clear([sx, sy]) ? ([sx, sy] as [number, number]) : last && clear(last) ? last : candidates.find(clear);
    if (!spot && item.keep) {
      // Nothing fully clear: the spot with the most room from the markers, then from
      // the other names, nearest first. Never hidden: it's a choice or the answer.
      let best = -Infinity;
      for (const c of candidates) {
        const b = boxAt(c[0], c[1]);
        if (!inArea(b)) continue;
        const room = Math.min(markerRoom(b), LABEL_GAP) * 4 + Math.min(BETWEEN, ...placed.map((p) => boxGap(b, p)));
        if (room > best + 0.01) {
          best = room;
          spot = c;
        }
      }
      spot ??= [sx, sy];
    }
    if (!spot) {
      out.push({ id: item.id, dx: 0, dy: 0, hidden: true });
      continue;
    }
    placed.push(boxAt(spot[0], spot[1]));
    options.previous?.set(item.id, spot);
    out.push({ id: item.id, dx: spot[0], dy: spot[1], hidden: false });
  }
  return out;
}
