"""Paths and tunable settings for the Slice puzzle pipeline, all in one place."""

from pathlib import Path

# --- Paths (all next to this file; only the .py files are in git) ---
HERE = Path(__file__).resolve().parent
COUNTRIES_SHP = HERE / "ne_10m_admin_0_countries" / "ne_10m_admin_0_countries.shp"
POPULATION_TIF = (
    HERE / "GHS_POP_E2025_GLOBE_R2023A_54009_1000_V1_0" / "GHS_POP_E2025_GLOBE_R2023A_54009_1000_V1_0.tif"
)
POPULATION_CRS = "ESRI:54009"  # GHSL's Mollweide grid: equal-area, every cell is 1 km x 1 km
OUT_DIR = HERE / "out"
PUZZLE_DIR = HERE.parent.parent / "public" / "data" / "slice"

# --- Outline ---
# Natural Earth draws a country with every territory it owns (France includes French
# Guiana and Reunion). Far-off pieces shrink the main shape and make a cut feel
# arbitrary, so only the mainland and the islands near it are kept: a part stays if it
# is within MAINLAND_GAP_KM of a part already kept (so island chains like Indonesia or
# Japan hold together). Guess-and-check these against the validation previews.
MAINLAND_GAP_KM = 400  # also drops Alaska (~800 km across Canada) and Hawaii (developer's call)
MAINLAND_GAP_OVERRIDES: dict[str, int] = {}  # per-country gap, by Natural Earth ADMIN name
FAR_KM = 8000  # parts further than this from the main part are dropped before projecting
SPECK_FRACTION = 0.0002  # parts smaller than this share of the country's area are dropped...
SPECK_PEOPLE = 0.001  # ...unless they hold at least this share of its people
BOX = 1000  # outlines and points are scaled to fit a 0..BOX square, y pointing down (SVG)
OUTLINE_SIMPLIFY = 0.8  # box units; ~0.3 px on a phone-sized board
OUTLINE_DECIMALS = 1

# --- Population points ---
# The 1 km cells are summed into a quadtree so a puzzle carries ~1-3k points: small
# squares where people crowd, big ones over empty land (population.aggregate).
POINTS_MIN = 2400
POINTS_MAX = 3000
MIN_SQUARE = 2000  # metres; squares stop splitting once they are this small

# --- Daily pool ---
# Countries whose outline is contested never become puzzles (developer's call,
# 2026-10-18). Natural Earth's default borders are de facto (Crimea in Russia, Western
# Sahara in Morocco, the Golan in Israel), and any outline we draw for these takes a
# side. Natural Earth ADMIN names.
CONTESTED = {
    "Russia", "Ukraine",  # Crimea
    "Morocco", "Western Sahara",
    "Israel", "Palestine", "Syria",  # Golan, West Bank, Gaza
    "India", "Pakistan", "China",  # Kashmir, Aksai Chin, Arunachal Pradesh
    "Taiwan",
    "Cyprus", "Northern Cyprus", "Cyprus No Mans Area",
    "Republic of Serbia", "Kosovo",
    "Somalia", "Somaliland",
    "Georgia", "Azerbaijan", "Armenia", "Moldova",  # Abkhazia, South Ossetia, Karabakh, Transnistria
    "Sudan", "South Sudan",  # Abyei, Hala'ib
}
# Egypt stays in although Natural Earth draws the Hala'ib Triangle (claimed by Sudan)
# inside it: a small corner, and the best population surprise (developer's call).

# Who can be a puzzle at all: big enough to cut by eye, and populous enough that the
# people points mean something. ~125 countries pass.
POOL_MIN_KM2 = 20_000
POOL_MIN_PEOPLE = 1_000_000
# No country twice within this many days. 4 rounds a day from ~125 countries can't
# reach the 60 days first hoped for: the pool runs dry after ~30.
COUNTRY_REUSE_DAYS = 28

# The first WELL_KNOWN_DAYS puzzles only use countries most players can picture, so
# nobody's first week is spent guessing at shapes they've never seen (developer's call,
# 2026-10-18). 36 countries: enough for 4 a day for 7 days under the 28-day reuse rule.
WELL_KNOWN_DAYS = 7
WELL_KNOWN = {
    "United States of America", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Peru", "Colombia",
    "United Kingdom", "France", "Germany", "Italy", "Spain", "Portugal", "Ireland", "Norway", "Sweden",
    "Finland", "Poland", "Greece", "Turkey", "Egypt", "South Africa", "Nigeria", "Kenya", "Ethiopia",
    "Saudi Arabia", "Iran", "Japan", "South Korea", "Thailand", "Vietnam", "Indonesia", "Philippines",
    "Australia", "New Zealand",
}

# --- Daily puzzles ---
DEFAULT_DAYS = 10
# One round per entry, in play order: (mode, share to cut off). Countries go easiest
# first: the round order follows how far people and land disagree (`cuts.surprise`).
# Every round is half the population (developer's calls, 2026-10-21: population is the
# game's hook, so the half-the-land round went; then players were confused when a day
# switched from halves to a third or a tenth, so every round became a half). The game
# still plays other targets and "area" rounds if a file has them (#1 does).
DAY_ROUNDS = [("population", 1 / 2)] * 4
# Natural Earth's short names, as a sentence says them ("Cut off a third of
# the Philippines' people").
DISPLAY_NAMES = {
    "Bosnia and Herz.": "Bosnia and Herzegovina",
    "Central African Rep.": "the Central African Republic",
    "Congo": "the Republic of the Congo",
    "Dem. Rep. Congo": "DR Congo",
    "Dominican Rep.": "the Dominican Republic",
    "Eq. Guinea": "Equatorial Guinea",
    "Netherlands": "the Netherlands",
    "Philippines": "the Philippines",
    "United Arab Emirates": "the United Arab Emirates",
    "United Kingdom": "the United Kingdom",
    "United States of America": "the United States",
}

# --- Cuts ---
CUT_ANGLES = range(0, 180, 15)  # degrees; the angles at which perfect cuts are compared

# --- Validation ---
# Approximate 2025 populations (UN World Population Prospects 2024 / national
# estimates). GHSL is a model, and the mainland rule drops some islands (Hawaii), so
# a few percent off is expected.
VALIDATION_COUNTRIES = {
    "Canada": 41.5e6,
    "Egypt": 118.4e6,
    "Australia": 27.4e6,
    "Chile": 19.9e6,
    "United States of America": 342e6,
    "Russia": 144e6,
    "Italy": 59.0e6,
    "Brazil": 212.6e6,
    "Japan": 123.4e6,
    "Indonesia": 285.7e6,
}
POPULATION_TOLERANCE = 0.06
