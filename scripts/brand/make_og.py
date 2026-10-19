"""Pondo's link-preview cards: the picture that shows when someone pastes a link into
X, iMessage, WhatsApp, Discord, Slack, ... (Open Graph images, 1200 x 630).

Writes, as Next.js file-convention images (app/**/opengraph-image.png + .alt.txt):
    app/opengraph-image.png             the site: the Peeker, Pondo, both games
    app/slice/opengraph-image.png       Slice: Australia cut in half by population
    app/downstream/opengraph-image.png  Downstream: an Andes raindrop that reaches the Atlantic

    python scripts/brand/make_og.py        # redraw the cards (after changing words or looks)
    python scripts/brand/make_og.py data   # re-measure the drawings from the datasets first

The drawings come from the games' real data, measured once by og_data.py into
og_art.json (committed), so redrawing needs no datasets. Rendered in Chromium by
Playwright with the site's own fonts.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ART = json.loads((HERE / "og_art.json").read_text(encoding="utf-8")) if (HERE / "og_art.json").exists() else {}
W, H = 1200, 630

# The light theme's tokens (app/globals.css).
LAND, SEA, COAST = "#eef0ec", "#d3e4f3", "#8fa7bf"
CORAL, CORAL_DEEP, INK, INK_SOFT, CARD = "#f2545b", "#c0303a", "#121a2b", "#4a5468", "#ffffff"
MAT, SLAB, SLAB_SIDE, SLAB_COUNTED, PEOPLE_OTHER = "#bccdbd", "#fffaf3", "#e9a68c", "#ffdcd2", "#7b8597"
DROP = "#155eef"

FONTS = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700"
         "&family=Hanken+Grotesk:ital,wght@0,500;0,600;1,500&display=block")


# --------------------------------------------------------------------------- #
# Drawings (SVG strings)
# --------------------------------------------------------------------------- #

def peeker(size: int) -> str:
    """The Peeker over its horizon, as in components/Peeker.tsx."""
    return f"""<svg width="{size}" height="{size}" viewBox="0 0 48 48">
      <path d="M5 34a19 19 0 0 1 38 0Z" fill="{CORAL}"/>
      <circle cx="17.5" cy="24.5" r="4.6" fill="#fff"/><circle cx="30.5" cy="24.5" r="4.6" fill="#fff"/>
      <circle cx="19.2" cy="23.2" r="2.2" fill="{INK}"/><circle cx="32.2" cy="23.2" r="2.2" fill="{INK}"/>
      <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="{INK}"/></svg>"""


def _area(ring: list) -> float:
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2


def slice_board(width: int, height: int, labels: bool = True) -> str:
    """Australia as the game's paper slab on the cutting mat, split along the perfect
    population half cut: the counted south-east corner slid off and tinted coral, the
    population standing on it in columns."""
    a = ART["slice"]
    tilt, thick, gap, tall = 0.66, 26, 26, 250  # y squash, slab depth, how far pieces part, tallest column
    n = a["normal"]

    def place(x: float, y: float, side: float) -> tuple[float, float]:
        return x + n[0] * gap * side, (y + n[1] * gap * side) * tilt

    def path(rings: list, side: float, dy: float = 0) -> str:
        out = []
        for r in rings:
            pts = [place(x, y, side) for x, y in r]
            out.append("M" + "L".join(f"{px:.1f},{py + dy:.1f}" for px, py in pts) + "Z")
        return "".join(out)

    pieces = [(a["other"], -1, SLAB), (a["counted"], 1, SLAB_COUNTED)]
    # The slab's sides: the outline stacked downwards, then its top face.
    body = ""
    for rings, side, top in pieces:
        side_d = "".join(f'<path d="{path(rings, side, dy)}" fill="{SLAB_SIDE}"/>' for dy in range(thick, 0, -2))
        body += f'<path d="{path(rings, side, thick + 10)}" fill="#000" opacity=".16" filter="url(#soft)"/>' + side_d
        body += f'<path d="{path(rings, side)}" fill="{top}" stroke="#d98f74" stroke-width="1.4"/>'

    # The cut: a coral dashed line down the middle of the gap.
    (x1, y1), (x2, y2) = a["cut"]
    cut = (f'<line x1="{x1:.1f}" y1="{y1 * tilt:.1f}" x2="{x2:.1f}" y2="{y2 * tilt:.1f}" stroke="{CORAL}" '
           f'stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/>')

    # Columns, back to front.
    cols = ""
    for x, y, h, counted in sorted(a["columns"], key=lambda c: c[1]):
        px, py = place(x, y, 1 if counted else -1)
        hh = max(4.0, math.sqrt(h) * tall)
        fill, cap = (CORAL, "#ff8f94") if counted else (PEOPLE_OTHER, "#a5adbb")
        cols += (f'<rect x="{px - 6:.1f}" y="{py - hh:.1f}" width="12" height="{hh:.1f}" rx="2.5" fill="{fill}"/>'
                 f'<ellipse cx="{px:.1f}" cy="{py - hh:.1f}" rx="6" ry="3" fill="{cap}"/>')

    land = sum(_area(r) for r in a["counted"]) / sum(_area(r) for r in a["counted"] + a["other"])
    tags = ""
    if labels:
        tags = f"""
        <g font-family="Hanken Grotesk" font-weight="600">
          <rect x="672" y="636" width="300" height="78" rx="39" fill="{CORAL}"/>
          <text x="822" y="670" text-anchor="middle" font-size="27" fill="#fff">{a['share'] * 100:.0f}% of the population</text>
          <text x="822" y="700" text-anchor="middle" font-size="22" fill="#fff" opacity=".9">on {land * 100:.0f}% of the land</text>
          <rect x="120" y="215" width="250" height="56" rx="28" fill="{CARD}"/>
          <text x="245" y="251" text-anchor="middle" font-size="25" fill="{INK_SOFT}">the other {100 - a['share'] * 100:.0f}%</text>
        </g>"""
    # Fit: the board's drawn extent, in board units.
    vx, vy, vw, vh = -30, -215, 1090, 950
    return f"""<svg width="{width}" height="{height}" viewBox="{vx} {vy} {vw} {vh}" preserveAspectRatio="xMidYMid meet">
      <defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter></defs>
      {body}{cut}{cols}{tags}</svg>"""


def sea_name(iho: str) -> str:
    return iho.replace("South ", "").replace("North ", "")


def downstream_map(width: int, height: int, labels: bool = True) -> str:
    """The raindrop's route from the Andes to the Atlantic on Downstream's map style."""
    a = ART["downstream"]
    route, pin = a["route"], a["pin"]
    lons = [p[0] for p in route] + [pin[0] - 9]
    lats = [p[1] for p in route]
    lon0, lon1, lat0, lat1 = min(lons) - 1, max(lons) + 7, min(lats) - 4, max(lats) + 5
    k = math.cos(math.radians((lat0 + lat1) / 2))
    scale = min(width / ((lon1 - lon0) * k), height / (lat1 - lat0))
    cx, cy = (lon0 + lon1) / 2, (lat0 + lat1) / 2

    def xy(lon: float, lat: float) -> tuple[float, float]:
        return width / 2 + (lon - cx) * k * scale, height / 2 - (lat - cy) * scale

    def d(coords: list) -> str:
        return "M" + "L".join("{:.1f},{:.1f}".format(*xy(*c)) for c in coords)

    land = "".join(f'<path d="{d(r)}Z"/>' for r in a["land"])
    r = d(route)
    px, py = xy(*pin)
    mx, my = xy(*route[-1])
    tags = ""
    if labels:
        def sea(lon, lat, text, strong=False):
            x, y = xy(lon, lat)
            x = min(x, width - 24)  # right-aligned labels stay on the card
            return (f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="{"end" if strong else "middle"}" font-family="Hanken Grotesk" font-style="italic" '
                    f'font-weight="{600 if strong else 500}" font-size="{30 if strong else 25}" fill="{DROP if strong else "#5d86b5"}" '
                    f'stroke="{SEA}" stroke-width="6" paint-order="stroke">{text}</text>')
        tags = sea(pin[0] - 3.2, pin[1] - 4.2, "Pacific Ocean") + sea(route[-1][0] + 6, route[-1][1] + 3.6, "Atlantic Ocean", True)
        tags += (f'<g font-family="Hanken Grotesk" font-weight="600"><rect x="{(px + mx) / 2 - 90:.0f}" y="{min(py, my) + 120:.0f}" '
                 f'width="180" height="48" rx="24" fill="{CARD}"/><text x="{(px + mx) / 2:.0f}" y="{min(py, my) + 152:.0f}" '
                 f'text-anchor="middle" font-size="23" fill="{INK}">{a["km"]:,} km</text></g>')
    drop = (f'<g transform="translate({px:.1f} {py:.1f})"><circle r="22" fill="{CORAL}" opacity=".22"/>'
            f'<path d="M0 -17 C 7 -7 11 -1 11 5 A 11 11 0 0 1 -11 5 C -11 -1 -7 -7 0 -17Z" fill="{CORAL}" stroke="#fff" stroke-width="3"/></g>')
    splash = "".join(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{rr}" fill="none" stroke="{DROP}" stroke-width="3" opacity="{op}"/>'
                     for rr, op in ((14, .9), (26, .5), (40, .25)))
    return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}">
      <rect width="{width}" height="{height}" fill="{SEA}"/>
      <g fill="{LAND}" stroke="{COAST}" stroke-width="1.2" stroke-linejoin="round">{land}</g>
      <path d="{r}" fill="none" stroke="{CORAL}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".18"/>
      <path d="{r}" fill="none" stroke="{CORAL}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      {splash}{drop}{tags}</svg>"""


