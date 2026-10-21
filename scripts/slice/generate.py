"""Slice puzzle pipeline.

Turns a country into what a Slice round needs: its outline on an equal-area map,
scaled to a 0..1000 box, and its population as ~1-3k weighted points.

Usage (from the repo root):
    python scripts/slice/generate.py validate              # the 10 test countries, with previews
    python scripts/slice/generate.py country NAME [NAME..]  # any country, with a preview
    python scripts/slice/generate.py generate [--days N]    # add the next 10 daily puzzles
    python scripts/slice/generate.py repopulate             # turn land rounds in existing files into population rounds
"""

# How it works, start to finish
# -----------------------------
# Files:
#   generate.py    this file: build a country, validate, previews, CLI
#   config.py      every path and tunable setting
#   countries.py   load Natural Earth, keep the mainland, equal-area projection
#   population.py  mask GHSL cells inside an outline, aggregate them to points
#   cuts.py        share on one side of a line, perfect cuts, how surprising a country is
#
# Folders (next to this file; gitignored):
#   ne_10m_admin_0_countries/                  Natural Earth 1:10m countries (public domain)
#   GHS_POP_E2025_GLOBE_R2023A_54009_1000_V1_0/  GHSL population 2025, 1 km, Mollweide (CC BY 4.0)
#   out/                                       preview PNGs from `validate` / `country`
#
# Writes public/data/slice/0001.json, 0002.json, ...: one file per day, the rounds in
# play order (see games/slice/types.ts for the format).
#
# Per country (build):
#   1. OUTLINE   Natural Earth's shape, minus far-off territories and specks (mainland).
#   2. PROJECT   Lambert Azimuthal Equal-Area centred on what's left: a straight line on
#                the flat outline then splits the real area fairly.
#   3. PEOPLE    Mask GHSL in its own projection (Mollweide) with the outline; every
#                populated 1 km cell becomes [x, y, people] in the country's projection.
#   4. POINTS    Sum the cells into a quadtree (~1-3k points): small squares where people
#                crowd, big ones over empty land; each point at its people's weighted centre.
#   5. BOX       Scale outline and points to fit 0..1000 (y down, as SVG draws), then
#                simplify the outline.
#
# Per batch (generate):
#   1. Read existing puzzle files: the last number, and which countries were used lately.
#   2. Each day, draw countries from the pool (big enough, not contested, not used in
#      the last COUNTRY_REUSE_DAYS), favouring populous ones and one per continent. The
#      first WELL_KNOWN_DAYS puzzles draw only from the WELL_KNOWN list.
#   3. Build them, order them by how far people and land disagree (easiest first), and
#      give each a round from DAY_ROUNDS.

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass

import numpy as np
import rasterio
import shapely
from shapely.geometry import MultiPolygon

from config import (
    BOX, CONTESTED, COUNTRY_REUSE_DAYS, DAY_ROUNDS, DEFAULT_DAYS, DISPLAY_NAMES, OUT_DIR, OUTLINE_DECIMALS,
    OUTLINE_SIMPLIFY, POOL_MIN_KM2, POOL_MIN_PEOPLE, POPULATION_TIF, POPULATION_TOLERANCE, PUZZLE_DIR,
    VALIDATION_COUNTRIES, WELL_KNOWN, WELL_KNOWN_DAYS,
)
from countries import find, load_countries, mainland, parts
from cuts import people_share, perfect_cut, surprise
from population import aggregate, cells, people


@dataclass
class Country:
    id: str  # Natural Earth's ADMIN name, used to track reuse
    name: str
    continent: str
    outline: MultiPolygon  # box units, y down, simplified
    points: np.ndarray  # rows of [x, y, people], box units
    cells: np.ndarray  # the raw 1 km cells, box units (for checking the points)
    population: float
    land_km2: float
    grid_km: float  # the smallest quadtree square
    dropped: int
    dropped_area: float


