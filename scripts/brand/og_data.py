"""The drawings on the link-preview cards, measured from the games' real data.

Run once by make_og.py (`python scripts/brand/make_og.py data`); it needs the
pipelines' datasets on this machine. Writes scripts/brand/og_art.json (committed),
so the cards can be redrawn later without the datasets.

    og_data.py slice       Australia: outline, people columns, the perfect half cut
    og_data.py downstream  a raindrop in the Andes: route to the Atlantic, land around it

Each part runs in its own process with that pipeline's folder on the import path
(both pipelines have a config.py and a generate.py).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ART = HERE / "og_art.json"


def slice_art() -> dict:
    sys.path.insert(0, str(ROOT / "scripts" / "slice"))
    import numpy as np
    import rasterio
    import shapely
    from shapely.geometry import Polygon

    from config import POPULATION_TIF
    from countries import load_countries, parts
    from cuts import normal, people_share, perfect_cut
    from generate import build

    with rasterio.open(POPULATION_TIF) as src:
        c = build(load_countries(), src, "Australia")
    outline = c.outline.simplify(2.5, preserve_topology=True)

    # The perfect half cut by population, at an angle that cuts off the south-east
    # (y points down, so the normal (cos 40°, sin 40°) points south-east).
    angle = 40.0
    offset = perfect_cut(c.outline, c.points, angle, 0.5, "population")
    n = normal(angle)
    d = np.array([-n[1], n[0]])
    big = 1e5
    o = n * offset
    half = Polygon([o + d * big, o + d * big + n * big, o - d * big + n * big, o - d * big])
    counted = shapely.intersection(outline, half)
    other = shapely.difference(outline, half)

    def rings(geom) -> list:
        out = []
        for p in parts(geom):
            if p.area < 40:  # specks vanish at card size
                continue
            out.append([[round(x, 1), round(y, 1)] for x, y in p.exterior.coords[:-1]])
        return out

    # People as columns on a coarse grid, so the card shows a skyline rather than dust.
    cell = 22
    pts = c.points
    keys = np.floor(pts[:, :2] / cell).astype(int)
    uniq, inv = np.unique(keys, axis=0, return_inverse=True)
    inv = inv.ravel()
    w = np.bincount(inv, weights=pts[:, 2])
    x = np.bincount(inv, weights=pts[:, 0] * pts[:, 2]) / w
    y = np.bincount(inv, weights=pts[:, 1] * pts[:, 2]) / w
    cols = [[round(float(a), 1), round(float(b), 1), round(float(p / w.max()), 4),
             bool(np.array([a, b]) @ n > offset)] for a, b, p in zip(x, y, w) if p / w.max() > 0.004]

    # Where the cut crosses the country, for the dashed line.
    line = shapely.intersection(shapely.LineString([o + d * 2000, o - d * 2000]), outline.buffer(14))
    ends = np.asarray(shapely.get_coordinates(line))
    span = ends @ d
    a, b = ends[span.argmax()], ends[span.argmin()]
    return {
        "country": "Australia",
        "share": round(float(people_share(c.points, angle, offset)), 4),
        "normal": [round(float(n[0]), 5), round(float(n[1]), 5)],
        "counted": rings(counted),
        "other": rings(other),
        "columns": cols,
        "cut": [[round(float(a[0]), 1), round(float(a[1]), 1)], [round(float(b[0]), 1), round(float(b[1]), 1)]],
    }


def downstream_art() -> dict:
    sys.path.insert(0, str(ROOT / "scripts" / "downstream"))
    import geopandas as gpd
    import numpy as np
    import shapely
    from shapely.geometry import box

    from generate import trace_drop
    from rivers import Rivers
    from seas import Seas

    # A raindrop in the Peruvian Andes, ~150 km from the Pacific, that reaches the
    # Atlantic down the Amazon: Downstream's surprise in one picture.
    pin = (-75.9, -11.6)
    drop = trace_drop(Rivers(), Seas(), *pin)
    route = shapely.simplify(drop.route, 0.03)
    frame = (-84.0, -20.0, -44.0, 6.0)  # lon/lat window drawn on the card
    countries = gpd.read_file(ROOT / "scripts" / "slice" / "ne_10m_admin_0_countries" / "ne_10m_admin_0_countries.shp",
                              columns=["ADMIN"], bbox=frame)
    window = box(*frame).buffer(2)
    land = []
    for g in countries.geometry:
        g = shapely.intersection(g.simplify(0.04), window)
        for p in getattr(g, "geoms", [g]):
            if p.is_empty or p.area < 0.02:
                continue
            land.append(np.round(np.asarray(p.exterior.coords), 2).tolist())
    return {
        "pin": list(pin),
        "answer": drop.answer,
        "nearest": drop.nearest_sea,
        "km": round(drop.distance_km),
        "route": np.round(shapely.get_coordinates(route), 3).tolist(),
        "frame": list(frame),
        "land": land,
    }


def main() -> None:
    part = sys.argv[1]
    art = json.loads(ART.read_text(encoding="utf-8")) if ART.exists() else {}
    art[part] = slice_art() if part == "slice" else downstream_art()
    ART.write_text(json.dumps(art, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {part} art to {ART.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
