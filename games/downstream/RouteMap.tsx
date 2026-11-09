"use client";

// The Downstream map: the real world in Downstream's own style (labelled seas and
// cities), the raindrop, and the water's route.
//
// The reveal is the show: the coral raindrop glows at the head of the water and
// leads the line downhill; white current flows along the river behind it; the
// camera leans in and travels with the drop, then settles back to the overview;
// each stop gets a ripple, and reaching the sea a splash of rings while the
// answer's name swells. Callbacks let the game screen sync sound to it. With
// prefers-reduced-motion the line and camera jump straight to each stage.
//
// MapLibre needs a real browser (window, WebGL), so it's loaded with a dynamic
// import() inside useEffect, which only runs in the browser after mount. A
// normal top-level import would also be evaluated while Next pre-renders the
// page at build time, where there is no window.

import "maplibre-gl/dist/maplibre-gl.css";
import { lineString } from "@turf/helpers";
import { length } from "@turf/length";
import { lineSliceAlong } from "@turf/line-slice-along";
import type { FilterSpecification, GeoJSONSource, Map as MapLibreMap, Marker, PaddingOptions } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import Loading from "@/components/Loading";
import { useTheme } from "@/lib/useTheme";
import { LABEL_GAP, markerBox, MOUTH_RADIUS, PIN_RADIUS, PIN_TIP, pinBox, placeLabels, type Box } from "./labelPlacement";
import Magnifier from "./Magnifier";
import { downstreamMapStyle, MAP_PALETTES, themePaint } from "./mapStyle";
import { fillBands, fillReach, type SeaShape } from "./seaFill";
import type { LngLat } from "./types";

// MapLibre processes tiles in a web worker, which it looks for next to its own
// file. The bundler can't see that, so `npm run dev`/`build` copy the worker
// into public/ (see "copy-map-worker" in package.json) and we point MapLibre at it.
const WORKER_URL = "/maplibre-gl-worker.mjs";
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

// The flowing-current effect: MapLibre animates a dashed line by stepping through
// these dash patterns (from MapLibre's "animate a line" example).
const CURRENT_DASHES = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

/** How long drawing a stretch takes: longer stretches flow for longer, within limits. */
export function drawDuration(fraction: number, final: boolean): number {
  const ms = 1500 + fraction * (final ? 2800 : 2200);
  return Math.min(final ? 4200 : 3200, Math.max(1600, ms));
}

/** Where a map position currently is on screen, in CSS pixels from the map's top-left. */
export type Project = (lngLat: LngLat) => { x: number; y: number };

export type RouteMapProps = {
  pin: LngLat;
  route: LngLat[];
  revealKm: number; // draw the route up to here; Infinity = the whole route
  /** The four option seas and where to letter them (from the puzzle file). */
  labels?: Record<string, LngLat>;
  /** Once the drop is decided: the sea it reached, lettered strongest; the others fade. */
  answer?: string;
  /** A wrong pick, lettered in solid coral so the player sees what they said. */
  yourPick?: string;
  /** Show the map's river network. Off while guessing: it would give the answer away. */
  showRivers?: boolean;
  /**
   * Whether the player may pan and zoom. Locked while guessing (zooming in to read
   * the rivers would give the answer away); the camera still moves on its own.
   */
  interactive?: boolean;
  /** Screen space covered by UI (a card or sheet), so framing keeps the route clear of it. */
  padding?: Partial<PaddingOptions>;
  /** A new drop's rain lands on its pin. */
  onLand?: () => void;
  /** The water starts flowing for `ms`; `final` = all the way to the sea. */
  onFlowStart?: (ms: number, final: boolean) => void;
  /** The water reached the next stop (or, if `final`, the sea). */
  onFlowEnd?: (final: boolean) => void;
  /** Hide the map's own lettering of the option seas (when the page draws them as buttons). */
  hideOptionLabels?: boolean;
  /** Called whenever the camera moves, so the page can keep things pinned to map positions. */
  onCamera?: (project: Project, water: Box[]) => void;
  /** The answer sea's outline near the drop (puzzle file): a wash of water spreads across it on arrival. */
  seaShape?: SeaShape | null;
  /** The route's length, shown on the magnifier. */
  distanceKm?: number;
  /** While guessing: towns hidden, cities faded, so the pin stands out. */
  quiet?: boolean;
  /** A new drop opens close in on the pin ("Rain lands here"), then pulls back: true while it's close. */
  onIntro?: (close: boolean) => void;
  className?: string;
};

/** The pin: a raindrop sitting on the spot, solid coral while it's the rain, hollow
 * once the water has moved on (where it fell), with two rings pulsing out of it and a
 * "Rain lands here" tag for the zoom-in. Styled by `.route-pin` in globals.css. */
function pinElement() {
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<div class="route-pin"><span class="route-pin-ring"></span><span class="route-pin-ring"></span>' +
    '<svg class="route-pin-drop" viewBox="0 0 28 36" aria-hidden="true"><path d="M14 2C18 7.6 24.5 13.5 24.5 22.5a10.5 10.5 0 0 1-21 0C3.5 13.5 10 7.6 14 2Z"/></svg>' +
    '<span class="route-pin-tag">Rain lands here</span></div>';
  return wrap;
}

/** The zoom-in: how long it holds close on the pin, and the pull back to the four seas. */
const INTRO_HOLD_MS = 700; // 1300 until 2026-11-09: too long a wait before the seas
const INTRO_PULL_MS = 1300;
/** The water on screen as small boxes for names to keep clear of: the raindrop at its
 * head, and points every ~10px along the line it has drawn. */
