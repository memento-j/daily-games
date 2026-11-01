"""Pondo's cover banner for the Buy Me a Coffee page (buymeacoffee.com/pondogames).

    python scripts/marketing/banner.py

Writes marketing/pondo-banner.png (gitignored), 3200 x 500. Buy Me a Coffee asks for at
least 1600 x 400, but its page shows the cover as a full-width strip about 6.5:1 (a 4:1
picture lost its top and bottom, 2026-11-01), and the page's cards cover the middle
fifth of its bottom edge. So it's drawn at 6.4:1, the words high in the middle, the two
games on either side, at twice the size so it stays sharp.

Uses the link-preview cards' drawings and fonts (scripts/brand/make_og.py, og_art.json).
"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "brand"))
from make_og import CARD, INK, INK_SOFT, LAND, MAT, TILE, downstream_map, page, peeker, slice_board, tag  # noqa: E402

W, H = 1600, 250


def banner() -> str:
    tile_w, tile_h = 290, 190
    top = (H - tile_h) // 2
    return page(f"""
      <div style="{TILE};border-radius:20px;left:44px;top:{top}px;width:{tile_w}px;height:{tile_h}px;background:{MAT}"><div class="grid" style="background-size:28px 28px"></div>
        <div style="position:absolute;inset:0">{slice_board(tile_w, tile_h, labels=False)}</div>
        <div class="display" style="{tag(20)}">Slice<span class="dot">.</span></div></div>
      <div style="{TILE};border-radius:20px;right:44px;top:{top}px;width:{tile_w}px;height:{tile_h}px">{downstream_map(tile_w, tile_h, labels=False)}
        <div class="display" style="{tag(20, 'top')}">Downstream<span class="dot">.</span></div></div>
      <div style="position:absolute;left:400px;top:34px;width:800px;text-align:center">
        <div class="brand display" style="justify-content:center;gap:10px">{peeker(44)}<span style="font-size:36px">Pondo<span class="dot">.</span></span></div>
        <h1 class="display" style="font-size:34px;line-height:1.05;margin-top:12px">Free daily geography puzzles<span class="dot">.</span></h1>
        <p style="color:{INK_SOFT};font-size:17px;line-height:1.3;font-weight:500;margin-top:10px">A new puzzle every day, the same for everyone. Free, with no sign-up.</p>
      </div>
    """, LAND, W, H)


def main() -> None:
    out = ROOT / "marketing" / "pondo-banner.png"
    out.parent.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        tab = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
        tab.set_content(banner(), wait_until="networkidle")
        tab.evaluate("document.fonts.ready")
        out.write_bytes(tab.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H}))
        browser.close()
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
