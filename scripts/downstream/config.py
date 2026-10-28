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
DAY_DIFFICULTIES = [1, 2, 3, 4, 5]  # one drop per difficulty; the day's play order is then shuffled
MIN_ROUTE_KM = 150  # shorter routes are boring ("3 km creek into the sea")
RIVER_REUSE_DAYS = 30  # don't reuse a river system within this many days...
# ...except for hard drops. Surprising drops come from a handful of huge basins (Amazon,
# Mississippi, Nile...), too few for one-per-month. A hard drop may reuse a river after
# HARD_RIVER_REUSE_DAYS if its pin is SAME_RIVER_MIN_KM from that river's recent pins.
HARD_DIFFICULTY = 4  # difficulties >= this count as hard
HARD_RIVER_REUSE_DAYS = 7
SAME_RIVER_MIN_KM = 500
MIN_PIN_SEPARATION_KM = 1000  # spread each day's pins across regions
# Reveal pauses, as fractions of the route. Evenly spaced so each stop visibly
# changes the odds: 15/40/70% made stop 1 a near-invisible squiggle and stop 3 a
# giveaway (critique, 2026-10-17). Settle after the playtest; `generate.py restage`
# applies a change to existing puzzles.
STAGE_FRACTIONS = [0.25, 0.50, 0.75]
# Screen until each difficulty has this many candidates per drop needed, or until
# SCREEN_LIMIT. Hard buckets rarely fill, so runs usually stop at the limit (~7 min);
# each day then gets the hardest drops available (difficulty is relative per day).
# 15,000 since 2026-10-23: at 5,000 a 21-day batch ran out of hard drops and five days
# had nothing harder than difficulty 2.
POOL_PER_SLOT = 6  # 2 until 2026-10-28; more choice now that days also cap unfamiliar seas
SCREEN_LIMIT = 15_000

# Seas most players can name and place (developer's call, 2026-10-28). How hard a day
# feels follows how many unfamiliar names it asks about more than its difficulty
# ratings: #5-#8 rated easier than #1-#4 but had 8-9 unfamiliar names among their 20
# options (Kara, Laptev, Makassar...) against 2-7, and scores and finishes dropped.
# Player-facing names, as DISPLAY_NAMES in seas.py gives them.
FAMILIAR_SEAS = {
    "Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean", "Southern Ocean",
    "Mediterranean Sea", "Caribbean Sea", "Gulf of Mexico", "Black Sea", "Red Sea", "North Sea",
    "Baltic Sea", "Persian Gulf", "Arabian Sea", "Bay of Bengal", "South China Sea",
    "East China Sea", "Yellow Sea", "Sea of Japan", "Hudson Bay", "Gulf of Alaska", "Bering Sea",
    "Gulf of California", "Gulf of St. Lawrence", "Coral Sea", "Tasman Sea", "Adriatic Sea",
    "Aegean Sea", "English Channel", "Irish Sea", "Bay of Biscay", "Gulf of Guinea",
}
# Per day: at most this many answers outside FAMILIAR_SEAS (the hard drop can be one)...
MAX_UNFAMILIAR_ANSWERS = 1
# ...and at most this many unfamiliar names among all the day's options (5 drops x 4).
MAX_UNFAMILIAR_OPTIONS = 5
