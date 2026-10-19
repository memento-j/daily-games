// Downstream's own MapLibre style: the same world as the 3D hero (pale land, soft
// blue water), with clear labels for oceans, seas and bays (italic, water-blue),
// countries and cities (ink). Vector tiles and fonts are from OpenFreeMap (free,
// no key). No elevation shading: it cost a second tile host and a heavy layer,
// and the rivers, coasts and labels carry the clues (developer's call, 2026-10-16).
//
// It replaces the stock "Liberty" style, which carried roads, POIs and busy
// colours the game doesn't need. Colours mirror the tokens in app/globals.css, in a
// light and a night palette (dark mode): at night the land is blue-black, the sea
// deeper, labels light on dark halos, and the route a brighter blue so it still glows.

import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

export type MapTheme = "light" | "dark";

export type MapPalette = {
  land: string;
  sea: string;
  river: string;
  coast: string;
  border: string;
  ice: string;
  ink: string;
  inkSoft: string;
  waterLabel: string;
  halo: string;
  cityRing: string;
  // The game's own layers (RouteMap): the water's route, the raindrop, the option seas.
  route: string;
  coral: string;
  optionText: string; // a picked or option sea's lettering
  optionHalo: string;
};

export const MAP_PALETTES: Record<MapTheme, MapPalette> = {
  light: {
    land: "#eef0ec",
    sea: "#d3e4f3",
    river: "#a9c9ea",
    coast: "#8fa7bf",
    border: "#b9bfc8",
    ice: "#f7f9fa",
    ink: "#121a2b",
    inkSoft: "#4a5468",
    waterLabel: "#2e5f95",
    halo: "rgba(255,255,255,0.85)",
    cityRing: "#ffffff",
    route: "#155eef",
    coral: "#f2545b",
    optionText: "#c0303a",
    optionHalo: "rgba(255,255,255,0.97)",
  },
  dark: {
    land: "#161d26",
    sea: "#0e1c2c",
    river: "#2c5482",
    coast: "#3b5878",
    border: "#3d4857",
    ice: "#222a35",
    ink: "#e6ebf2",
    inkSoft: "#a3aec0",
    waterLabel: "#86b4ea",
    halo: "rgba(14,20,28,0.85)",
    cityRing: "#161d26",
    route: "#4d8dff",
    coral: "#f2545b",
    optionText: "#ff8a90",
    optionHalo: "rgba(14,20,28,0.95)",
  },
};

// English name where there is one, otherwise the local name.
const NAME: ExpressionSpecification = ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];

