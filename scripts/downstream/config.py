"""Paths and tunable settings for the Downstream puzzle pipeline, all in one place."""

from pathlib import Path

# --- Paths (all next to this file; only the .py files are in git) ---
HERE = Path(__file__).resolve().parent
RIVERS_SHP = HERE / "HydroRIVERS_v10_shp" / "HydroRIVERS_v10.shp"
SEAS_SRC = HERE / "IHO_seas" / "iho.json"
CACHE_DIR = HERE / "cache"
RIVERS_PARQUET = CACHE_DIR / "hydrorivers.parquet"
SEAS_PARQUET = CACHE_DIR / "iho_seas.parquet"
SEAS_SIMPLE_PARQUET = CACHE_DIR / "iho_seas_simple.parquet"  # built on first use by Seas.ranked
OUT_DIR = HERE / "out"
PUZZLE_DIR = HERE.parent.parent / "public" / "data" / "downstream"

RIVER_COLUMNS = ["HYRIV_ID", "NEXT_DOWN", "MAIN_RIV", "LENGTH_KM", "DIST_DN_KM", "ENDORHEIC"]

# --- Tracing ---
EARTH_RADIUS_KM = 6371.0
SNAP_MAX_DEG = 1.0  # give up snapping if no river within ~100 km
# Real mouths sit within ~15 km of an IHO sea polygon. Further than this means the
# river ends inland in a lake HydroSHEDS treats as ocean (e.g. the Caspian Sea).
MOUTH_MAX_SEA_KM = 50
SIMPLIFY_DEG = 0.005  # ~500 m; invisible at the zoom levels the game uses
COORD_DECIMALS = 4  # ~11 m

# --- Puzzle generation ---
DEFAULT_DAYS = 10
DAY_DIFFICULTIES = [1, 2, 3, 4, 5]  # one drop per entry, easiest first
MIN_ROUTE_KM = 150  # shorter routes are boring ("3 km creek into the sea")
RIVER_REUSE_DAYS = 30  # don't reuse a river system within this many days...
# ...except for hard drops. Surprising drops come from a handful of huge basins (Amazon,
# Mississippi, Nile...), too few for one-per-month. A hard drop may reuse a river after
# HARD_RIVER_REUSE_DAYS if its pin is SAME_RIVER_MIN_KM from that river's recent pins.
HARD_DIFFICULTY = 4  # difficulties >= this count as hard
HARD_RIVER_REUSE_DAYS = 7
SAME_RIVER_MIN_KM = 500
MIN_PIN_SEPARATION_KM = 1000  # spread each day's pins across regions
STAGE_FRACTIONS = [0.15, 0.40, 0.70]  # reveal pauses, as fractions of the route; settle after playtest
# Screen until each difficulty has this many candidates per drop needed, or until
# SCREEN_LIMIT. Hard buckets rarely fill, so runs usually stop at the limit (~2 min);
# each day then gets the hardest drops available (difficulty is relative per day).
POOL_PER_SLOT = 2
SCREEN_LIMIT = 5_000
