"""Country outlines: load Natural Earth, keep the mainland, project to equal-area."""

from __future__ import annotations

from dataclasses import dataclass

import geopandas as gpd
import numpy as np
import shapely
from pyproj import CRS, Geod, Transformer
from shapely.geometry import MultiPolygon, Polygon

from config import COUNTRIES_SHP, FAR_KM, MAINLAND_GAP_KM, MAINLAND_GAP_OVERRIDES, SPECK_FRACTION, SPECK_PEOPLE

GEOD = Geod(ellps="WGS84")


def load_countries() -> gpd.GeoDataFrame:
    return gpd.read_file(COUNTRIES_SHP, columns=["ADMIN", "NAME", "NAME_LONG", "CONTINENT", "POP_EST"])


def find(countries: gpd.GeoDataFrame, name: str):
    """The row for a country, matched on Natural Earth's ADMIN, NAME or NAME_LONG."""
    key = name.casefold()
    for col in ("ADMIN", "NAME", "NAME_LONG"):
        hit = countries[countries[col].str.casefold() == key]
        if len(hit):
            return hit.iloc[0]
    raise SystemExit(f"No country called {name!r} in Natural Earth")


def laea(lon: float, lat: float) -> CRS:
    """Lambert Azimuthal Equal-Area centred on a point. Areas stay true everywhere, so a
    straight cut on the flat outline splits the real land fairly; shapes are truest
    near the centre."""
    return CRS.from_proj4(f"+proj=laea +lat_0={lat:.4f} +lon_0={lon:.4f} +datum=WGS84 +units=m +no_defs")


def project(geom, src: CRS | str, dst: CRS | str):
    t = Transformer.from_crs(src, dst, always_xy=True)
    return shapely.transform(geom, lambda xy: np.column_stack(t.transform(xy[:, 0], xy[:, 1])))


def parts(geom) -> list[Polygon]:
    return list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]


@dataclass
class Mainland:
    lonlat: MultiPolygon  # the kept parts, WGS84
    crs: CRS  # LAEA centred on the kept parts
    projected: MultiPolygon  # the kept parts in that CRS, metres
    dropped: int  # how many parts were left out
    dropped_area: float  # their share of the country's area (0-1)


def mainland(name: str, geom, people) -> Mainland:
    """Keep the country's main part plus the parts within the gap of it (chained).

    Tiny parts are dropped unless people live there: `people(part)` counts them (the
    island of Montreal is 0.005% of Canada's area but holds 2 million people).
    """
    gap = MAINLAND_GAP_OVERRIDES.get(name, MAINLAND_GAP_KM) * 1000
    ps = parts(geom)
    areas = [abs(GEOD.geometry_area_perimeter(p)[0]) for p in ps]
    main = max(range(len(ps)), key=areas.__getitem__)
    c = ps[main].representative_point()
    # Drop parts on the far side of the world before projecting: LAEA tears apart near
    # the antipode (New Caledonia is nearly antipodal to France).
    near = [i for i, p in enumerate(ps) if _km(c, p.representative_point()) <= FAR_KM]
    crs = laea(c.x, c.y)
    proj = {i: project(ps[i], "EPSG:4326", crs) for i in near}
    total = sum(areas)
    tiny = [i for i in near if areas[i] < SPECK_FRACTION * total]
    crowded = set()
    if tiny:
        everyone = sum(people(ps[i]) for i in near)
        crowded = {i for i in tiny if people(ps[i]) >= SPECK_PEOPLE * everyone}
    candidates = [i for i in near if i not in tiny or i in crowded]
    keep = {main}
    grew = True
    while grew:
        grew = False
        for i in candidates:
            if i not in keep and any(proj[i].distance(proj[k]) <= gap for k in keep):
                keep.add(i)
                grew = True
    kept = sorted(keep)
    lonlat = MultiPolygon([ps[i] for i in kept])
    # Re-centre the projection on what was kept.
    centre = MultiPolygon([proj[i] for i in kept]).centroid
    lon, lat = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform(centre.x, centre.y)
    crs = laea(lon, lat)
    dropped_area = 1 - sum(areas[i] for i in kept) / total
    return Mainland(lonlat, crs, project(lonlat, "EPSG:4326", crs), len(ps) - len(kept), dropped_area)


def _km(a, b) -> float:
    return GEOD.inv(a.x, a.y, b.x, b.y)[2] / 1000