def build(countries, src, name: str) -> Country:
    row = find(countries, name)
    m = mainland(row.ADMIN, row.geometry, lambda part: people(src, part))
    c = cells(src, m.lonlat, m.crs)
    points, grid = aggregate(c)

    # Fit the box: the longer side spans 0..BOX, the shorter is centred; y flips.
    minx, miny, maxx, maxy = m.projected.bounds
    scale = BOX / max(maxx - minx, maxy - miny)
    ox = (BOX - (maxx - minx) * scale) / 2
    oy = (BOX - (maxy - miny) * scale) / 2

    def to_box(xy: np.ndarray) -> np.ndarray:
        return np.column_stack([(xy[:, 0] - minx) * scale + ox, (maxy - xy[:, 1]) * scale + oy])

    outline = shapely.transform(m.projected, to_box)
    outline = outline.simplify(OUTLINE_SIMPLIFY, preserve_topology=True)
    outline = MultiPolygon([p for p in parts(outline) if not p.is_empty])
    outline = shapely.set_precision(outline, 10**-OUTLINE_DECIMALS)
    outline = MultiPolygon(parts(shapely.orient_polygons(outline)))
    return Country(
        id=row.ADMIN,
        name=row.NAME,
        continent=row.CONTINENT,
        outline=outline,
        points=np.column_stack([to_box(points[:, :2]), points[:, 2]]),
        cells=np.column_stack([to_box(c[:, :2]), c[:, 2]]),
        population=float(c[:, 2].sum()),
        land_km2=m.projected.area / 1e6,
        grid_km=grid / 1000,
        dropped=m.dropped,
        dropped_area=m.dropped_area,
    )


def points_error(country: Country) -> float:
    """The worst gap, over the test angles, between the people the points put beyond a
    perfect half-cut and the people the raw 1 km cells put there (percentage points)."""
    worst = 0.0
    for angle, _ in surprise(country.outline, country.points):
        o = perfect_cut(country.outline, country.points, angle, 0.5, "people")
        worst = max(worst, abs(people_share(country.cells, angle, o) - 0.5))
    return worst * 100


