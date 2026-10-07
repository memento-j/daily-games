"""Downstream puzzle pipeline.

Traces where a raindrop landing at a pin ends up: snap the pin to the nearest
river segment, follow HydroRIVERS' NEXT_DOWN pointers to the mouth, then name
the sea at the mouth using the IHO Sea Areas polygons.

Usage (from the repo root):
    python scripts/downstream/generate.py prepare          # one-off: build fast caches
    python scripts/downstream/generate.py validate         # trace the known test pins
    python scripts/downstream/generate.py trace LON LAT    # trace a single pin

Build order step 1: batch generation of daily puzzle files comes after the
validation pins all trace correctly.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import geopandas as gpd
import numpy as np
import pyarrow.parquet as pq
import pyogrio
import shapely
from shapely.geometry import LineString, Point
from shapely.ops import substring

HERE = Path(__file__).resolve().parent
RIVERS_SHP = HERE / "HydroRIVERS_v10_shp" / "HydroRIVERS_v10.shp"
SEAS_SRC = HERE / "IHO_seas" / "iho.json"
CACHE_DIR = HERE / "cache"
RIVERS_PARQUET = CACHE_DIR / "hydrorivers.parquet"
SEAS_PARQUET = CACHE_DIR / "iho_seas.parquet"
OUT_DIR = HERE / "out"

RIVER_COLUMNS = ["HYRIV_ID", "NEXT_DOWN", "MAIN_RIV", "LENGTH_KM", "DIST_DN_KM", "ENDORHEIC"]

EARTH_RADIUS_KM = 6371.0
SNAP_MAX_DEG = 1.0  # give up snapping if no river within ~100 km
# Real mouths sit within ~15 km of an IHO sea polygon. Further than this means the
# river ends inland in a lake HydroSHEDS treats as ocean (e.g. the Caspian Sea).
MOUTH_MAX_SEA_KM = 50
SIMPLIFY_DEG = 0.005  # ~500 m; invisible at the zoom levels the game uses
COORD_DECIMALS = 4  # ~11 m


# --------------------------------------------------------------------------- #
# Caches: the shapefile takes minutes to read, GeoParquet takes seconds.
# --------------------------------------------------------------------------- #

def prepare() -> None:
    CACHE_DIR.mkdir(exist_ok=True)

    t = time.time()
    print(f"Reading {RIVERS_SHP.name} (8.5M segments, a few minutes)...")
    rivers = pyogrio.read_dataframe(RIVERS_SHP, columns=RIVER_COLUMNS, use_arrow=True)
    print(f"  read {len(rivers):,} segments in {time.time() - t:.0f}s, writing GeoParquet...")
    # The bbox column lets us find snap candidates without decoding every geometry.
    rivers.to_parquet(RIVERS_PARQUET, write_covering_bbox=True)
    del rivers

    t = time.time()
    print(f"Reading {SEAS_SRC.name}...")
    seas = gpd.read_file(SEAS_SRC)[["name", "mrgid", "geometry"]]
    seas.to_parquet(SEAS_PARQUET)
    print(f"  {len(seas)} seas in {time.time() - t:.0f}s")
    print(f"Caches written to {CACHE_DIR}")


# --------------------------------------------------------------------------- #
# River network
# --------------------------------------------------------------------------- #

class Rivers:
    """HydroRIVERS as flat numpy arrays; geometries decoded only on demand."""

    def __init__(self, path: Path = RIVERS_PARQUET):
        if not path.exists():
            sys.exit(f"Missing {path}. Run `prepare` first.")
        t = time.time()
        table = pq.read_table(path, columns=RIVER_COLUMNS + ["bbox", "geometry"])
        self.ids = table["HYRIV_ID"].to_numpy()
        self.next_down = table["NEXT_DOWN"].to_numpy()
        self.main_riv = table["MAIN_RIV"].to_numpy()
        self.dist_dn_km = table["DIST_DN_KM"].to_numpy()
        self.endorheic = table["ENDORHEIC"].to_numpy()
        bbox = table["bbox"].combine_chunks()
        self.xmin = bbox.field("xmin").to_numpy()
        self.ymin = bbox.field("ymin").to_numpy()
        self.xmax = bbox.field("xmax").to_numpy()
        self.ymax = bbox.field("ymax").to_numpy()
        self._wkb = table["geometry"].combine_chunks()
        # HYRIV_ID -> row index
        self._order = np.argsort(self.ids)
        self._sorted_ids = self.ids[self._order]
        print(f"Loaded {len(self.ids):,} river segments in {time.time() - t:.1f}s")

    def row_of(self, hyriv_id: int) -> int:
        # Match the array dtype, or numpy converts all 8.5M ids on every call.
        i = np.searchsorted(self._sorted_ids, self._sorted_ids.dtype.type(hyriv_id))
        if i >= len(self._sorted_ids) or self._sorted_ids[i] != hyriv_id:
            raise KeyError(hyriv_id)
        return int(self._order[i])

    def geoms(self, rows) -> np.ndarray:
        return shapely.from_wkb(self._wkb.take(np.asarray(rows)).to_numpy(zero_copy_only=False))

    def snap(self, lon: float, lat: float) -> tuple[int, float, float]:
        """Nearest segment to the pin. Returns (row, distance_km, fraction along segment).

        Distances use an equirectangular approximation (longitude scaled by
        cos(lat)), plenty accurate over the few km a snap covers.
        """
        kx = math.cos(math.radians(lat))
        pin = Point(lon * kx, lat)
        radius = 0.05
        while radius <= SNAP_MAX_DEG:
            rows = np.flatnonzero(
                (self.xmax >= lon - radius / kx) & (self.xmin <= lon + radius / kx)
                & (self.ymax >= lat - radius) & (self.ymin <= lat + radius)
            )
            if len(rows):
                scaled = shapely.transform(self.geoms(rows), lambda c: c * [kx, 1.0])
                dists = shapely.distance(scaled, pin)
                best = int(np.argmin(dists))
                # Only trust the hit if nothing outside the box could be closer.
                if dists[best] <= radius:
                    fraction = scaled[best].project(pin, normalized=True)
                    return int(rows[best]), float(dists[best]) * 111.32, float(fraction)
            radius *= 2
        raise ValueError(f"No river within {SNAP_MAX_DEG} degrees of ({lon}, {lat})")

    def trace(self, start_row: int) -> list[int]:
        """Rows from start_row to the mouth, following NEXT_DOWN until 0."""
        rows, seen = [start_row], {start_row}
        while (nxt := int(self.next_down[rows[-1]])) != 0:
            row = self.row_of(nxt)
            if row in seen:
                raise RuntimeError(f"Loop in river network at HYRIV_ID {nxt}")
            rows.append(row)
            seen.add(row)
        return rows


# --------------------------------------------------------------------------- #
# Seas
# --------------------------------------------------------------------------- #

class Seas:
    def __init__(self, path: Path = SEAS_PARQUET):
        if not path.exists():
            sys.exit(f"Missing {path}. Run `prepare` first.")
        self.gdf = gpd.read_parquet(path)
        self.names = self.gdf["name"].to_numpy()
        self.tree = shapely.STRtree(self.gdf.geometry.to_numpy())

    def name_at(self, lon: float, lat: float) -> tuple[str, float]:
        """Sea containing the point, else the nearest one. Returns (name, approx km away).

        River mouths often sit on the coastline, just outside the sea polygon,
        hence the nearest-sea fallback.
        """
        pt = Point(lon, lat)
        hits = self.tree.query(pt, predicate="intersects")
        if len(hits):
            return str(self.names[hits[0]]), 0.0
        i = int(self.tree.nearest(pt))
        return str(self.names[i]), float(self.tree.geometries[i].distance(pt)) * 111.32


# --------------------------------------------------------------------------- #
# Tracing a drop
# --------------------------------------------------------------------------- #

def haversine_km(coords: np.ndarray) -> float:
    lon, lat = np.radians(coords[:, 0]), np.radians(coords[:, 1])
    dlon, dlat = np.diff(lon), np.diff(lat)
    a = np.sin(dlat / 2) ** 2 + np.cos(lat[:-1]) * np.cos(lat[1:]) * np.sin(dlon / 2) ** 2
    return float(2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(a)).sum())


@dataclass
class Drop:
    pin: tuple[float, float]
    snap_km: float
    endorheic: bool
    inland: bool  # ends far from any sea, e.g. the Caspian
    route: LineString  # full resolution, pin -> mouth
    distance_km: float
    river_dist_km: float  # HydroRIVERS' own DIST_DN_KM, as a cross-check
    segments: int
    gaps: int  # segment joins where end != next start (should be 0)
    answer: str | None
    mouth_sea_km: float | None
    nearest_sea: str  # sea nearest the pin; differs from answer = surprising drop
    main_riv: int

    def route_coords(self) -> list[list[float]]:
        simple = shapely.simplify(self.route, SIMPLIFY_DEG, preserve_topology=False)
        return np.round(shapely.get_coordinates(simple), COORD_DECIMALS).tolist()


def trace_drop(rivers: Rivers, seas: Seas, lon: float, lat: float) -> Drop:
    row, snap_km, fraction = rivers.snap(lon, lat)
    rows = rivers.trace(row)
    geoms = rivers.geoms(rows)

    # First segment: only the part downstream of the snap point.
    first = substring(geoms[0], fraction, 1.0, normalized=True)
    parts = [np.array([[lon, lat]]), shapely.get_coordinates(first)]
    gaps = 0
    for g in geoms[1:]:
        c = shapely.get_coordinates(g)
        if np.allclose(parts[-1][-1], c[0], atol=1e-6):
            c = c[1:]
        else:
            gaps += 1
        parts.append(c)
    coords = np.vstack(parts)

    mouth_row = rows[-1]
    endorheic = bool(rivers.endorheic[mouth_row])
    mouth_lon, mouth_lat = coords[-1]
    answer, mouth_sea_km = (None, None) if endorheic else seas.name_at(mouth_lon, mouth_lat)
    inland = mouth_sea_km is not None and mouth_sea_km > MOUTH_MAX_SEA_KM
    if inland:
        answer = None
    nearest_sea, _ = seas.name_at(lon, lat)

    return Drop(
        pin=(lon, lat),
        snap_km=snap_km,
        endorheic=endorheic,
        inland=inland,
        route=LineString(coords),
        distance_km=haversine_km(coords),
        river_dist_km=float(rivers.dist_dn_km[row]),
        segments=len(rows),
        gaps=gaps,
        answer=answer,
        mouth_sea_km=mouth_sea_km,
        nearest_sea=nearest_sea,
        main_riv=int(rivers.main_riv[row]),
    )


# --------------------------------------------------------------------------- #
# Validation (build order step 1)
# --------------------------------------------------------------------------- #

# (label, lon, lat, acceptable answers). "endorheic" = HydroRIVERS flags the basin as
# draining inland; "inland" = mouth is far from any sea (Caspian, which HydroSHEDS calls ocean).
TEST_PINS = [
    ("Cochabamba, Bolivia (Amazon)", -66.16, -17.39, {"North Atlantic Ocean", "South Atlantic Ocean"}),
    ("Lake Itasca, Minnesota (Mississippi)", -95.21, 47.24, {"Gulf of Mexico"}),
    ("Donaueschingen, Germany (Danube)", 8.50, 47.95, {"Black Sea"}),
    ("Chur, Switzerland (Rhine)", 9.53, 46.85, {"North Sea"}),
    ("Jinja, Uganda (Nile)", 33.20, 0.44, {"Mediterranean Sea - Eastern Basin"}),
    ("Chongqing, China (Yangtze)", 106.55, 29.56, {"Eastern China Sea"}),
    ("Rishikesh, India (Ganges)", 78.27, 30.09, {"Bay of Bengal"}),
    ("Kisangani, DR Congo (Congo)", 25.19, 0.52, {"South Atlantic Ocean"}),
    ("Novosibirsk, Russia (Ob)", 82.92, 55.03, {"Kara Sea"}),
    ("Winnipeg, Canada (Red/Nelson)", -97.14, 49.90, {"Hudson Bay"}),
    ("Grand Junction, Colorado (Colorado)", -108.55, 39.06, {"Gulf of California"}),
    ("Vientiane, Laos (Mekong)", 102.60, 17.97, {"South China Sea"}),
    ("Reno, Nevada (Truckee -> Pyramid Lake)", -119.81, 39.53, {"endorheic"}),
    ("Maun, Botswana (Okavango)", 23.42, -19.98, {"endorheic"}),
    ("Moscow, Russia (Volga -> Caspian)", 37.62, 55.75, {"inland"}),
]


def result(drop: Drop) -> str:
    if drop.endorheic:
        return "endorheic"
    if drop.inland:
        return "inland"
    return drop.answer


def drop_features(label: str, drop: Drop, ok: bool | None = None) -> list[dict]:
    props = {
        "label": label,
        "answer": result(drop),
        "ok": ok,
        "distanceKm": round(drop.distance_km),
        "snapKm": round(drop.snap_km, 2),
        "nearestSea": drop.nearest_sea,
    }
    mouth = drop.route.coords[-1]
    return [
        {"type": "Feature", "properties": {**props, "stroke": "#1f6feb" if ok is not False else "#d1242f"},
         "geometry": {"type": "LineString", "coordinates": drop.route_coords()}},
        {"type": "Feature", "properties": {"label": f"{label}: pin", "marker-color": "#2da44e"},
         "geometry": {"type": "Point", "coordinates": list(drop.pin)}},
        {"type": "Feature", "properties": {"label": f"{label}: mouth", "marker-color": "#d1242f"},
         "geometry": {"type": "Point", "coordinates": [round(mouth[0], 4), round(mouth[1], 4)]}},
    ]


def validate() -> None:
    rivers, seas = Rivers(), Seas()
    features, failures = [], 0
    print(f"\n{'pin':42} {'result':34} {'km':>6} {'snap':>5} {'gaps':>4}  nearest sea to pin")
    for label, lon, lat, expected in TEST_PINS:
        try:
            drop = trace_drop(rivers, seas, lon, lat)
        except Exception as e:  # keep going so one bad pin doesn't hide the rest
            failures += 1
            print(f"{label:42} ERROR: {e}")
            continue
        got = result(drop)
        ok = got in expected
        failures += not ok
        mark = "ok  " if ok else "FAIL"
        print(f"{label:42} {mark} {got:29} {drop.distance_km:6.0f} {drop.snap_km:5.1f} {drop.gaps:4}  {drop.nearest_sea}")
        if not ok:
            print(f"{'':42}      expected {' / '.join(sorted(expected))}")
        features += drop_features(label, drop, ok)

    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / "validation.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    print(f"\n{len(TEST_PINS) - failures}/{len(TEST_PINS)} correct. Routes: {out}")
    print("Check them visually at https://geojson.io (drag the file in).")


def trace_one(lon: float, lat: float) -> None:
    rivers, seas = Rivers(), Seas()
    drop = trace_drop(rivers, seas, lon, lat)
    coords = drop.route_coords()
    print(json.dumps({
        "pin": [lon, lat],
        "answer": result(drop),
        "nearestSea": drop.nearest_sea,
        "distanceKm": round(drop.distance_km),
        "riverDistKm": round(drop.river_dist_km),
        "snapKm": round(drop.snap_km, 2),
        "mouthSeaKm": None if drop.mouth_sea_km is None else round(drop.mouth_sea_km, 1),
        "segments": drop.segments,
        "gaps": drop.gaps,
        "mainRiver": drop.main_riv,
        "routePoints": f"{len(drop.route.coords)} -> {len(coords)} after simplify",
    }, indent=2))
    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / "trace.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": drop_features(f"{lon},{lat}", drop)}))
    print(f"Route: {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("prepare", help="convert the downloaded datasets to fast GeoParquet caches")
    sub.add_parser("validate", help="trace the known test pins and write out/validation.geojson")
    t = sub.add_parser("trace", help="trace one pin")
    t.add_argument("lon", type=float)
    t.add_argument("lat", type=float)
    args = parser.parse_args()

    if args.cmd == "prepare":
        prepare()
    elif args.cmd == "validate":
        validate()
    else:
        trace_one(args.lon, args.lat)