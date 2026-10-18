"""Population: sum GHSL's 1 km cells inside an outline and boil them down to weighted points."""

from __future__ import annotations

import numpy as np
import rasterio
import rasterio.mask
from pyproj import CRS, Transformer
from shapely.geometry import mapping

from config import MIN_SQUARE, POINTS_MAX, POINTS_MIN, POPULATION_CRS
from countries import parts, project


def cells(src: rasterio.DatasetReader, lonlat, crs: CRS) -> np.ndarray:
    """Every populated 1 km cell inside the outline, as rows of [x, y, people] in `crs`.

    The outline is masked in the raster's own projection (Mollweide), one part at a
    time so a country split by the antimeridian (Russia) reads two small windows, not
    the whole width of the world. A cell counts when the outline touches it: counting
    only cells whose centre is inside lost coastal cities where Natural Earth's coast
    is coarse (Japan and Indonesia read 3-5% low). Cells on a land border then count
    for both countries, which doesn't matter for a one-country puzzle.
    """
    to_crs = Transformer.from_crs(POPULATION_CRS, crs, always_xy=True)
    out = []
    for part in parts(project(lonlat, "EPSG:4326", POPULATION_CRS)):
        try:
            data, t = rasterio.mask.mask(src, [mapping(part)], crop=True, nodata=0, all_touched=True)
        except ValueError:  # the part is smaller than a cell or off the grid
            continue
        a = data[0]
        rows, cols = np.nonzero(a > 0)  # GHSL marks the sea with -200
        if not len(rows):
            continue
        mx = t.c + (cols + 0.5) * t.a
        my = t.f + (rows + 0.5) * t.e
        x, y = to_crs.transform(mx, my)
        out.append(np.column_stack([x, y, a[rows, cols]]))
    return np.concatenate(out) if out else np.zeros((0, 3))


def people(src: rasterio.DatasetReader, part) -> float:
    """How many people live in one lon/lat polygon."""
    try:
        data, _ = rasterio.mask.mask(src, [mapping(project(part, "EPSG:4326", POPULATION_CRS))], crop=True,
                                     nodata=0, all_touched=True)
    except ValueError:
        return 0.0
    return float(data[data > 0].sum())


def aggregate(c: np.ndarray) -> tuple[np.ndarray, float]:
    """Boil the cells down to POINTS_MIN..POINTS_MAX weighted points with a quadtree.

    A square is split in four while it holds more than `limit` people, so crowded places
    (the Nile valley, cities) get small squares and empty land big ones: a cut through
    a crowd stays accurate, where an even grid smeared the Nile across the line. Each
    point sits at the weighted centre of its people. `limit` is searched until the
    point count lands in range. Returns rows of [x, y, people] and the smallest square
    used (metres).
    """
    total = c[:, 2].sum()
    lo, hi = total / 100_000, total  # bounds on `limit`
    for _ in range(40):
        limit = np.sqrt(lo * hi)
        points, smallest = _quadtree(c, limit)
        if len(points) > POINTS_MAX:
            lo = limit
        elif len(points) < POINTS_MIN:
            hi = limit
        else:
            break
    return points, smallest


def _quadtree(c: np.ndarray, limit: float) -> tuple[np.ndarray, float]:
    origin = c[:, :2].min(axis=0)
    size = max(np.ptp(c[:, 0]), np.ptp(c[:, 1]), MIN_SQUARE) * 1.0001
    out = []
    active = c
    while len(active):
        keys = np.floor((active[:, :2] - origin) / size).astype(np.int64)
        _, inverse = np.unique(keys, axis=0, return_inverse=True)
        inverse = inverse.ravel()
        w = np.bincount(inverse, weights=active[:, 2])
        done = (w <= limit) | (size <= MIN_SQUARE)
        rows = done[inverse]
        if rows.any():
            inv = np.unique(inverse[rows], return_inverse=True)[1].ravel()
            sub = active[rows]
            wd = np.bincount(inv, weights=sub[:, 2])
            x = np.bincount(inv, weights=sub[:, 0] * sub[:, 2]) / wd
            y = np.bincount(inv, weights=sub[:, 1] * sub[:, 2]) / wd
            out.append(np.column_stack([x, y, wd]))
        active = active[~rows]
        if len(active):
            size /= 2
    return np.concatenate(out), size
