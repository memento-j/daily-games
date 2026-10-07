"""Downstream puzzle pipeline.

Traces where a raindrop landing at a pin ends up: snap the pin to the nearest
river segment, follow HydroRIVERS' NEXT_DOWN pointers to the mouth, then name
the sea at the mouth using the IHO Sea Areas polygons.

Usage (from the repo root):
    python scripts/downstream/generate.py prepare          # one-off: build fast caches
    python scripts/downstream/generate.py validate         # trace the known test pins
    python scripts/downstream/generate.py trace LON LAT    # trace a single pin
    python scripts/downstream/generate.py generate         # add the next 10 daily puzzles

Build order step 1: batch generation of daily puzzle files comes after the
validation pins all trace correctly.
"""

# How it works, start to finish
# -----------------------------
# Files:
#   generate.py  this file: the main flow (prepare, trace_drop, generate, validate, CLI)
#   config.py    every path and tunable setting
#   rivers.py    Rivers: load HydroRIVERS, snap a pin, trace NEXT_DOWN
#   seas.py      Seas: name the sea at a point, rank seas by distance; display names
#   geo.py       haversine_km distance helper
#
# Folders (next to this file; gitignored):
#   HydroRIVERS_v10_shp/  raw river network: 8.5M river segments, each with HYRIV_ID,
#                         NEXT_DOWN (the segment it flows into; 0 = river ends here),
#                         ENDORHEIC (1 = basin drains inland) and a line shape.
#   IHO_seas/iho.json     raw sea areas: 101 named polygons ("Gulf of Mexico", ...).
#                         No rivers, just a labelled map of the seas.
#   cache/                the same two datasets converted to GeoParquet by `prepare`
#                         (loads in ~1 s instead of ~1 min).
#   out/                  GeoJSON previews written by `validate` / `trace`, to inspect
#                         by eye at geojson.io. Not used by the game.
#
# Per pin (trace_drop):
#   1. SNAP    Rivers.snap: the pin rarely sits exactly on a river, so find the
#              nearest segment. Each segment's bounding box is cached, so we only
#              measure exact distances to segments whose box is near the pin.
#   2. TRACE   Rivers.trace: follow NEXT_DOWN from segment to segment until it is 0.
#              Every segment points to exactly one next segment, so no pathfinding.
#   3. STITCH  Join the segments' line shapes into one route: pin -> river mouth.
#   4. NAME    Seas.name_at on the route's last point (the river mouth, on the coast):
#              a. STRtree query: is the mouth inside a sea polygon? -> that name, 0 km.
#              b. Otherwise the nearest polygon (distance to its outline) -> name + km.
#                 HydroRIVERS and IHO drew the coastline separately, so a mouth often
#                 lands slightly short of the polygon edge (0-15 km in tests).
#   5. FILTER  Reject the drop if HydroRIVERS flags it ENDORHEIC, or if the nearest sea
#              is more than MOUTH_MAX_SEA_KM away: the river ended somewhere that is not
#              a sea (the Volga ends in the Caspian, which has no IHO polygon).
#   6. EXTRAS  Route distance, the sea nearest the *pin* (if it differs from the
#              answer, the drop is surprising = harder), and a simplified route.
#
# The STRtree is only a fast lookup: it skips seas whose bounding rectangle can't
# match. The geometry itself (point-in-polygon, distance to edges) is Shapely's.
# Distances are in degrees, converted to km with ~111.32 km/degree (approximate,
# fine for the 50 km cutoff).

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass

import geopandas as gpd
import numpy as np
import pyogrio
import shapely
from shapely.geometry import LineString
from shapely.ops import substring

from config import (
    CACHE_DIR, COORD_DECIMALS, DAY_DIFFICULTIES, DEFAULT_DAYS, HARD_DIFFICULTY, HARD_RIVER_REUSE_DAYS,
    MIN_PIN_SEPARATION_KM, MIN_ROUTE_KM, MOUTH_MAX_SEA_KM, OUT_DIR, POOL_PER_SLOT, PUZZLE_DIR,
    RIVER_COLUMNS, RIVER_REUSE_DAYS, RIVERS_PARQUET, RIVERS_SHP, SAME_RIVER_MIN_KM, SCREEN_LIMIT,
    SEAS_PARQUET, SEAS_SRC, SIMPLIFY_DEG, STAGE_FRACTIONS,
)
from geo import haversine_km
from rivers import Rivers
from seas import Seas, display_name


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
# Tracing a drop
# --------------------------------------------------------------------------- #

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
    # 1. SNAP the pin to the nearest river segment.
    row, snap_km, fraction = rivers.snap(lon, lat)
    # 2. TRACE NEXT_DOWN to the mouth.
    rows = rivers.trace(row)
    geoms = rivers.geoms(rows)

    # 3. STITCH the segments into one route. First segment: only the part
    # downstream of the snap point.
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

    # 4. NAME the sea at the mouth (the route's last point), and
    # 5. FILTER drops that never reach a sea.
    mouth_row = rows[-1]
    endorheic = bool(rivers.endorheic[mouth_row])
    mouth_lon, mouth_lat = coords[-1]
    answer, mouth_sea_km = (None, None) if endorheic else seas.name_at(mouth_lon, mouth_lat)
    inland = mouth_sea_km is not None and mouth_sea_km > MOUTH_MAX_SEA_KM
    if inland:
        answer = None
    # 6. EXTRAS: the sea a player would naively guess from the pin, for difficulty.
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
# Puzzle generation: writes public/data/downstream/NNNN.json
# --------------------------------------------------------------------------- #
#
# 1. Read the existing puzzle files: last puzzle number, pins already used, and the
#    river systems used recently (found by re-snapping recent pins).
# 2. SCREEN random river segments into a pool of candidates. This is cheap: walk the
#    next_row array to the mouth and name its sea, without stitching the route.
#    Each candidate gets a difficulty from where the answer ranks among the seas
#    nearest the pin.
# 3. For each new day, PICK one candidate per target difficulty, respecting the
#    variety rules, then fully trace the chosen five and write the file.
#
# All tunable settings live in config.py; sea display names in seas.py.


