"""HydroRIVERS river network: load from cache, snap a pin to a river, trace downstream."""

from __future__ import annotations

import math
import sys
import time
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
import shapely
from shapely.geometry import Point

from config import RIVER_COLUMNS, RIVERS_PARQUET, SNAP_MAX_DEG


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
        # NEXT_DOWN is an ID; resolve every one to a row index up front so tracing is
        # just array lookups. -1 = river ends here (NEXT_DOWN 0).
        order = np.argsort(self.ids)
        sorted_ids = self.ids[order]
        pos = np.minimum(np.searchsorted(sorted_ids, self.next_down), len(sorted_ids) - 1)
        found = sorted_ids[pos] == self.next_down
        dangling = int(((self.next_down != 0) & ~found).sum())
        if dangling:
            print(f"  warning: {dangling} segments point to a NEXT_DOWN that doesn't exist")
        self.next_row = np.where(found & (self.next_down != 0), order[pos], -1)
        print(f"Loaded {len(self.ids):,} river segments in {time.time() - t:.1f}s")

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
        while (row := int(self.next_row[rows[-1]])) >= 0:
            if row in seen:
                raise RuntimeError(f"Loop in river network at HYRIV_ID {self.ids[row]}")
            rows.append(row)
            seen.add(row)
        return rows