def preview(country: Country) -> None:
    """out/<name>.png: outline, people, and the perfect half-cuts by people (solid) and
    by area (dashed) at the angle where they differ most."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from cuts import normal

    fig, ax = plt.subplots(figsize=(8, 8))
    for p in parts(country.outline):
        ax.fill(*p.exterior.xy, facecolor="#f1ece4", zorder=1)
        ax.plot(*p.exterior.xy, color="#333", linewidth=0.6, zorder=3)
        for hole in p.interiors:
            ax.fill(*hole.xy, facecolor="white", zorder=1)
            ax.plot(*hole.xy, color="#333", linewidth=0.6, zorder=3)
    w = country.points[:, 2]
    ax.scatter(country.points[:, 0], country.points[:, 1], s=2 + 200 * w / w.max(), c="#e8505b",
               alpha=0.45, linewidths=0, zorder=2)
    angle, gap = max(surprise(country.outline, country.points), key=lambda s: s[1])
    for by, style in (("people", "-"), ("area", "--")):
        o = perfect_cut(country.outline, country.points, angle, 0.5, by)
        n = normal(angle)
        d = np.array([-n[1], n[0]]) * 1500
        a, b = n * o + d, n * o - d
        ax.plot([a[0], b[0]], [a[1], b[1]], style, color="#1d2a44", linewidth=1.6, label=f"half by {by}", zorder=4)
    ax.set_xlim(-20, BOX + 20)
    ax.set_ylim(BOX + 20, -20)  # y down, as the game draws it
    ax.set_aspect("equal")
    ax.axis("off")
    ax.legend(loc="lower left")
    ax.set_title(f"{country.name}: {country.population / 1e6:.1f}M people, {len(country.points)} points "
                 f"(squares down to {country.grid_km:.0f} km)\nangle {angle}°: an area half-cut leaves "
                 f"{50 + gap * 100:.1f}% of people on one side")
    OUT_DIR.mkdir(exist_ok=True)
    fig.savefig(OUT_DIR / f"{country.name.replace(' ', '_')}.png", dpi=110, bbox_inches="tight")
    plt.close(fig)


def report(country: Country, known: float | None) -> bool:
    s = [g for _, g in surprise(country.outline, country.points)]
    ok = True
    line = f"{country.name:<26} {country.population / 1e6:7.1f}M"
    if known:
        diff = country.population / known - 1
        ok = abs(diff) <= POPULATION_TOLERANCE
        line += f"  known {known / 1e6:6.1f}M {diff:+6.1%} {'ok  ' if ok else 'FAIL'}"
    rings = sum(1 + len(p.interiors) for p in parts(country.outline))
    verts = sum(len(p.exterior.coords) + sum(len(h.coords) for h in p.interiors) for p in parts(country.outline))
    line += (f"  {len(country.points):5d} pts >={country.grid_km:4.1f} km  points err {points_error(country):.2f}pp"
             f"  surprise avg {np.mean(s) * 100:4.1f} max {max(s) * 100:4.1f}pp"
             f"  {rings} rings/{verts} verts  dropped {country.dropped} parts ({country.dropped_area:.1%} area)")
    print(line, flush=True)
    return ok


def run(names: list[str], known: dict[str, float]) -> None:
    countries = load_countries()
    failed = 0
    with rasterio.open(POPULATION_TIF) as src:
        for name in names:
            t = time.time()
            country = build(countries, src, name)
            failed += not report(country, known.get(name))
            preview(country)
            print(f"{'':26} {time.time() - t:.0f} s, preview in {OUT_DIR.name}/", flush=True)
    if known:
        print(f"\n{len(names) - failed}/{len(names)} within {POPULATION_TOLERANCE:.0%} of the known population")


def display_name(country: Country) -> str:
    return DISPLAY_NAMES.get(country.name, country.name)


def possessive(name: str) -> str:
    return f"{name}'" if name.endswith("s") else f"{name}'s"


def fact(country: Country) -> str:
    """'Half of Egypt's population lives on just 1.2% of its land.' From the 1 km cells:
    the most crowded cells, added up until they hold half the people (each cell is 1 km2)."""
    w = np.sort(country.cells[:, 2])[::-1]
    cells_for_half = int(np.searchsorted(np.cumsum(w), w.sum() / 2)) + 1
    pct = 100 * cells_for_half / country.land_km2
    shown = f"{pct:.1f}" if pct < 10 else f"{pct:.0f}"
    amount = f"just {shown}%" if shown != "0.0" else "less than 0.1%"
    return f"Half of {possessive(display_name(country))} population lives on {amount} of its land."


def round_json(country: Country, mode: str, target: float) -> dict:
    rings = []
    for p in parts(country.outline):
        for ring in [p.exterior, *p.interiors]:
            rings.append([[round(x, OUTLINE_DECIMALS), round(y, OUTLINE_DECIMALS)] for x, y in ring.coords[:-1]])
    out = {
        "id": country.id,
        "country": display_name(country),
        "mode": mode,
        "target": round(target, 6),
        "outline": rings,
        "population": int(round(country.population, -3)),
        "fact": fact(country),
    }
    if mode == "population":
        out["points"] = [[int(round(x)), int(round(y)), int(round(w))] for x, y, w in country.points if round(w) > 0]
    return out


def pool(countries) -> list:
    """Every country that can be a puzzle (see POOL_* and CONTESTED in config.py)."""
    km2 = countries.to_crs("ESRI:54009").area / 1e6
    ok = (km2 >= POOL_MIN_KM2) & (countries.POP_EST >= POOL_MIN_PEOPLE) & ~countries.ADMIN.isin(CONTESTED)
    return list(countries[ok].itertuples())


def read_existing() -> tuple[int, dict[str, int]]:
    """The last puzzle number, and the last day each country was used."""
    last, used = 0, {}
    for f in sorted(PUZZLE_DIR.glob("[0-9][0-9][0-9][0-9].json")):
        puzzle = json.loads(f.read_text(encoding="utf-8"))
        last = max(last, puzzle["puzzle"])
        for r in puzzle["rounds"]:
            used[r["id"]] = puzzle["puzzle"]
    return last, used


def pick_day(candidates: list, used: dict[str, int], day: int, rng: np.random.Generator) -> list:
    """Draw len(DAY_ROUNDS) countries, populous ones more often, one per continent where
    the pool allows."""
    if day <= WELL_KNOWN_DAYS:
        candidates = [c for c in candidates if c.ADMIN in WELL_KNOWN]
    fresh = [c for c in candidates if day - used.get(c.ADMIN, -10**6) > COUNTRY_REUSE_DAYS]
    if len(fresh) < len(DAY_ROUNDS):
        raise SystemExit(f"Day {day}: only {len(fresh)} countries unused in {COUNTRY_REUSE_DAYS} days; lower "
                         "COUNTRY_REUSE_DAYS or widen the pool")
    weight = np.sqrt([c.POP_EST for c in fresh])
    order = rng.choice(len(fresh), size=len(fresh), replace=False, p=weight / weight.sum())
    chosen, continents = [], set()
    for i in order:  # first pass: one per continent
        if fresh[i].CONTINENT not in continents:
            chosen.append(fresh[i])
            continents.add(fresh[i].CONTINENT)
        if len(chosen) == len(DAY_ROUNDS):
            return chosen
    for i in order:  # not enough continents left: fill up
        if fresh[i] not in chosen:
            chosen.append(fresh[i])
        if len(chosen) == len(DAY_ROUNDS):
            break
    return chosen


def generate(days: int, seed: int | None) -> None:
    countries = load_countries()
    candidates = pool(countries)
    unknown = WELL_KNOWN - {c.ADMIN for c in candidates}
    if unknown:  # a typo, or a country that left the pool, would silently shrink the list
        raise SystemExit(f"WELL_KNOWN names not in the pool: {sorted(unknown)}")
    last, used = read_existing()
    rng = np.random.default_rng(last if seed is None else seed)
    PUZZLE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"{len(candidates)} countries in the pool; continuing after #{last}")
    with rasterio.open(POPULATION_TIF) as src:
        for day in range(last + 1, last + days + 1):
            picked = [build(countries, src, c.ADMIN) for c in pick_day(candidates, used, day, rng)]
            # Easiest first: how far an area half-cut misses half the people, on average.
            picked.sort(key=lambda c: np.mean([g for _, g in surprise(c.outline, c.points)]))
            rounds = []
            for country, (mode, target) in zip(picked, DAY_ROUNDS):
                if target == 0.1 and rng.random() < 0.5:
                    target = 0.9  # the same cut from the other side, worded the other way
                rounds.append(round_json(country, mode, target))
                used[country.id] = day
            path = PUZZLE_DIR / f"{day:04d}.json"
            path.write_text(json.dumps({"puzzle": day, "rounds": rounds}, ensure_ascii=False, separators=(",", ":")),
                            encoding="utf-8")
            summary = ", ".join(f"{r['country']} ({r['mode']} {r['target']:.2f})" for r in rounds)
            print(f"#{day:04d} {path.stat().st_size // 1024:4d} KB  {summary}", flush=True)


def repopulate() -> None:
    """Rewrites every land (area) round in the existing puzzle files as a half-the-
    population round of the same country. Everything else in the files is untouched."""
    countries = load_countries()
    with rasterio.open(POPULATION_TIF) as src:
        for path in sorted(PUZZLE_DIR.glob("[0-9][0-9][0-9][0-9].json")):
            puzzle = json.loads(path.read_text(encoding="utf-8"))
            changed = []
            for i, r in enumerate(puzzle["rounds"]):
                if r["mode"] != "area":
                    continue
                puzzle["rounds"][i] = round_json(build(countries, src, r["id"]), "population", 1 / 2)
                changed.append(r["country"])
            if changed:
                path.write_text(json.dumps(puzzle, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
                print(f"#{puzzle['puzzle']:04d} {path.stat().st_size // 1024:4d} KB  {', '.join(changed)} -> half the population",
                      flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate", help="build the 10 test countries, check populations, write previews")
    c = sub.add_parser("country", help="build countries by name and write previews")
    c.add_argument("names", nargs="+")
    g = sub.add_parser("generate", help="write the next batch of daily puzzles to public/data/slice/")
    g.add_argument("--days", type=int, default=DEFAULT_DAYS)
    g.add_argument("--seed", type=int, default=None, help="default: the last puzzle number (repeatable runs)")
    sub.add_parser("repopulate", help="turn the land rounds of existing puzzles into half-the-population rounds")
    args = parser.parse_args()
    if args.cmd == "validate":
        run(list(VALIDATION_COUNTRIES), VALIDATION_COUNTRIES)
    elif args.cmd == "generate":
        generate(args.days, args.seed)
    elif args.cmd == "repopulate":
        repopulate()
    else:
        run(args.names, {})


if __name__ == "__main__":
    main()
