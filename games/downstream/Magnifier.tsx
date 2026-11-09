"use client";

// The magnifier: when a river is too short to read on the main map (a few dozen
// pixels between where the rain fell and the sea), a round inset beside it shows the
// same river close up, with the raindrop running down it to the sea, and how far it
// went. RouteMap decides when it shows and where it sits (clear of the pin, the river
// mouth and the sea names); this draws it. It's a second, small MapLibre map in
// Downstream's style, with no lettering (too small to read) and no interaction.

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { downstreamMapStyle, MAP_PALETTES, type MapTheme } from "./mapStyle";
import type { LngLat } from "./types";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const RUN_MS = 2600; // the drop's trip down the river
const REST_MS = 1400; // a pause at the sea before it runs again

/** Where along a route a share `t` (0..1) of its length falls (flat, latitude-corrected: plenty for a short river). */
export function pointAlong(route: LngLat[], t: number): LngLat {
  const k = Math.cos((route[0][1] * Math.PI) / 180);
  const legs = route.slice(1).map((p, i) => Math.hypot((p[0] - route[i][0]) * k, p[1] - route[i][1]));
  const total = legs.reduce((a, b) => a + b, 0);
  let left = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < legs.length; i++) {
    if (left <= legs[i] || i === legs.length - 1) {
      const f = legs[i] ? Math.min(left / legs[i], 1) : 1;
      return [route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f];
    }
    left -= legs[i];
  }
  return route[route.length - 1];
}

export default function Magnifier({
  route,
  theme,
  size,
  distanceKm,
  frameRef,
}: {
  route: LngLat[];
  theme: MapTheme;
  /** The lens's diameter in px. */
  size: number;
  distanceKm?: number;
  /** The positioned wrapper (RouteMap moves it as the camera moves). */
  frameRef: (el: HTMLDivElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const routeKey = JSON.stringify(route);

  useEffect(() => {
    let map: MapLibreMap | undefined;
    let frame = 0;
    let cancelled = false;
    const line: LngLat[] = JSON.parse(routeKey);
    const C = MAP_PALETTES[theme];
    const lons = line.map((p) => p[0]);
    const lats = line.map((p) => p[1]);
    import("maplibre-gl").then(({ Map }) => {
      if (cancelled || !containerRef.current) return;
      map = new Map({
        container: containerRef.current,
        style: downstreamMapStyle(theme),
        bounds: [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        fitBoundsOptions: { padding: Math.round(size * 0.2), maxZoom: 10 },
        interactive: false,
        attributionControl: false,
      });
      map.once("style.load", () => {
        const m = map!;
        // Too small to read lettering in: shapes only.
        for (const layer of m.getStyle().layers) {
          if (layer.type === "symbol" || layer.id === "city-dot") m.setLayoutProperty(layer.id, "visibility", "none");
        }
        const point = (at: LngLat): GeoJSON.Feature => ({ type: "Feature", geometry: { type: "Point", coordinates: at }, properties: {} });
        m.addSource("route", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: {} } });
        m.addSource("ends", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [{ ...point(line[0]), properties: { end: "pin" } }, { ...point(line[line.length - 1]), properties: { end: "mouth" } }] },
        });
        m.addSource("head", { type: "geojson", data: EMPTY });
        m.addLayer({ id: "route-glow", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.route, "line-width": 14, "line-opacity": 0.22, "line-blur": 5 } });
        m.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.route, "line-width": 4 } });
        m.addLayer({
          id: "ends",
          type: "circle",
          source: "ends",
          paint: {
            "circle-radius": ["match", ["get", "end"], "pin", 5.5, 4],
            "circle-color": ["match", ["get", "end"], "pin", "#ffffff", C.mouthFill],
            "circle-stroke-color": ["match", ["get", "end"], "pin", C.coral, C.route],
            "circle-stroke-width": 2.5,
          },
        });
        m.addLayer({ id: "head-glow", type: "circle", source: "head", paint: { "circle-radius": 13, "circle-color": C.coral, "circle-opacity": 0.3, "circle-blur": 0.9 } });
        m.addLayer({ id: "head", type: "circle", source: "head", paint: { "circle-radius": 5.5, "circle-color": C.coral, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        const head = m.getSource("head") as GeoJSONSource;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          head.setData(point(line[line.length - 1]));
          return;
        }
        // The drop runs down the river, rests at the sea, and runs again. At most ~30
        // updates a second, and only while the lens is open.
        const start = performance.now();
        let last = 0;
        const tick = (now: number) => {
          if (now - last > 32) {
            last = now;
            const t = ((now - start) % (RUN_MS + REST_MS)) / RUN_MS;
            const eased = t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            head.setData(point(pointAlong(line, eased)));
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      map?.remove();
    };
  }, [routeKey, theme, size]);

  return (
    <div ref={frameRef} className="magnifier pointer-events-none absolute top-0 left-0 z-[4]" style={{ width: size }} aria-hidden="true">
      <div className="magnifier-lens relative overflow-hidden rounded-full bg-sea" style={{ width: size, height: size }}>
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {distanceKm !== undefined && (
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-ink shadow-card">
          {distanceKm.toLocaleString("en")} km
        </span>
      )}
    </div>
  );
}
