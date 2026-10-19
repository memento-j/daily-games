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
import { useTheme } from "@/lib/useTheme";
import { downstreamMapStyle, MAP_PALETTES, themePaint } from "./mapStyle";
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
  onCamera?: (project: Project) => void;
  className?: string;
};

/** The pin. While nothing has flowed it's the raindrop itself (solid coral); once
 * the water moves on, it becomes a hollow ring marking where the rain fell. */
function pinElement() {
  const wrap = document.createElement("div");
  const dot = document.createElement("div");
  dot.className = "route-pin";
  wrap.appendChild(dot);
  return wrap;
}

/** The [southwest, northeast] box around some points. */
function boundsOf(points: number[][]): [[number, number], [number, number]] {
  const lons = points.map((c) => c[0]);
  const lats = points.map((c) => c[1]);
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
}

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
  className = "",
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Which route is on screen, and how much of it is drawn.
  const drawn = useRef<{ route: LngLat[] | null; km: number }>({ route: null, km: 0 });
  const headOn = useRef(false); // whether the raindrop is on the map (for its glow)
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again" to rebuild the map
  // Light or dark (mapStyle.ts has both palettes). Read through a ref by the map setup
  // and the animations, and applied to a live map in place by the effect below.
  const theme = useTheme();
  const colors = useRef(MAP_PALETTES[theme]);
  const pad = { top: 60, right: 60, bottom: 60, left: 60, ...padding };
  const padKey = JSON.stringify(pad);
  // The animation reads the latest callbacks through a ref, kept in sync after each render.
  const callbacks = useRef({ onLand, onFlowStart, onFlowEnd, onCamera });
  useEffect(() => {
    callbacks.current = { onLand, onFlowStart, onFlowEnd, onCamera };
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
        markerRef.current = new Marker({ element: pinElement() }).setLngLat(pin).addTo(map);
        // Add our layers as soon as the style is ready. ("load" would wait for every
        // initial tile, so one slow tile held back the route and labels.)
        // Timing marks for performance checks (DevTools > Performance, or performance.getEntriesByType("mark")).
        performance.mark("map:created");
        map.once("load", () => performance.mark("map:loaded")); // style + first tiles drawn
        map.once("style.load", () => {
          performance.mark("map:style-loaded");
          const m = map!;
          m.addSource("route", { type: "geojson", data: EMPTY });
          m.addSource("head", { type: "geojson", data: EMPTY });
          m.addSource("ripple", { type: "geojson", data: EMPTY });
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
            },
            paint: {
              "text-color": ["case", ["get", "answer"], colors.current.route, colors.current.optionText],
              "text-opacity": ["case", ["get", "faded"], 0.3, 1],
              "text-halo-color": colors.current.optionHalo,
              "text-halo-width": 2.6,
            },
          });
          drawn.current = { route: null, km: 0 }; // a fresh map: redraw the current drop
          mapRef.current = m;
          setReady(true);
        });
        // Tell the page where things are on screen whenever the camera moves.
        const report = () => callbacks.current.onCamera?.((lngLat) => map!.project(lngLat));
        map.on("move", report);
        map.on("resize", report);
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
    (map.getSource("options") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: Object.entries(l ?? {}).map(([name, coordinates]) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates },
        properties: { name, answer: name === a, faded: !!a && name !== a && name !== mine },
      })),
    });
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
    callbacks.current.onCamera?.((lngLat) => map.project(lngLat));
  }, [ready, hideOptionLabels]);

  // New drop or new reveal: the raindrop leads the water from what's drawn to revealKm.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const routeSource = map.getSource("route") as GeoJSONSource;
    const headSource = map.getSource("head") as GeoJSONSource;
    const rippleSource = map.getSource("ripple") as GeoJSONSource;
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
      headOn.current = false;
      rippleSource.setData(EMPTY);
      markerRef.current?.setLngLat(pin);
      pinDot?.classList.remove("is-origin", "is-landing");
      if (to <= 0) {
        map.fitBounds(boundsOf([pin, ...seaPoints]), { padding, maxZoom: 6, duration: reduceMotion ? 0 : 1200 });
        if (!reduceMotion) {
          void (pinDot as HTMLElement | undefined)?.offsetWidth; // restart the landing animation
          pinDot?.classList.add("is-landing");
        }
        callbacks.current.onLand?.();
      }
    }

    const from = drawn.current.km;
    if (to <= from) return;
    const final = to >= totalKm - 0.01;
    const target = slice(to);
    const wide = map.cameraForBounds(boundsOf([pin, ...target.geometry.coordinates, ...seaPoints]), { padding, maxZoom: 6 });
    // At a stop (not the sea), settle a little closer to the stretch just revealed,
    // so each stop visibly shows something; the sea buttons stay pinned in view.
    const near = final ? undefined : map.cameraForBounds(boundsOf([pin, ...target.geometry.coordinates]), { padding, maxZoom: 7 });
    const overview =
      wide && near
        ? (() => {
            const w = wide.center as { lng: number; lat: number };
            const n = near.center as { lng: number; lat: number };
            return {
              ...wide,
              center: { lng: lerp(w.lng, n.lng, 0.35), lat: lerp(w.lat, n.lat, 0.35) },
              zoom: Math.min((wide.zoom ?? 3) + 0.7, near.zoom ?? 7),
            };
          })()
        : wide;
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
        ripple(end, colors.current.route, 2);
      } else {
        ripple(end, colors.current.coral, 1);
      }
      callbacks.current.onFlowEnd?.(final);
    }

    if (reduceMotion || !overview) {
      routeSource.setData(target);
      const end = target.geometry.coordinates[target.geometry.coordinates.length - 1];
      headSource.setData(final ? EMPTY : { type: "Feature", geometry: { type: "Point", coordinates: end }, properties: {} });
      headOn.current = !final;
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
      drawn.current.km = km;
      // Camera: settle into the overview, while leaning in and travelling with the drop
      // mid-flow (sin curve: zero at both ends, so it lands exactly on the overview).
      const settle = easeOut(Math.min(raw / 0.3, 1));
      const lean = Math.sin(Math.PI * raw);
      const baseLng = lerp(startCenter.lng, endCenter.lng, settle);
      const baseLat = lerp(startCenter.lat, endCenter.lat, settle);
      map!.jumpTo({
        center: [lerp(baseLng, head[0], lean * 0.45), lerp(baseLat, head[1], lean * 0.45)],
        zoom: lerp(startZoom, endZoom, settle) + lean * leanZoom,
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
    };
  }, [ready, pin, route, revealKm, padKey, labelKey]);

  // When the answer is revealed, its name swells in, then settles.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !answer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      const swell = Math.sin(Math.PI * Math.min(t / 0.7, 1)); // 0 -> 1 -> 0
      map.setLayoutProperty("option-labels", "text-size", ["case", ["get", "answer"], 20 + swell * 6, 17]);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, answer]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" aria-label="Map of the raindrop's route" role="img" />
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