function waterBoxes(map: MapLibreMap, line: number[][], head: number[] | null): Box[] {
  const boxes: Box[] = [];
  let last: { x: number; y: number } | null = null;
  for (const c of line) {
    const p = map.project(c as LngLat);
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 10) continue;
    boxes.push(markerBox(p.x, p.y, 4)); // the line's 6px core, and a little
    last = p;
  }
  if (head) {
    const h = map.project(head as LngLat);
    boxes.push(markerBox(h.x, h.y, 12)); // the drop and its white edge
  }
  return boxes;
}

/** A river shorter than this on screen (px) gets a thicker line, and the magnifier on a big enough map. */
const SHORT_ROUTE_PX = 64;
const MAGNIFIER_MIN_MAP_PX = 420; // map height; the phone summary's small map goes without

/** The [southwest, northeast] box around some points. */
function boundsOf(points: number[][]): [[number, number], [number, number]] {
  const lons = points.map((c) => c[0]);
  const lats = points.map((c) => c[1]);
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
}

/** A sea name as the map letters it: about how much room it takes, in px (Noto Sans Bold
 * isn't on the page, so a near-enough bold sans measures it, with room to spare). MapLibre
 * wraps at `text-max-width` (8 ems) into balanced lines. */
let measurer: CanvasRenderingContext2D | null = null;
function nameBox(name: string, size: number): { w: number; h: number } {
  measurer ??= document.createElement("canvas").getContext("2d");
  const halo = 2.6;
  if (!measurer) return { w: name.length * size * 0.62 + 2 * halo, h: size * 1.2 + 2 * halo };
  measurer.font = `700 ${size}px "Noto Sans", Arial, sans-serif`;
  const width = (t: string) => measurer!.measureText(t).width * 1.05 + t.length * 0.04 * size;
  const total = width(name);
  const lines = Math.max(1, Math.ceil(total / (8 * size)));
  const rows: string[] = [];
  let row = "";
  for (const word of name.split(" ")) {
    const next = row ? `${row} ${word}` : word;
    if (row && rows.length < lines - 1 && width(next) > (total / lines) * 1.1) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  rows.push(row);
  // Near the wrapping width the estimate can't be sure MapLibre wraps (its glyphs are a
  // little narrower), so a name close to it keeps clear for both: one line and wrapped.
  const unsure = rows.length > 1 && total < 8 * size * 1.35;
  return {
    w: (unsure ? total : Math.max(...rows.map(width))) + 2 * halo,
    h: rows.length * size * 1.2 + 2 * halo,
  };
}

/** An option sea as the map letters it, before placing. */
type OptionSea = { name: string; coordinates: LngLat; answer: boolean; mine: boolean; faded: boolean };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export default function RouteMap({
  pin,
  route,
  revealKm,
  labels,
  answer,
  yourPick,
  showRivers = true,
  interactive = true,
  padding,
  onLand,
  onFlowStart,
  onFlowEnd,
  hideOptionLabels = false,
  onCamera,
  seaShape,
  distanceKm,
  quiet = false,
  onIntro,
  className = "",
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Which route is on screen, and how much of it is drawn.
  const drawn = useRef<{ route: LngLat[] | null; km: number }>({ route: null, km: 0 });
  const headOn = useRef(false); // whether the raindrop is on the map (for its glow)
  // The option seas' names, kept clear of the pin and the river mouth (labelPlacement.ts):
  // what to letter, where the water met the sea (once it has), the answer's swell, last
  // frame's offsets, and the pending placement frame.
  const options = useRef<OptionSea[]>([]);
  const mouth = useRef<LngLat | null>(null);
  const swell = useRef(0);
  const offsets = useRef(new Map<string, [number, number]>());
  const placedKey = useRef("");
  const placeFrame = useRef(0);
  const placeNames = useRef<() => void>(() => {});
  const nameBoxes = useRef<Box[]>([]); // where the names were placed, for the magnifier to avoid
  // Read by placement and the arrow, which run outside React's render.
  const latest = useRef({ route, interactive, pad: { top: 60, right: 60, bottom: 60, left: 60 } as PaddingOptions });
  // The magnifier: open or not (it's a second map, so it mounts only when needed), the
  // lens element and its last offset, and the leader line and ring tying it to the river.
  const [lensSize, setLensSize] = useState(0); // 0 = closed; otherwise its diameter (smaller on narrow maps)
  const lensOpenRef = useRef(false);
  const lensEl = useRef<HTMLDivElement | null>(null);
  const lensPrev = useRef(new Map<string, [number, number]>());
  const leaderRef = useRef<SVGLineElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const arrowRef = useRef<HTMLButtonElement>(null);
  const routeWidth = useRef(6);
  // The water drawn so far and the raindrop leading it: names and sea buttons keep clear of both.
  const water = useRef<{ line: number[][]; head: number[] | null }>({ line: [], head: null });
  const [ready, setReady] = useState(false);
  const [drawnOnce, setDrawnOnce] = useState(false); // the first tiles are on screen (hides the loading state)
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again" to rebuild the map
  // Light or dark (mapStyle.ts has both palettes). Read through a ref by the map setup
  // and the animations, and applied to a live map in place by the effect below.
  const theme = useTheme();
  const colors = useRef(MAP_PALETTES[theme]);
  const pad = { top: 60, right: 60, bottom: 60, left: 60, ...padding };
  const padKey = JSON.stringify(pad);
  // The animation reads the latest callbacks through a ref, kept in sync after each render.
  const callbacks = useRef({ onLand, onFlowStart, onFlowEnd, onCamera, onIntro });
  useEffect(() => {
    callbacks.current = { onLand, onFlowStart, onFlowEnd, onCamera, onIntro };
    latest.current = { route, interactive, pad: pad as PaddingOptions };
  });

  /**
   * Everything else that follows the camera: a short river's thicker line, the
   * magnifier (open, placed clear of the markers and names, its leader line), and the
   * arrow back to the pin when it's out of view. DOM and paint are only touched when
   * something changed.
   */
  function placeExtras(map: MapLibreMap, markers: Box[]) {
    const canvas = map.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const { route: line, interactive: free, pad: p } = latest.current;
    const pts = line.map((c) => map.project(c as LngLat));
    const xs = pts.map((q) => q.x);
    const ys = pts.map((q) => q.y);
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const reached = !!mouth.current;

    // A short river reads better with a thicker line.
    const width = reached && extent < SHORT_ROUTE_PX * 0.75 ? 9 : 6;
    if (width !== routeWidth.current && map.getLayer("route")) {
      routeWidth.current = width;
      map.setPaintProperty("route", "line-width", width);
      map.setPaintProperty("route-glow", "line-width", width === 9 ? 34 : 26);
    }

    // The magnifier: once the water has reached the sea, for a river too short to read
    // (opens under SHORT_ROUTE_PX, closes again only past 1.4x, so it doesn't flicker).
    // (Only while the river itself is in view: panned away, the lens would show something that isn't there.)
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const my = (Math.max(...ys) + Math.min(...ys)) / 2;
    const inView = mx > 0 && mx < w && my > Math.min(p.top ?? 60, 64) && my < h - Math.min(p.bottom ?? 60, 240);
    const want = reached && inView && h >= MAGNIFIER_MIN_MAP_PX && extent < SHORT_ROUTE_PX * (lensOpenRef.current ? 1.4 : 1);
    if (want !== lensOpenRef.current) {
      lensOpenRef.current = want;
      lensPrev.current.clear();
      setLensSize(want ? (w < 640 ? 112 : 148) : 0);
    }
    const lens = lensEl.current;
    if (want && lens) {
      const size = lens.offsetWidth;
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const ring = Math.max(extent / 2 + 10, 18);
      const area = { x0: 8, y0: Math.min(p.top ?? 60, 64), x1: w - 8, y1: h - (p.bottom ?? 60) };
      // The lens and its distance pill (half below its rim), placed like a name.
      const item = { id: "lens", x: cx, y: cy, w: size + 8, h: size + 36, keep: false };
      const [at] = placeLabels([item], [...markers, markerBox(cx, cy, ring), ...nameBoxes.current], area, { previous: lensPrev.current, reach: 360 });
      if (at.hidden) {
        lens.style.visibility = "hidden";
        leaderRef.current?.setAttribute("visibility", "hidden");
        ringRef.current?.setAttribute("visibility", "hidden");
      } else {
        const lx = cx + at.dx;
        const ly = cy + at.dy;
        lens.style.visibility = "visible";
        lens.style.transform = `translate(${lx - size / 2}px, ${ly - size / 2 - 4}px)`;
        // The leader: from the ring around the river to the lens's rim.
        const d = Math.hypot(lx - cx, ly - 4 - cy) || 1;
        const ux = (lx - cx) / d;
        const uy = (ly - 4 - cy) / d;
        const leader = leaderRef.current;
        if (leader) {
          leader.setAttribute("visibility", "visible");
          leader.setAttribute("x1", `${cx + ux * ring}`);
          leader.setAttribute("y1", `${cy + uy * ring}`);
          leader.setAttribute("x2", `${lx - ux * (size / 2)}`);
          leader.setAttribute("y2", `${ly - 4 - uy * (size / 2)}`);
        }
        const circle = ringRef.current;
        if (circle) {
          circle.setAttribute("visibility", "visible");
          circle.setAttribute("cx", `${cx}`);
          circle.setAttribute("cy", `${cy}`);
          circle.setAttribute("r", `${ring}`);
        }
      }
    }

    // The arrow back to the pin, at the edge of the view, once the player has panned it away.
    const arrow = arrowRef.current;
    const pinAt = markerRef.current?.getLngLat();
    if (arrow && pinAt) {
      const q = map.project(pinAt);
      const view = { x0: 0, y0: Math.min(p.top ?? 60, 64), x1: w, y1: h - Math.min(p.bottom ?? 60, 240) };
      const out = free && (q.x < view.x0 || q.x > view.x1 || q.y < view.y0 || q.y > view.y1);
      arrow.style.opacity = out ? "1" : "0";
      arrow.style.pointerEvents = out ? "auto" : "none";
      arrow.tabIndex = out ? 0 : -1;
      if (out) {
        const mx = (view.x0 + view.x1) / 2;
        const my = (view.y0 + view.y1) / 2;
        const angle = Math.atan2(q.y - my, q.x - mx);
        // Where the line from the middle to the pin leaves the view, 30px in.
        const sx = (view.x1 - view.x0) / 2 - 30;
        const sy = (view.y1 - view.y0) / 2 - 30;
        const t = Math.min(sx / Math.abs(Math.cos(angle) || 1e-6), sy / Math.abs(Math.sin(angle) || 1e-6));
        arrow.style.transform = `translate(${mx + Math.cos(angle) * t - 20}px, ${my + Math.sin(angle) * t - 20}px)`;
        (arrow.firstElementChild as HTMLElement | null)?.style.setProperty("rotate", `${angle}rad`);
      }
    }
  }

  /** Back to the overview: the pin, the river and the four seas. */
  function showPin() {
    const map = mapRef.current;
    if (!map) return;
    const seas = options.current.map((o) => o.coordinates);
    const camera = map.cameraForBounds(boundsOf([pin, ...route, ...seas]), { padding: pad as PaddingOptions, maxZoom: 6 });
    if (camera) map.easeTo({ ...camera, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700 });
  }

  // Place the option seas' names (labelPlacement.ts): the answer first (it moves rather
  // than goes), then the player's pick, then the rest, which are hidden if there's no room.
  useEffect(() => {
    placeNames.current = () => {
      const map = mapRef.current;
      if (!map || !map.getSource("options")) return;
      const canvas = map.getCanvas();
      const pinAt = markerRef.current?.getLngLat();
      const markers = [];
      if (pinAt) {
        const p = map.project(pinAt);
        markers.push(pinBox(p.x, p.y));
      }
      if (mouth.current) {
        const m = map.project(mouth.current);
        markers.push(markerBox(m.x, m.y, MOUTH_RADIUS));
      }
      // The water too: a name never sits on the drop as it flows, or on the line behind it.
      const flowing = waterBoxes(map, water.current.line, water.current.head);
      const rank = (o: OptionSea) => (o.answer ? 0 : o.mine ? 1 : 2);
      const seas = [...options.current].sort((a, b) => rank(a) - rank(b));
      const sizeOf = (o: OptionSea) => (o.answer ? 20 + swell.current * 6 : 17);
      const items = seas.map((o) => {
        const at = map.project(o.coordinates);
        return { id: o.name, x: at.x, y: at.y, ...nameBox(o.name, sizeOf(o)), keep: o.answer || o.mine };
      });
      const area = { x0: 4, y0: 4, x1: canvas.clientWidth - 4, y1: canvas.clientHeight - 4 };
      const placed = placeLabels(items, [...markers, ...flowing], area, { previous: offsets.current });
      nameBoxes.current = placed
        .filter((p) => !p.hidden)
        .map((p) => {
          const it = items.find((i) => i.id === p.id)!;
          return { x0: it.x + p.dx - it.w / 2, y0: it.y + p.dy - it.h / 2, x1: it.x + p.dx + it.w / 2, y1: it.y + p.dy + it.h / 2 };
        });
      placeExtras(map, markers);
      const features = seas.map((o) => {
        const p = placed.find((q) => q.id === o.name)!;
        // text-offset is in ems of the name's own size.
        const offset = [Math.round((p.dx / sizeOf(o)) * 100) / 100, Math.round((p.dy / sizeOf(o)) * 100) / 100];
        return { o, offset, hidden: p.hidden };
      });
      const key = JSON.stringify(features.map((f) => [f.o.name, f.o.answer, f.o.faded, f.offset, f.hidden]));
      if (key === placedKey.current) return; // nothing moved: leave the map alone
      placedKey.current = key;
      (map.getSource("options") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: features.map(({ o, offset, hidden }) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: o.coordinates },
          properties: { name: o.name, answer: o.answer, faded: o.faded, offset, hidden },
        })),
      });
    };
  });

  // Create the map (again after "Try again").
  useEffect(() => {
    let map: MapLibreMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let cancelled = false;
    // If the style hasn't come up after 15 s (a dead network, a blocked host), say so
    // instead of leaving an empty map.
    const watchdog = window.setTimeout(() => {
      if (!cancelled && !mapRef.current) setFailed(true);
    }, 15000);
    import("maplibre-gl")
      .then(({ Map, Marker, setWorkerUrl }) => {
        if (cancelled || !containerRef.current) return;
        setWorkerUrl(WORKER_URL);
        map = new Map({
          container: containerRef.current,
          style: downstreamMapStyle(theme),
          // Start already framed on the pin and its four seas. (Starting elsewhere and
          // flying in downloaded a first set of tiles only to throw them away.)
          bounds: boundsOf([pin, ...Object.values(labels ?? {})]),
          fitBoundsOptions: { padding: pad, maxZoom: 6 },
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        // Offset up 4.5px so the drop's round body (not the middle of its box) sits on the spot.
        markerRef.current = new Marker({ element: pinElement(), offset: [0, -4.5] }).setLngLat(pin).addTo(map);
        // Add our layers as soon as the style is ready. ("load" would wait for every
        // initial tile, so one slow tile held back the route and labels.)
        // Timing marks for performance checks (DevTools > Performance, or performance.getEntriesByType("mark")).
        performance.mark("map:created");
        map.once("load", () => {
          performance.mark("map:loaded"); // style + first tiles drawn
          setDrawnOnce(true);
        });
        map.once("style.load", () => {
          performance.mark("map:style-loaded");
          const m = map!;
          m.addSource("route", { type: "geojson", data: EMPTY });
          m.addSource("head", { type: "geojson", data: EMPTY });
          m.addSource("ripple", { type: "geojson", data: EMPTY });
          m.addSource("mouth", { type: "geojson", data: EMPTY });
          m.addSource("guards", { type: "geojson", data: EMPTY });
          m.addSource("sea-fill", { type: "geojson", data: EMPTY });
          // The answer sea's wash (seaFill.ts): under the coast line, so the coast stays crisp.
          m.addLayer(
            { id: "sea-fill", type: "fill", source: "sea-fill", paint: { "fill-color": colors.current.route, "fill-opacity": colors.current.seaFill, "fill-antialias": false } },
            m.getLayer("coastline") ? "coastline" : undefined,
          );
          // The water: a wide soft glow, a solid core, and white current flowing along it.
          m.addLayer({
            id: "route-glow",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": colors.current.route, "line-width": 26, "line-opacity": 0.22, "line-blur": 9 },
          });
          m.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": colors.current.route, "line-width": 6 },
          });
          m.addLayer({
            id: "route-current",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#ffffff", "line-width": 2.4, "line-opacity": 0.8, "line-dasharray": CURRENT_DASHES[0] },
          });
          // Ripples: a coral ring at a stop, blue rings when the water meets the sea.
          m.addLayer({
            id: "ripple",
            type: "circle",
            source: "ripple",
            paint: {
              "circle-radius": 0,
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-color": ["get", "color"],
              "circle-stroke-width": 2.5,
              "circle-stroke-opacity": 0,
            },
          });
          m.addLayer({
            id: "ripple-2",
            type: "circle",
            source: "ripple",
            paint: {
              "circle-radius": 0,
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-color": ["get", "color"],
              "circle-stroke-width": 2,
              "circle-stroke-opacity": 0,
            },
          });
          // Where the water met the sea: a small drop-blue ring, the end of the route.
          m.addLayer({
            id: "mouth",
            type: "circle",
            source: "mouth",
            paint: { "circle-radius": 5, "circle-color": colors.current.mouthFill, "circle-stroke-color": colors.current.route, "circle-stroke-width": 2.5 },
          });
          // The raindrop at the head of the water: a coral glow around a coral drop.
          m.addLayer({
            id: "head-glow",
            type: "circle",
            source: "head",
            paint: { "circle-radius": 24, "circle-color": colors.current.coral, "circle-opacity": 0.32, "circle-blur": 0.9 },
          });
          m.addLayer({
            id: "head",
            type: "circle",
            source: "head",
            paint: { "circle-radius": 8.5, "circle-color": colors.current.coral, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
          });
          // The four option seas, lettered where the puzzle file says (near the pin).
          m.addSource("options", { type: "geojson", data: EMPTY });
          m.addLayer({
            id: "option-labels",
            type: "symbol",
            source: "options",
            // The options are the player's choices, so they're lettered in coral, bold and
            // larger than the place names. Once decided, the sea reached turns water-blue.
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Noto Sans Bold"],
              "text-size": ["case", ["get", "answer"], 20, 17],
              "text-letter-spacing": 0.04,
              "text-max-width": 8,
              "text-allow-overlap": true,
              // Nudged off the pin and the river mouth (placeNames).
              "text-offset": ["coalesce", ["get", "offset"], ["literal", [0, 0]]],
            },
            filter: ["!", ["coalesce", ["get", "hidden"], false]],
            paint: {
              "text-color": ["case", ["get", "answer"], colors.current.route, colors.current.optionText],
              "text-opacity": ["case", ["get", "faded"], colors.current.optionFaded, 1],
              "text-halo-color": colors.current.optionHalo,
              "text-halo-width": 2.6,
            },
          });
          // Guards: an invisible square on the pin and on the river mouth, above every
          // label layer, so the map's own names (cities, countries, other seas) keep
          // LABEL_GAP clear of them: MapLibre leaves out any name that would touch one.
          // The option seas' names place themselves (placeNames).
          const pinW = 2 * (PIN_RADIUS + LABEL_GAP);
          const pinH = PIN_TIP + PIN_RADIUS + 2 * LABEL_GAP;
          const mouthSide = 2 * (MOUTH_RADIUS + LABEL_GAP);
          m.addImage("pin-guard", { width: pinW, height: pinH, data: new Uint8Array(pinW * pinH * 4) });
          m.addImage("mouth-guard", { width: mouthSide, height: mouthSide, data: new Uint8Array(mouthSide * mouthSide * 4) });
          m.addLayer({
            id: "marker-guards",
            type: "symbol",
            source: "guards",
            layout: {
              "icon-image": ["get", "image"],
              "icon-offset": ["get", "offset"],
              "icon-allow-overlap": true,
              "icon-padding": 0,
            },
          });
          drawn.current = { route: null, km: 0 }; // a fresh map: redraw the current drop
          mapRef.current = m;
          setReady(true);
        });
        // Tell the page where things are on screen whenever the camera moves.
        const report = () =>
          callbacks.current.onCamera?.((lngLat) => map!.project(lngLat), waterBoxes(map!, water.current.line, water.current.head));
        map.on("move", report);
        map.on("resize", report);
        // Re-place the sea names whenever the camera moves (pans, zooms, the reveal's own
        // travel) or the window resizes, at most once a frame.
        const schedulePlacing = () => {
          if (placeFrame.current) return;
          placeFrame.current = requestAnimationFrame(() => {
            placeFrame.current = 0;
            placeNames.current();
          });
        };
        map.on("move", schedulePlacing);
        map.on("resize", schedulePlacing);
        // The attribution starts open; fold it to its (i) button after a few seconds
        // so it doesn't sit over the map on small screens. Tapping (i) opens it again.
        window.setTimeout(() => {
          containerRef.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        }, 4000);
        // Follow the container's size (layouts settle after the map is created).
        resizeObserver = new ResizeObserver(() => map?.resize());
        resizeObserver.observe(containerRef.current);
      })
      .catch(() => {
        // The map code didn't download (offline, flaky network).
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      resizeObserver?.disconnect();
      cancelAnimationFrame(placeFrame.current);
      placeFrame.current = 0;
      map?.remove();
      mapRef.current = null;
    };
    // Created once per attempt; later pins/routes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Light or dark: repaint the live map in place (no style reload, no tile refetch).
  useEffect(() => {
    colors.current = MAP_PALETTES[theme];
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const [layer, property, value] of themePaint(theme)) {
      type Paint = Parameters<MapLibreMap["setPaintProperty"]>;
      if (map.getLayer(layer)) map.setPaintProperty(layer, property as Paint[1], value as Paint[2]);
    }
  }, [ready, theme]);

  // The current flows along whatever route is drawn, and the raindrop's glow
  // breathes. Every paint change makes MapLibre redraw the whole map, so this only
  // touches the map when there is water (or a raindrop) to animate, and at most
  // every 55 ms: an always-on 60 fps redraw kept the map from ever resting and
  // slowed tile loading.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let step = -1;
    const tick = (now: number) => {
      const next = Math.floor(now / 55);
      if (next !== step && drawn.current.km > 0) {
        step = next;
        map.setPaintProperty("route-current", "line-dasharray", CURRENT_DASHES[step % CURRENT_DASHES.length]);
        if (headOn.current) map.setPaintProperty("head-glow", "circle-radius", 24 + Math.sin(now / 260) * 6);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  // Lock or unlock the player's pan and zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const handlers = [map.dragPan, map.scrollZoom, map.boxZoom, map.doubleClickZoom, map.touchZoomRotate, map.keyboard];
    for (const h of handlers) {
      if (interactive) h.enable();
      else h.disable();
    }
    map.touchZoomRotate.disableRotation(); // rotation stays off either way
    map.getCanvas().style.cursor = interactive ? "" : "default";
    // A locked map has nothing to do with the keyboard: keep it out of the Tab order.
    map.getCanvas().tabIndex = interactive ? 0 : -1;
  }, [ready, interactive]);

  function retry() {
    setFailed(false);
    setReady(false);
    setAttempt((a) => a + 1);
  }

  // Letter the option seas, and hide the tiles' own copy of those names so none appears twice.
  const labelKey = JSON.stringify([labels, answer, yourPick]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const [l, a, mine] = JSON.parse(labelKey) as [Record<string, LngLat> | undefined, string | undefined, string | undefined];
    const names = Object.keys(l ?? {});
    options.current = Object.entries(l ?? {}).map(([name, coordinates]) => ({
      name,
      coordinates,
      answer: name === a,
      mine: !!mine && name === mine,
      faded: !!a && name !== a && name !== mine,
    }));
    offsets.current.clear();
    placedKey.current = "";
    placeNames.current();
    const tileName = ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];
    for (const id of ["water-name-point", "water-name-line"]) {
      const geometry = id === "water-name-point" ? ["MultiPoint", "Point"] : ["LineString", "MultiLineString"];
      map.setFilter(id, [
        "all",
        ["match", ["geometry-type"], geometry, true, false],
        ["!", ["in", tileName, ["literal", names]]],
      ] as unknown as FilterSpecification);
    }
  }, [ready, labelKey]);

  // While guessing, the map steps back so the pin stands out: no towns, cities faded.
  // (The changes fade in and out with MapLibre's own paint transition.)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (map.getLayer("town-name")) map.setLayoutProperty("town-name", "visibility", quiet ? "none" : "visible");
    if (map.getLayer("city-name")) map.setPaintProperty("city-name", "text-opacity", quiet ? 0.5 : 1);
    if (map.getLayer("city-dot")) {
      map.setPaintProperty("city-dot", "circle-opacity", quiet ? 0.5 : 1);
      map.setPaintProperty("city-dot", "circle-stroke-opacity", quiet ? 0.5 : 1);
    }
  }, [ready, quiet]);

  // The river network fades in once the drop is decided (hidden while guessing).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty("waterway-river", "line-opacity", showRivers ? 1 : 0);
  }, [ready, showRivers]);

  // The page draws the option seas itself (as buttons) and wants the map's copy hidden.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setLayoutProperty("option-labels", "visibility", hideOptionLabels ? "none" : "visible");
    callbacks.current.onCamera?.((lngLat) => map.project(lngLat), waterBoxes(map, water.current.line, water.current.head));
    placeNames.current();
  }, [ready, hideOptionLabels]);

  // New drop or new reveal: the raindrop leads the water from what's drawn to revealKm.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const routeSource = map.getSource("route") as GeoJSONSource;
    const headSource = map.getSource("head") as GeoJSONSource;
    const rippleSource = map.getSource("ripple") as GeoJSONSource;
    const mouthSource = map.getSource("mouth") as GeoJSONSource;
    const guardSource = map.getSource("guards") as GeoJSONSource;
    // The guards follow the markers: the pin always, the river mouth once reached.
    // (The pin's guard is centred on its box, which reaches further up, to the drop's tip.)
    const guard = (at: number[], image: "pin-guard" | "mouth-guard") => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: at },
      properties: { image, offset: image === "pin-guard" ? [0, (PIN_RADIUS - PIN_TIP) / 2] : [0, 0] },
    });
    const setMouth = (at: number[] | null) => {
      mouth.current = at as LngLat | null;
      mouthSource.setData(at ? { type: "Feature", geometry: { type: "Point", coordinates: at }, properties: {} } : EMPTY);
      guardSource.setData({ type: "FeatureCollection", features: [guard(pin, "pin-guard"), ...(at ? [guard(at, "mouth-guard")] : [])] });
      placeNames.current();
    };
    // The answer sea's wash spreads from the river mouth (seaFill.ts).
    const fillSource = map.getSource("sea-fill") as GeoJSONSource | undefined;
    let fillFrame = 0;
    let fillEnd: (() => void) | null = null;
    function fillSea(at: LngLat) {
      if (!fillSource || !seaShape?.length) return;
      const shape = seaShape;
      const reach = fillReach([pin, at, ...seaPoints], at);
      const done = () => fillSource.setData(fillBands(shape, at, reach));
      if (reduceMotion) return done();
      fillEnd = done;
      const start = performance.now();
      let step = 0;
      const run = (now: number) => {
        const t = Math.min((now - start) / 1800, 1);
        // Every other frame is plenty for a slow spread, and halves the clipping work.
        if (step++ % 2 === 0 || t === 1) fillSource.setData(fillBands(shape, at, reach * easeOut(t)));
        if (t < 1) fillFrame = requestAnimationFrame(run);
        else fillEnd = null;
      };
      fillFrame = requestAnimationFrame(run);
    }
    // The zoom-in on a new drop (see below); ended early by a tap, a scroll, or the effect re-running.
    let introEnd: ((fast: boolean) => void) | null = null;
    const line = lineString(route);
    const totalKm = length(line, { units: "kilometers" });
    const slice = (km: number) => lineSliceAlong(line, 0, Math.min(Math.max(km, 0.01), totalKm), { units: "kilometers" });
    const padding = JSON.parse(padKey) as PaddingOptions;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seaPoints = Object.values((JSON.parse(labelKey) as [Record<string, LngLat> | undefined])[0] ?? {});
    const pinDot = markerRef.current?.getElement().querySelector(".route-pin");
    let frame = 0;
    let rippleFrame = 0;

    const to = Math.min(revealKm, totalKm);
    if (drawn.current.route !== route) {
      // A new drop: clear the old water, land the rain on the new pin, and show it
      // with all four seas.
      drawn.current = { route, km: 0 };
      routeSource.setData(EMPTY);
      headSource.setData(EMPTY);
      water.current = { line: [], head: null };
      headOn.current = false;
      rippleSource.setData(EMPTY);
      fillSource?.setData(EMPTY);
      markerRef.current?.setLngLat(pin);
      setMouth(null);
      pinDot?.classList.remove("is-origin", "is-landing", "show-tag");
      if (to <= 0) {
        const overview = map.cameraForBounds(boundsOf([pin, ...seaPoints]), { padding, maxZoom: 6 });
        if (reduceMotion || !overview) {
          map.fitBounds(boundsOf([pin, ...seaPoints]), { padding, maxZoom: 6, duration: reduceMotion ? 0 : 1200 });
        } else {
          // The zoom-in (2026-11-09): open close on the pin, "Rain lands here", hold, then
          // pull back to the pin and its four seas. A tap or a scroll skips to the seas;
          // the page keeps the sea buttons away while it's close (onIntro).
          const close = map.cameraForBounds(boundsOf([pin, pin]), { padding, maxZoom: Math.min(8, Math.max((overview.zoom ?? 4) + 2.5, 6.5)) });
          if (close) map.jumpTo(close);
          callbacks.current.onIntro?.(true);
          const box = containerRef.current;
          let hold = 0;
          const end = (fast: boolean) => {
            if (introEnd !== end) return;
            introEnd = null;
            window.clearTimeout(hold);
            box?.removeEventListener("pointerdown", skip);
            box?.removeEventListener("wheel", skip);
            pinDot?.classList.remove("show-tag");
            const ms = fast ? 450 : INTRO_PULL_MS;
            map.easeTo({ ...overview, duration: ms, easing: easeInOut });
            // The sea buttons come back as the four seas come into view.
            window.setTimeout(() => callbacks.current.onIntro?.(false), ms * 0.75);
          };
          const skip = () => end(true);
          introEnd = end;
          box?.addEventListener("pointerdown", skip);
          box?.addEventListener("wheel", skip, { passive: true });
          // Wait for the close view's tiles (on a first load the map is still filling in).
          const begin = () => {
            if (introEnd !== end) return;
            pinDot?.classList.add("show-tag");
            hold = window.setTimeout(() => end(false), INTRO_HOLD_MS);
          };
          if (map.loaded()) begin();
          else map.once("idle", begin);
        }
        if (!reduceMotion) {
          void (pinDot as HTMLElement | undefined)?.offsetWidth; // restart the landing animation
          pinDot?.classList.add("is-landing");
        }
        callbacks.current.onLand?.();
      }
    }
    // Leaving early (the player let it flow during the zoom-in, or the drop changed):
    // the camera goes straight to the seas, and the page gets its buttons back.
    const cleanupIntro = () => {
      if (!introEnd) return;
      introEnd = null;
      pinDot?.classList.remove("show-tag");
      callbacks.current.onIntro?.(false);
    };

    const from = drawn.current.km;
    if (to <= from) {
      return () => {
        const wasClose = !!introEnd;
        cleanupIntro();
        if (wasClose) {
          const overview = map.cameraForBounds(boundsOf([pin, ...seaPoints]), { padding, maxZoom: 6 });
          if (overview) map.jumpTo(overview);
        }
      };
    }
    cleanupIntro();
    const final = to >= totalKm - 0.01;
    const target = slice(to);
    // Every flow ends back on the full view: the pin, all four seas and the water so far,
    // framed like the drop's first view. (Stops used to settle 0.7 zoom levels closer to
    // the stretch just revealed, which left part of the board out of view while the
    // player decided; removed 2026-10-22 after player feedback.)
    const overview = map.cameraForBounds(boundsOf([pin, ...target.geometry.coordinates, ...seaPoints]), { padding, maxZoom: 6 });
    pinDot?.classList.add("is-origin"); // the water has left the pin: mark where it fell

    function ripple(at: number[], color: string, rings: number) {
      rippleSource.setData({ type: "Feature", geometry: { type: "Point", coordinates: at }, properties: { color } });
      if (reduceMotion) return;
      const start = performance.now();
      const run = (now: number) => {
        const t = (now - start) / 1100;
        for (const [id, delay] of [["ripple", 0], ["ripple-2", 0.28]] as const) {
          const p = Math.min(Math.max(t - delay, 0) / (1 - 0.28), 1);
          const on = id === "ripple" || rings > 1;
          map!.setPaintProperty(id, "circle-radius", 6 + easeOut(p) * (rings > 1 ? 46 : 34));
          map!.setPaintProperty(id, "circle-stroke-opacity", on && p > 0 && p < 1 ? 0.85 * (1 - p) : 0);
        }
        if (t < 1.3) rippleFrame = requestAnimationFrame(run);
      };
      rippleFrame = requestAnimationFrame(run);
    }

    function finish() {
      drawn.current.km = to;
      const end = target.geometry.coordinates[target.geometry.coordinates.length - 1];
      if (final) {
        headSource.setData(EMPTY); // the drop has joined the sea
        headOn.current = false;
        water.current = { line: target.geometry.coordinates, head: null };
        setMouth(end);
        fillSea(end as LngLat);
        ripple(end, colors.current.route, 2);
      } else {
        ripple(end, colors.current.coral, 1);
      }
      // The camera has stopped: tell the names and sea buttons where the water ended up.
      callbacks.current.onCamera?.((lngLat) => map!.project(lngLat), waterBoxes(map!, water.current.line, water.current.head));
      placeNames.current();
      callbacks.current.onFlowEnd?.(final);
    }

    if (reduceMotion || !overview) {
      routeSource.setData(target);
      const end = target.geometry.coordinates[target.geometry.coordinates.length - 1];
      headSource.setData(final ? EMPTY : { type: "Feature", geometry: { type: "Point", coordinates: end }, properties: {} });
      headOn.current = !final;
      water.current = { line: target.geometry.coordinates, head: final ? null : end };
      if (overview) map.jumpTo(overview);
      callbacks.current.onFlowStart?.(0, final);
      finish();
      return;
    }

    const fraction = (to - from) / totalKm;
    const ms = drawDuration(fraction, final);
    // Lean in further for short stretches, so a small river still feels like a journey.
    const leanZoom = Math.min(1.4, Math.max(0.8, 1.6 - fraction));
    callbacks.current.onFlowStart?.(ms, final);
    const startCenter = map.getCenter();
    const startZoom = map.getZoom();
    const endCenter = overview.center as { lng: number; lat: number };
    const endZoom = overview.zoom ?? startZoom;
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min((now - start) / ms, 1);
      const km = from + (to - from) * easeInOut(raw);
      const drawnLine = slice(km);
      const head = drawnLine.geometry.coordinates[drawnLine.geometry.coordinates.length - 1];
      routeSource.setData(drawnLine);
      headSource.setData({ type: "Feature", geometry: { type: "Point", coordinates: head }, properties: {} });
      headOn.current = true;
      // Before the camera moves, so the names placed on that move see the water as it is now.
      water.current = { line: drawnLine.geometry.coordinates, head };
      drawn.current.km = km;
      // Camera: settle into the overview, while leaning in to follow the water mid-flow
      // (sin curve: zero at both ends, so it lands exactly on the overview). The follow
      // framing is the stretch drawn in this flow, fitted with the same padding as every
      // other framing, so the drop and its trail are always in the visible part of the
      // map. (Nudging the centre a fixed 45% towards the drop while zooming in 0.8-1.4
      // levels could leave it off screen when the overview was wide, so the camera
      // dived into empty map beside the path.)
      const settle = easeOut(Math.min(raw / 0.3, 1));
      const lean = Math.sin(Math.PI * raw);
      const baseLng = lerp(startCenter.lng, endCenter.lng, settle);
      const baseLat = lerp(startCenter.lat, endCenter.lat, settle);
      const baseZoom = lerp(startZoom, endZoom, settle);
      // (Clamped: a negative start makes lineSliceAlong throw, which stopped the flow dead.)
      const stretchStart = Math.max(0, Math.min(from, km - 0.01));
      const stretch = lineSliceAlong(line, stretchStart, Math.min(totalKm, Math.max(km, stretchStart + 0.01)), { units: "kilometers" });
      const follow = map!.cameraForBounds(boundsOf(stretch.geometry.coordinates), { padding, maxZoom: baseZoom + leanZoom });
      const followCenter = follow?.center as { lng: number; lat: number } | undefined;
      map!.jumpTo({
        center: followCenter ? [lerp(baseLng, followCenter.lng, lean), lerp(baseLat, followCenter.lat, lean)] : [baseLng, baseLat],
        // A long stretch may need to pull back a little rather than lean in: showing the
        // water wins over the lean.
        zoom: lerp(baseZoom, follow?.zoom ?? baseZoom, lean),
        // No `padding` here: cameraForBounds already allowed for it, and jumpTo would
        // keep it on the map, doubling it in every later framing.
      });
      if (raw < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(rippleFrame);
      cancelAnimationFrame(fillFrame);
      fillEnd?.(); // a wash cut short is shown finished
    };
    // seaShape travels with the route (same drop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pin, route, revealKm, padKey, labelKey]);

  // When the answer is revealed, its name swells in, then settles.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !answer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      swell.current = Math.sin(Math.PI * Math.min(t / 0.7, 1)); // 0 -> 1 -> 0
      map.setLayoutProperty("option-labels", "text-size", ["case", ["get", "answer"], 20 + swell.current * 6, 17]);
      placeNames.current(); // a bigger name needs more room from the markers
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      swell.current = 0;
    };
  }, [ready, answer]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" aria-label="Map of the raindrop's route" role="img" />
      {/* The magnifier for a short river, tied to it by a thin line and a ring (placeExtras). */}
      {lensSize > 0 && (
        <>
          <svg className="pointer-events-none absolute inset-0 z-[3] h-full w-full" aria-hidden="true">
            <circle ref={ringRef} className="magnifier-leader" visibility="hidden" />
            <line ref={leaderRef} className="magnifier-leader" visibility="hidden" />
          </svg>
          <Magnifier
            route={route}
            theme={theme}
            size={lensSize}
            distanceKm={distanceKm}
            frameRef={(el) => {
              lensEl.current = el;
              if (el) {
                el.style.visibility = "hidden"; // until placed
                requestAnimationFrame(() => placeNames.current());
              }
            }}
          />
        </>
      )}
      {/* Back to where the rain fell, once the player has panned it out of view. */}
      <button
        ref={arrowRef}
        type="button"
        onClick={showPin}
        tabIndex={-1}
        aria-label="Back to where the rain fell"
        className="pin-arrow absolute top-0 left-0 z-[6] grid size-10 place-items-center rounded-full bg-card text-coral-deep opacity-0 shadow-card"
        style={{ pointerEvents: "none" }}
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 10h11m-4-4.5L15.5 10 11 14.5" />
        </svg>
      </button>
      {/* Until the map has drawn its first tiles (not just its style, which left a blank
          map): the shared loading state, then it fades away. */}
      <Loading
        label="Drawing the map…"
        className={`absolute inset-0 bg-land transition-opacity duration-500 ${(ready && drawnOnce) || failed ? "pointer-events-none opacity-0" : ""}`}
      />
      {failed && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-land/85 p-4">
          <div className="rounded-2xl bg-card p-5 text-center shadow-card">
            <p className="font-semibold">The map didn&apos;t load.</p>
            <p className="mt-1 text-sm text-ink-soft">Check your connection, then try again.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-full bg-card px-5 py-2 text-sm font-semibold ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