def difficulty_from_rank(rank: int) -> int:
    """rank = position of the answer among the seas nearest the pin (0 = nearest)."""
    return {0: 1, 1: 2, 2: 3, 3: 4, 4: 4}.get(rank, 5)


def with_article(sea: str) -> str:
    # "the Atlantic Ocean", "the Bay of Bengal", but "Hudson Bay"
    return sea if sea.endswith(" Bay") else f"the {sea}"


@dataclass
class Candidate:
    row: int  # river segment the pin sits on
    pin: tuple[float, float]
    main_riv: int  # river system ID (same for every segment in one basin)
    answer: str  # display name
    nearby: list[str]  # display names, nearest to the pin first
    difficulty: int


def screen(rivers: Rivers, seas: Seas, row: int, rng: np.random.Generator) -> Candidate | None:
    """Cheap check of one river segment as a puzzle pin. None = unusable."""
    point = rivers.geoms([row])[0].interpolate(rng.random(), normalized=True)
    lon, lat = round(point.x, COORD_DECIMALS), round(point.y, COORD_DECIMALS)
    mouth_row = rivers.trace(row)[-1]
    mouth_lon, mouth_lat = shapely.get_coordinates(rivers.geoms([mouth_row])[0])[-1]
    iho, km = seas.name_at(mouth_lon, mouth_lat)
    if km > MOUTH_MAX_SEA_KM:
        return None
    answer = display_name(iho)
    nearby = seas.ranked(lon, lat)
    return Candidate(row, (lon, lat), int(rivers.main_riv[row]), answer, nearby,
                     difficulty_from_rank(nearby.index(answer)))


def build_drop(rivers: Rivers, seas: Seas, c: Candidate, rng: np.random.Generator) -> dict | None:
    """Full trace of a chosen candidate into the puzzle-file format."""
    drop = trace_drop(rivers, seas, *c.pin)
    if drop.answer is None or display_name(drop.answer) != c.answer:
        return None  # re-snapping the rounded pin landed in another basin; skip it
    distance = round(drop.distance_km)
    options = [c.answer] + [s for s in c.nearby if s != c.answer][:3]
    rng.shuffle(options)
    return {
        "pin": list(c.pin),
        "answer": c.answer,
        "options": options,
        "distanceKm": distance,
        "route": drop.route_coords(),
        "stages": [round(distance * f) for f in STAGE_FRACTIONS],
        "fact": f"This drop travels {distance:,} km and ends up in {with_article(c.answer)}.",
        "difficulty": c.difficulty,
    }


def km_between(a: tuple[float, float], b: tuple[float, float]) -> float:
    return haversine_km(np.array([a, b]))


def river_allowed(c: Candidate, recent: list[list[tuple[int, tuple]]]) -> bool:
    """River reuse rule. recent = per day, oldest first: [(river system, pin), ...]."""
    window = recent[-RIVER_REUSE_DAYS:]
    for days_ago, day in enumerate(reversed(window), start=1):
        for river, pin in day:
            if river != c.main_riv:
                continue
            if c.difficulty < HARD_DIFFICULTY or days_ago <= HARD_RIVER_REUSE_DAYS:
                return False
            if km_between(c.pin, pin) < SAME_RIVER_MIN_KM:
                return False
    return True


def read_existing(rivers: Rivers) -> tuple[int, set, list[list[tuple[int, tuple]]]]:
    """(last puzzle number, all pins used, [(river system, pin), ...] per recent day)."""
    files = sorted(PUZZLE_DIR.glob("[0-9][0-9][0-9][0-9].json"))
    pins, recent = set(), []
    for f in files:
        pins |= {tuple(d["pin"]) for d in json.loads(f.read_text(encoding="utf-8"))["drops"]}
    for f in files[-RIVER_REUSE_DAYS:]:
        drops = json.loads(f.read_text(encoding="utf-8"))["drops"]
        recent.append([(int(rivers.main_riv[rivers.snap(*d["pin"])[0]]), tuple(d["pin"])) for d in drops])
    last = int(files[-1].stem) if files else 0
    return last, pins, recent


