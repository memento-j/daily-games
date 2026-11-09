import { describe, expect, it } from "vitest";
import { boxGap, LABEL_GAP, markerBox, placeLabels, type Box, type LabelItem } from "../../../games/downstream/labelPlacement";

const AREA: Box = { x0: 0, y0: 0, x1: 400, y1: 400 };
const PIN = markerBox(200, 200, 12);
const boxOf = (item: LabelItem, dx: number, dy: number): Box => ({
  x0: item.x + dx - item.w / 2,
  y0: item.y + dy - item.h / 2,
  x1: item.x + dx + item.w / 2,
  y1: item.y + dy + item.h / 2,
});

describe("placeLabels", () => {
  it("leaves a name that's already clear where it is", () => {
    const item = { id: "a", x: 100, y: 80, w: 80, h: 20, keep: false };
    expect(placeLabels([item], [PIN], AREA)).toEqual([{ id: "a", dx: 0, dy: 0, hidden: false }]);
  });

  it("moves a name off the pin, keeping the gap", () => {
    const item = { id: "a", x: 205, y: 205, w: 120, h: 22, keep: true };
    const [p] = placeLabels([item], [PIN], AREA);
    expect(p.hidden).toBe(false);
    expect(boxGap(boxOf(item, p.dx, p.dy), PIN)).toBeGreaterThanOrEqual(LABEL_GAP);
    // Not flung across the map: the nearest clear spot.
    expect(Math.hypot(p.dx, p.dy)).toBeLessThan(60);
  });

  it("moves away from the marker, not through it", () => {
    const item = { id: "a", x: 200, y: 180, w: 60, h: 20, keep: true }; // just above the pin
    const [p] = placeLabels([item], [PIN], AREA);
    expect(p.dy).toBeLessThan(0);
  });

  it("keeps clear of both markers, and of names placed before", () => {
    const mouth = markerBox(230, 200, 7);
    const answer = { id: "answer", x: 215, y: 200, w: 140, h: 24, keep: true };
    const other = { id: "other", x: 215, y: 200, w: 100, h: 20, keep: true };
    const [a, o] = placeLabels([answer, other], [PIN, mouth], AREA);
    const ab = boxOf(answer, a.dx, a.dy);
    const ob = boxOf(other, o.dx, o.dy);
    for (const m of [PIN, mouth]) {
      expect(boxGap(ab, m)).toBeGreaterThanOrEqual(LABEL_GAP);
      expect(boxGap(ob, m)).toBeGreaterThanOrEqual(LABEL_GAP);
    }
    expect(boxGap(ab, ob)).toBeGreaterThan(0);
  });

  it("hides a lower name with no room, but never one that must stay", () => {
    const tiny: Box = { x0: 150, y0: 180, x1: 250, y1: 220 }; // room for nothing beside the pin
    const keep = { id: "keep", x: 200, y: 200, w: 90, h: 30, keep: true };
    const drop = { id: "drop", x: 200, y: 200, w: 90, h: 30, keep: false };
    const [k, d] = placeLabels([keep, drop], [PIN], tiny);
    expect(k.hidden).toBe(false);
    expect(d.hidden).toBe(true);
  });

  it("stays inside the area", () => {
    const item = { id: "a", x: 395, y: 200, w: 120, h: 22, keep: true };
    const [p] = placeLabels([item], [], AREA);
    const b = boxOf(item, p.dx, p.dy);
    expect(b.x1).toBeLessThanOrEqual(AREA.x1);
    expect(b.x0).toBeGreaterThanOrEqual(AREA.x0);
  });

  it("keeps last frame's spot while it's still clear, so names don't hop", () => {
    const previous = new Map<string, [number, number]>();
    const item = { id: "a", x: 205, y: 205, w: 120, h: 22, keep: true };
    const [first] = placeLabels([item], [PIN], AREA, { previous });
    // The camera moves a little: the same offset still works and is kept.
    const [second] = placeLabels([{ ...item, x: 207, y: 204 }], [markerBox(202, 199, 12)], AREA, { previous });
    expect([second.dx, second.dy]).toEqual([first.dx, first.dy]);
  });

  it("goes home once its own spot is clear again", () => {
    const previous = new Map<string, [number, number]>([["a", [0, -40]]]);
    const item = { id: "a", x: 100, y: 100, w: 60, h: 20, keep: true };
    expect(placeLabels([item], [PIN], AREA, { previous })[0]).toMatchObject({ dx: 0, dy: 0 });
  });
});
