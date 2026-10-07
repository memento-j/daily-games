"""Distance helper shared by rivers, seas and puzzle generation."""

import numpy as np

from config import EARTH_RADIUS_KM


def haversine_km(coords: np.ndarray) -> float:
    """Great-circle length in km of a line given as an (N, 2) array of [lon, lat]."""
    lon, lat = np.radians(coords[:, 0]), np.radians(coords[:, 1])
    dlon, dlat = np.diff(lon), np.diff(lat)
    a = np.sin(dlat / 2) ** 2 + np.cos(lat[:-1]) * np.cos(lat[1:]) * np.sin(dlon / 2) ** 2
    return float(2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(a)).sum())
