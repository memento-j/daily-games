// Downstream's own MapLibre style: the same world as the 3D hero (pale land, soft
// blue water), with clear labels for oceans, seas and bays (italic, water-blue),
// countries and cities (ink). Vector tiles and fonts are from OpenFreeMap (free,
// no key). No elevation shading: it cost a second tile host and a heavy layer,
// and the rivers, coasts and labels carry the clues (developer's call, 2026-10-16).
//
// It replaces the stock "Liberty" style, which carried roads, POIs and busy
// colours the game doesn't need. Colours mirror the tokens in app/globals.css.

import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

const C = {
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
};

// English name where there is one, otherwise the local name.
const NAME: ExpressionSpecification = ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];

export function downstreamMapStyle(): StyleSpecification {
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
        paint: { "line-color": C.river, "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 4, 0.6, 10, 2, 16, 6] },
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
          "circle-stroke-color": "#ffffff",
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