export function downstreamMapStyle(theme: MapTheme = "light"): StyleSpecification {
  const C = MAP_PALETTES[theme];
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": C.land } },
      {
        id: "landcover-ice",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "ice"],
        paint: { "fill-color": C.ice },
      },
      {
        id: "waterway-river",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        filter: ["all", ["==", ["get", "class"], "river"], ["!=", ["get", "brunnel"], "tunnel"]],
        layout: { "line-cap": "round" },
        // Hidden while the player guesses (the river network would give the answer
        // away); RouteMap fades them in once the drop is decided. Faint context only.
        paint: {
          "line-color": C.river,
          "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 4, 0.6, 10, 2, 16, 6],
          "line-opacity": 0,
          "line-opacity-transition": { duration: 900, delay: 0 },
        },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        filter: ["!=", ["get", "brunnel"], "tunnel"],
        paint: { "fill-color": C.sea },
      },
      {
        id: "coastline",
        type: "line",
        source: "openmaptiles",
        "source-layer": "water",
        filter: ["==", ["get", "class"], "ocean"],
        paint: { "line-color": C.coast, "line-width": 0.8, "line-opacity": 0.7 },
      },
      {
        id: "boundary-country",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
        layout: { "line-join": "round" },
        paint: {
          "line-color": C.border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 8, 1.4],
          "line-dasharray": [3, 2],
        },
      },
      // --- Labels: water names (the game's answers) are the most important.
      {
        id: "water-name-line",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "water_name",
        filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 400,
          "text-field": NAME,
          "text-font": ["Noto Sans Italic"],
          "text-letter-spacing": 0.15,
          "text-size": 13,
        },
        paint: { "text-color": C.waterLabel, "text-halo-color": C.halo, "text-halo-width": 1.4 },
      },
      {
        id: "water-name-point",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "water_name",
        filter: ["match", ["geometry-type"], ["MultiPoint", "Point"], true, false],
        layout: {
          "text-field": NAME,
          "text-font": ["Noto Sans Italic"],
          "text-letter-spacing": 0.18,
          "text-max-width": 7,
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, ["match", ["get", "class"], "ocean", 13, 11], 6, ["match", ["get", "class"], "ocean", 18, 14]],
          "symbol-sort-key": ["match", ["get", "class"], "ocean", 0, "sea", 1, 2],
        },
        paint: { "text-color": C.waterLabel, "text-halo-color": C.halo, "text-halo-width": 1.4 },
      },
      {
        id: "country-name",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        maxzoom: 8,
        filter: ["==", ["get", "class"], "country"],
        layout: {
          "text-field": NAME,
          "text-font": ["Noto Sans Bold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.12,
          "text-max-width": 7,
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 6, 14],
        },
        paint: { "text-color": C.inkSoft, "text-opacity": 0.75, "text-halo-color": C.halo, "text-halo-width": 1.2 },
      },
      {
        id: "city-dot",
        type: "circle",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 3,
        filter: ["==", ["get", "class"], "city"],
        paint: {
          "circle-radius": ["case", ["==", ["get", "capital"], 2], 3.2, 2.4],
          "circle-color": C.ink,
          "circle-stroke-color": C.cityRing,
          "circle-stroke-width": 1.2,
        },
      },
      {
        id: "city-name",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 3,
        filter: ["==", ["get", "class"], "city"],
        layout: {
          "text-field": NAME,
          "text-font": ["case", ["==", ["get", "capital"], 2], ["literal", ["Noto Sans Bold"]], ["literal", ["Noto Sans Regular"]]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 8, 14],
          "text-anchor": "left",
          "text-offset": [0.6, 0],
          "text-max-width": 8,
          "symbol-sort-key": ["get", "rank"],
        },
        paint: { "text-color": C.ink, "text-halo-color": C.halo, "text-halo-width": 1.3 },
      },
      {
        id: "town-name",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 7,
        filter: ["==", ["get", "class"], "town"],
        layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"], "text-size": 11, "text-max-width": 8 },
        paint: { "text-color": C.inkSoft, "text-halo-color": C.halo, "text-halo-width": 1.2 },
      },
    ],
  };
}

/** Every paint colour that differs between the palettes, as [layer, property, value],
 *  so a live map can switch theme in place (no style reload, no tile refetch). Covers
 *  the base map above and RouteMap's own layers. */
export function themePaint(theme: MapTheme): [string, string, unknown][] {
  const C = MAP_PALETTES[theme];
  const labels: [string, string, unknown][] = ["water-name-line", "water-name-point"].flatMap((id): [string, string, unknown][] => [
    [id, "text-color", C.waterLabel],
    [id, "text-halo-color", C.halo],
  ]);
  return [
    ["background", "background-color", C.land],
    ["landcover-ice", "fill-color", C.ice],
    ["waterway-river", "line-color", C.river],
    ["water", "fill-color", C.sea],
    ["coastline", "line-color", C.coast],
    ["boundary-country", "line-color", C.border],
    ...labels,
    ["country-name", "text-color", C.inkSoft],
    ["country-name", "text-halo-color", C.halo],
    ["city-dot", "circle-color", C.ink],
    ["city-dot", "circle-stroke-color", C.cityRing],
    ["city-name", "text-color", C.ink],
    ["city-name", "text-halo-color", C.halo],
    ["town-name", "text-color", C.inkSoft],
    ["town-name", "text-halo-color", C.halo],
    ["route-glow", "line-color", C.route],
    ["route", "line-color", C.route],
    ["head-glow", "circle-color", C.coral],
    ["head", "circle-color", C.coral],
    ["option-labels", "text-color", ["case", ["get", "answer"], C.route, C.optionText]],
    ["option-labels", "text-halo-color", C.optionHalo],
  ];
}
