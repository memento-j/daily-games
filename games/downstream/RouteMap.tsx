"use client";

// The Downstream map: the real world in Downstream's own style (labelled seas and
// cities), the coral raindrop pin, and the water's route in drop-blue, drawn up
// to `revealKm`.
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
import { downstreamMapStyle } from "./mapStyle";
import type { LngLat } from "./types";

// MapLibre processes tiles in a web worker, which it looks for next to its own
// file. The bundler can't see that, so `npm run dev`/`build` copy the worker
// into public/ (see "copy-map-worker" in package.json) and we point MapLibre at it.
const WORKER_URL = "/maplibre-gl-worker.mjs";
const WATER = "#155eef";
const CORAL_DEEP = "#d93d46";
const DRAW_MS = 1600; // time to draw each new stretch of route
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

type Props = {
  pin: LngLat;
  route: LngLat[];
  revealKm: number; // draw the route up to here; Infinity = the whole route
  /** The four option seas and where to letter them (from the puzzle file). */
  labels?: Record<string, LngLat>;
  /** Once the drop is decided: the sea it reached, lettered strongest; the others fade. */
  answer?: string;
  /** Screen space covered by UI (a card or sheet), so framing keeps the route clear of it. */
  padding?: Partial<PaddingOptions>;
  className?: string;
};

/** The coral raindrop pin: a white-ringed coral disc. */
function pinElement() {
  const el = document.createElement("div");
  el.style.cssText =
    "width:18px;height:18px;border-radius:9999px;background:#f2545b;border:3px solid #fff;box-shadow:0 2px 8px rgb(18 26 43/.35)";
  return el;
}

export default function RouteMap({ pin, route, revealKm, labels, answer, padding, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const pad = { top: 60, right: 60, bottom: 60, left: 60, ...padding };
  const padKey = JSON.stringify(pad);

  // Create the map once.
  useEffect(() => {
    let map: MapLibreMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let cancelled = false;
    import("maplibre-gl").then(({ Map, Marker, setWorkerUrl }) => {
      if (cancelled || !containerRef.current) return;
      setWorkerUrl(WORKER_URL);
      map = new Map({
        container: containerRef.current,
        style: downstreamMapStyle(),
        center: pin,
        zoom: 3.5,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      markerRef.current = new Marker({ element: pinElement() }).setLngLat(pin).addTo(map);
      map.on("load", () => {
        // The route: a soft glow under a solid core, above every other layer.
        map!.addSource("route", { type: "geojson", data: EMPTY });
        map!.addLayer({
          id: "route-glow",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": WATER, "line-width": 14, "line-opacity": 0.16, "line-blur": 2 },
        });
        map!.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": WATER, "line-width": 4.5 },
        });
        // The four option seas, lettered where the puzzle file says (near the pin).
        map!.addSource("options", { type: "geojson", data: EMPTY });
        map!.addLayer({
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
            "text-color": ["case", ["get", "answer"], WATER, CORAL_DEEP],
            "text-opacity": ["case", ["get", "faded"], 0.4, 1],
            "text-halo-color": "rgba(255,255,255,0.97)",
            "text-halo-width": 2.6,
          },
        });
        mapRef.current = map!;
        setReady(true);
      });
      // Follow the container's size (layouts settle after the map is created).
      resizeObserver = new ResizeObserver(() => map?.resize());
      resizeObserver.observe(containerRef.current);
    });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // The map is created once; later pins/routes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Letter the option seas, and hide the tiles' own copy of those names so none appears twice.
  const labelKey = JSON.stringify([labels, answer]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const [l, a] = JSON.parse(labelKey) as [Record<string, LngLat> | undefined, string | undefined];
    const names = Object.keys(l ?? {});
    (map.getSource("options") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: Object.entries(l ?? {}).map(([name, coordinates]) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates },
        properties: { name, answer: name === a, faded: !!a && name !== a },
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

  // Which route is on screen, and how much of it is drawn.
  const drawn = useRef<{ route: LngLat[] | null; km: number }>({ route: null, km: 0 });

  // New drop or new reveal: animate the line from what's drawn to revealKm.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource("route") as GeoJSONSource;
    const line = lineString(route);
    const totalKm = length(line, { units: "kilometers" });
    const slice = (km: number): GeoJSON.Feature | GeoJSON.FeatureCollection =>
      km <= 0 ? EMPTY : lineSliceAlong(line, 0, Math.min(km, totalKm), { units: "kilometers" });
    const padding = JSON.parse(padKey) as PaddingOptions;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seaPoints = Object.values((JSON.parse(labelKey) as [Record<string, LngLat> | undefined])[0] ?? {});
    // Frame these points: always the pin and the four seas' names, plus any route shown.
    const frameView = (points: LngLat[] | number[][], duration: number) => {
      const lons = points.map((c) => c[0]);
      const lats = points.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        { padding, maxZoom: 6, duration: reduceMotion ? 0 : duration },
      );
    };

    const to = Math.min(revealKm, totalKm);
    if (drawn.current.route !== route) {
      // A new drop: clear the old line, move the pin, and show it with all four seas.
      drawn.current = { route, km: 0 };
      source.setData(EMPTY);
      markerRef.current?.setLngLat(pin);
      if (to <= 0) frameView([pin, ...seaPoints], 1200);
    }

    const from = drawn.current.km;
    if (to <= from) return;

    // Frame the stretch we're about to draw (with the pin and seas), then grow the line.
    const target = slice(to) as GeoJSON.Feature<GeoJSON.LineString>;
    frameView([pin, ...target.geometry.coordinates, ...seaPoints], 1100);

    if (reduceMotion) {
      source.setData(slice(to));
      drawn.current.km = to;
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min((now - start) / DRAW_MS, 1);
      const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2; // ease in-out
      const km = from + (to - from) * t;
      source.setData(slice(km));
      drawn.current.km = km;
      if (raw < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, pin, route, revealKm, padKey, labelKey]);

  return <div ref={containerRef} className={className} aria-label="Map of the raindrop's route" role="img" />;
}
