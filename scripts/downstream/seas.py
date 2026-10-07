"""IHO sea areas: name the sea at a point, and rank seas by distance from a point."""

from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import shapely
from shapely.geometry import Point

from config import SEAS_PARQUET, SEAS_SIMPLE_PARQUET
from geo import haversine_km

# IHO name -> name shown to players. Merges ocean halves and sub-seas players won't
# know into their parent, and cleans up dated spellings. Unlisted names are used as is.
DISPLAY_NAMES = {
    "North Atlantic Ocean": "Atlantic Ocean",
    "South Atlantic Ocean": "Atlantic Ocean",
    "North Pacific Ocean": "Pacific Ocean",
    "South Pacific Ocean": "Pacific Ocean",
    "Mediterranean Sea - Eastern Basin": "Mediterranean Sea",
    "Mediterranean Sea - Western Basin": "Mediterranean Sea",
    "Balearic (Iberian Sea)": "Mediterranean Sea",
    "Ligurian Sea": "Mediterranean Sea",
    "Tyrrhenian Sea": "Mediterranean Sea",
    "Ionian Sea": "Mediterranean Sea",
    "Alboran Sea": "Mediterranean Sea",
    "Strait of Gibraltar": "Mediterranean Sea",
    "Gulf of Bothnia": "Baltic Sea",
    "Gulf of Finland": "Baltic Sea",
    "Gulf of Riga": "Baltic Sea",
    "Kattegat": "Baltic Sea",
    "Skagerrak": "North Sea",
    "Gulf of Suez": "Red Sea",
    "Gulf of Aqaba": "Red Sea",
    "Bristol Channel": "Celtic Sea",
    "Inner Seas off the West Coast of Scotland": "Atlantic Ocean",
    "The Coastal Waters of Southeast Alaska and British Columbia": "Pacific Ocean",
    "The Northwestern Passages": "Arctic Ocean",
    "Irish Sea and St. George's Channel": "Irish Sea",
    "Eastern China Sea": "East China Sea",
    "Japan Sea": "Sea of Japan",
    "Barentsz Sea": "Barents Sea",
    "Andaman or Burma Sea": "Andaman Sea",
    "Seto Naikai or Inland Sea": "Seto Inland Sea",
    "Malacca Strait": "Strait of Malacca",
    "Molukka Sea": "Molucca Sea",
    "Gulf of Boni": "Gulf of Bone",
    "Rio de La Plata": "Río de la Plata",
}


def display_name(iho_name: str) -> str:
    return DISPLAY_NAMES.get(iho_name, iho_name)


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
        # 1. Inside a sea? hits are row numbers into self.names, e.g. [43] -> "Gulf of Mexico".
        hits = self.tree.query(pt, predicate="intersects")
        if len(hits):
            return str(self.names[hits[0]]), 0.0
        # 2. Not inside any: nearest polygon, measured to the closest spot on its outline
        #    (not just its corner points). Degrees -> km with ~111.32 km/degree.
        i = int(self.tree.nearest(pt))
        return str(self.names[i]), float(self.tree.geometries[i].distance(pt)) * 111.32

    def ranked(self, lon: float, lat: float) -> list[str]:
        """Display names of all seas, nearest to the point first (duplicates removed).

        Used for the wrong options and for difficulty. Measures to simplified
        outlines (much faster, same ranking), with the gap measured in real km
        so high-latitude longitudes aren't overstretched.
        """
        if not hasattr(self, "_simple"):
            # Simplifying 250 MB of coastline takes minutes, so do it once and cache it.
            if not SEAS_SIMPLE_PARQUET.exists():
                print("  simplifying sea outlines (one-off, a few minutes)...")
                self.gdf.assign(geometry=self.gdf.geometry.simplify(0.02)).to_parquet(SEAS_SIMPLE_PARQUET)
            self._simple = gpd.read_parquet(SEAS_SIMPLE_PARQUET).geometry.to_numpy()
        lines = shapely.shortest_line(self._simple, Point(lon, lat))
        ends = shapely.get_coordinates(lines).reshape(-1, 2, 2)
        km = [haversine_km(e) for e in ends]
        seen, names = set(), []
        for i in np.argsort(km):
            name = display_name(str(self.names[i]))
            if name not in seen:
                seen.add(name)
                names.append(name)
        return names