# --------------------------------------------------------------------------- #
# Cards (HTML)
# --------------------------------------------------------------------------- #

def page(body: str, background: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="{FONTS}"><style>
      * {{ margin: 0; box-sizing: border-box; }}
      body {{ width: {W}px; height: {H}px; overflow: hidden; background: {background}; color: {INK};
              font-family: "Hanken Grotesk", sans-serif; position: relative; }}
      .display {{ font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; letter-spacing: -0.04em; }}
      .dot {{ color: {CORAL}; }}
      .brand {{ display: flex; align-items: center; gap: 10px; font-size: 30px; }}
      .grid {{ position: absolute; inset: 0; background-image:
               linear-gradient(rgb(255 255 255 / .22) 1.5px, transparent 1.5px),
               linear-gradient(90deg, rgb(255 255 255 / .22) 1.5px, transparent 1.5px);
               background-size: 42px 42px; }}
    </style></head><body>{body}</body></html>"""


def site_card() -> str:
    tile = "position:absolute;width:330px;height:236px;border-radius:30px;overflow:hidden;box-shadow:0 24px 50px -18px rgb(18 26 43/.4)"
    tag = f"position:absolute;left:16px;bottom:14px;font-size:30px;background:{CARD};border-radius:999px;padding:4px 16px 6px"
    return page(f"""
      <div style="position:absolute;left:72px;top:64px;width:640px">
        <div class="brand display">{peeker(64)}<span style="font-size:44px">Pondo<span class="dot">.</span></span></div>
        <h1 class="display" style="font-size:86px;line-height:.95;margin-top:44px">Your daily dose of “wait, really<span class="dot">?</span>”</h1>
        <p style="font-size:30px;line-height:1.3;color:{INK_SOFT};margin-top:28px;font-weight:500">Small daily puzzles. Free, no sign-up.</p>
      </div>
      <div style="{tile};left:800px;top:52px;background:{MAT}"><div class="grid"></div>
        <div style="position:absolute;inset:0">{slice_board(330, 236, labels=False)}</div>
        <div class="display" style="{tag}">Slice<span class="dot">.</span></div></div>
      <div style="{tile};left:800px;top:330px">{downstream_map(330, 236, labels=False)}
        <div class="display" style="{tag}">Downstream<span class="dot">.</span></div></div>
    """, LAND)


def slice_card() -> str:
    return page(f"""
      <div class="grid"></div>
      <div style="position:absolute;left:565px;top:30px;width:615px;height:580px">{slice_board(615, 580)}</div>
      <div style="position:absolute;left:68px;top:60px;width:470px">
        <div class="brand display">{peeker(48)}<span>Pondo<span class="dot">.</span></span></div>
        <h1 class="display" style="font-size:120px;line-height:1;margin-top:46px">Slice<span class="dot">.</span></h1>
        <p class="display" style="font-size:42px;line-height:1.08;letter-spacing:-0.025em;margin-top:22px">
          Cut off half of Australia’s population with one straight line.</p>
        <p style="font-size:26px;color:{INK};margin-top:26px;font-weight:500;opacity:.75">A daily geography puzzle. Free.</p>
      </div>
    """, MAT)


def downstream_card() -> str:
    a = ART["downstream"]
    return page(f"""
      <div style="position:absolute;right:0;top:0">{downstream_map(700, H)}</div>
      <div style="position:absolute;left:0;top:0;width:500px;height:{H}px;background:{LAND};padding:60px 0 0 68px;
                  box-shadow:12px 0 40px -20px rgb(18 26 43/.35)">
        <div class="brand display">{peeker(48)}<span>Pondo<span class="dot">.</span></span></div>
        <h1 class="display" style="font-size:76px;line-height:1;margin-top:52px">Downstream<span class="dot">.</span></h1>
        <p class="display" style="font-size:40px;line-height:1.1;letter-spacing:-0.025em;margin-top:22px;width:390px">
          Rain falls in the Andes, a short way from the {sea_name(a['nearest'])}. Which sea does it reach?</p>
        <p style="font-size:26px;color:{INK_SOFT};margin-top:26px;font-weight:500">A daily geography puzzle. Free.</p>
      </div>
    """, SEA)


CARDS = {
    "app": (site_card, "Pondo: small daily puzzles. Slice and Downstream, new every day."),
    "app/slice": (slice_card, "Slice: Australia cut in two along one straight line, half its population on the small south-east piece."),
    "app/downstream": (downstream_card, "Downstream: a raindrop's route from the Andes down the Amazon to the Atlantic Ocean."),
}


def main() -> None:
    if sys.argv[1:] == ["data"]:
        for part in ("slice", "downstream"):
            subprocess.run([sys.executable, str(HERE / "og_data.py"), part], check=True)
        subprocess.run([sys.executable, __file__], check=True)
        return
    with sync_playwright() as p:
        browser = p.chromium.launch()
        tab = browser.new_page(viewport={"width": W, "height": H})
        for folder, (card, alt) in CARDS.items():
            tab.set_content(card(), wait_until="networkidle")
            tab.evaluate("document.fonts.ready")
            out = ROOT / folder / "opengraph-image.png"
            out.write_bytes(tab.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H}))
            (ROOT / folder / "opengraph-image.alt.txt").write_text(alt, encoding="utf-8")
            print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
        browser.close()


if __name__ == "__main__":
    main()