def generate(days: int, seed: int | None) -> None:
    rivers, seas = Rivers(), Seas()
    last, used_pins, recent = read_existing(rivers)
    rng = np.random.default_rng(last if seed is None else seed)
    print(f"Existing puzzles: {last}. Generating #{last + 1}-#{last + days}.")

    # SCREEN: fill a pool of candidates per difficulty.
    eligible = np.flatnonzero((rivers.endorheic == 0) & (rivers.dist_dn_km >= MIN_ROUTE_KM))
    need = {d: DAY_DIFFICULTIES.count(d) * days * POOL_PER_SLOT for d in set(DAY_DIFFICULTIES)}
    pool: dict[int, list[Candidate]] = {d: [] for d in range(1, 6)}
    # Big basins (Amazon, Mississippi...) cover many segments, so random picks keep
    # landing in them. Easy drops: keep one candidate per river system per difficulty,
    # or the pool fills with duplicates the reuse rule throws away. Hard drops may reuse
    # a river, so keep several per river as long as their pins are far apart.
    pooled: dict[tuple[int, int], list[tuple]] = {}  # (difficulty, river) -> pins
    t, screened = time.time(), 0
    while screened < SCREEN_LIMIT and any(len(pool[d]) < n for d, n in need.items()):
        screened += 1
        c = screen(rivers, seas, int(rng.choice(eligible)), rng)
        if not c or c.pin in used_pins:
            continue
        same_river = pooled.setdefault((c.difficulty, c.main_riv), [])
        if same_river and (c.difficulty < HARD_DIFFICULTY
                           or any(km_between(c.pin, p) < SAME_RIVER_MIN_KM for p in same_river)):
            continue
        same_river.append(c.pin)
        pool[c.difficulty].append(c)
        if screened % 500 == 0:
            print(f"  screened {screened:,} ({time.time() - t:.0f}s), pool: "
                  + ", ".join(f"{d}: {len(pool[d])}/{need.get(d, 0)}" for d in pool), flush=True)
    print(f"Screened {screened:,} segments in {time.time() - t:.0f}s. "
          f"Pool by difficulty: {', '.join(f'{d}: {len(p)}' for d, p in pool.items())}")

    # PICK: one candidate per target difficulty, nearest available difficulty if empty.
    PUZZLE_DIR.mkdir(parents=True, exist_ok=True)
    for puzzle in range(last + 1, last + days + 1):
        drops, chosen = [], []
        for target in DAY_DIFFICULTIES:
            for d in sorted(pool, key=lambda d: (abs(d - target), -d)):
                for c in list(pool[d]):
                    if (not river_allowed(c, recent)
                            or any(c.main_riv == o.main_riv or c.answer == o.answer
                                   or km_between(c.pin, o.pin) < MIN_PIN_SEPARATION_KM
                                   for o in chosen)):
                        continue
                    pool[d].remove(c)
                    drop = build_drop(rivers, seas, c, rng)
                    if drop:
                        chosen.append(c)
                        drops.append(drop)
                        break
                else:
                    continue
                break
        if len(drops) < len(DAY_DIFFICULTIES):
            sys.exit(f"Ran out of candidates at puzzle #{puzzle}; raise SCREEN_LIMIT.")

        drops.sort(key=lambda d: d["difficulty"])
        out = PUZZLE_DIR / f"{puzzle:04d}.json"
        out.write_text(json.dumps({"puzzle": puzzle, "drops": drops}, separators=(",", ":"),
                                  ensure_ascii=False), encoding="utf-8")
        recent.append([(c.main_riv, c.pin) for c in chosen])
        used_pins |= {c.pin for c in chosen}
        print(f"  #{puzzle:04d} {out.stat().st_size / 1024:5.0f} KB  "
              + "  ".join(f"{d['difficulty']}:{d['answer']}" for d in drops))

    print(f"\nLast generated puzzle: #{last + days}. Files in {PUZZLE_DIR}")


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
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 ("Río" -> "R�o")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("prepare", help="convert the downloaded datasets to fast GeoParquet caches")
    sub.add_parser("validate", help="trace the known test pins and write out/validation.geojson")
    g = sub.add_parser("generate", help="write the next batch of daily puzzles to public/data/downstream/")
    g.add_argument("--days", type=int, default=DEFAULT_DAYS, help=f"puzzles to add (default {DEFAULT_DAYS})")
    g.add_argument("--seed", type=int, help="random seed (default: last puzzle number, so runs are repeatable)")
    t = sub.add_parser("trace", help="trace one pin")
    t.add_argument("lon", type=float)
    t.add_argument("lat", type=float)
    args = parser.parse_args()

    if args.cmd == "prepare":
        prepare()
    elif args.cmd == "validate":
        validate()
    elif args.cmd == "generate":
        generate(args.days, args.seed)
    else:
        trace_one(args.lon, args.lat)