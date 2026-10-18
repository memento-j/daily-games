"""Straight cuts: what share falls on one side of a line, and where the perfect line is.

A line is an angle and an offset: the points p with p . (cos a, sin a) == offset. The
"cut-off" side is where p . n > offset. The game's TypeScript does the same maths
(games/slice/); this copy rates countries and draws the previews.
"""

from __future__ import annotations

import numpy as np
import shapely
from shapely.geometry import Polygon

from config import CUT_ANGLES


def normal(angle: float) -> np.ndarray:
    a = np.radians(angle)
    return np.array([np.cos(a), np.sin(a)])


def people_share(points: np.ndarray, angle: float, offset: float) -> float:
    side = points[:, :2] @ normal(angle) > offset
    return points[side, 2].sum() / points[:, 2].sum()


def area_share(outline, angle: float, offset: float) -> float:
    n = normal(angle)
    d = np.array([-n[1], n[0]])  # along the line
    big = 1e7
    o = n * offset
    half = Polygon([o + d * big, o + d * big + n * big, o - d * big + n * big, o - d * big])
    return shapely.intersection(outline, half).area / outline.area


def offset_range(xy: np.ndarray, angle: float) -> tuple[float, float]:
    p = xy @ normal(angle)
    return float(p.min()), float(p.max())


def perfect_offset(share, lo: float, hi: float, target: float) -> float:
    """Binary search for the offset that cuts off `target` (the share shrinks as the
    offset grows, from 1 at `lo` to 0 at `hi`)."""
    for _ in range(50):
        mid = (lo + hi) / 2
        if share(mid) > target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def perfect_cut(outline, points: np.ndarray | None, angle: float, target: float, by: str) -> float:
    xy = np.asarray(outline.exterior.coords if isinstance(outline, Polygon) else
                    [c for p in outline.geoms for c in p.exterior.coords])
    lo, hi = offset_range(xy, angle)
    if by == "area":
        return perfect_offset(lambda o: area_share(outline, angle, o), lo, hi, target)
    return perfect_offset(lambda o: people_share(points, angle, o), lo, hi, target)


def surprise(outline, points: np.ndarray, target: float = 0.5) -> list[tuple[int, float]]:
    """For each angle: how far the perfect AREA cut is from the target share of PEOPLE.

    Big numbers mean the people are bunched up, so a population round will surprise
    anyone who cuts by eye (Canada, Egypt); small means a population cut feels like an
    area cut (Germany).
    """
    out = []
    for angle in CUT_ANGLES:
        o = perfect_cut(outline, None, angle, target, "area")
        out.append((angle, abs(people_share(points, angle, o) - target)))
    return out
