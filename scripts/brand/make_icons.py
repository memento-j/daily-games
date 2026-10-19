"""Pondo's app icons, all from one drawing of the Peeker (components/Peeker.tsx).

Writes (run from the repo root, after changing the drawing):
    app/icon.svg              the favicon for modern browsers (vector, rounded tile)
    app/favicon.ico           16/32/48 px, for older browsers
    app/apple-icon.png        180 px, full-bleed square (iOS rounds the corners itself)
    public/icon-192.png       manifest icons (app/manifest.ts), rounded tile
    public/icon-512.png
    public/icon-maskable-512.png  full-bleed with the Peeker in the safe zone, for
                                  Android's shaped icons

    python scripts/brand/make_icons.py

Needs Playwright (renders the SVG in Chromium) and Pillow (writes the .ico).
"""

from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent.parent
INK = "#1d2533"
CORAL = "#f2545b"
CREAM = "#fff4e8"

# The Peeker on a 64-unit tile: a coral character peeking over a cream horizon.
PEEKER = f"""
  <g transform="translate(0 -4)">
    <path d="M13 45a19 19 0 0 1 38 0Z" fill="{CORAL}"/>
    <circle cx="25.5" cy="35.5" r="4.6" fill="#fff"/>
    <circle cx="38.5" cy="35.5" r="4.6" fill="#fff"/>
    <circle cx="27.2" cy="34.2" r="2.2" fill="{INK}"/>
    <circle cx="40.2" cy="34.2" r="2.2" fill="{INK}"/>
    <rect x="8" y="44" width="48" height="3.4" rx="1.7" fill="{CREAM}"/>
  </g>"""


def svg(kind: str) -> str:
    """'rounded': a tile with rounded corners; 'square': full bleed; 'maskable': full
    bleed with the drawing shrunk into the central safe zone."""
    if kind == "rounded":
        body = f'<rect width="64" height="64" rx="15" fill="{INK}"/>{PEEKER}'
    elif kind == "square":
        body = f'<rect width="64" height="64" fill="{INK}"/>{PEEKER}'
    else:
        body = f'<rect width="64" height="64" fill="{INK}"/><g transform="translate(32 32) scale(0.74) translate(-32 -32)">{PEEKER}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{body}</svg>'


def render(page, kind: str, size: int) -> bytes:
    page.set_viewport_size({"width": size, "height": size})
    sized = svg(kind).replace("<svg ", f'<svg width="{size}" height="{size}" ', 1)
    page.set_content(f'<html><body style="margin:0;background:transparent">{sized}</body></html>')
    return page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})


def main() -> None:
    (ROOT / "app" / "icon.svg").write_text(svg("rounded") + "\n", encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        (ROOT / "app" / "apple-icon.png").write_bytes(render(page, "square", 180))
        (ROOT / "public" / "icon-192.png").write_bytes(render(page, "rounded", 192))
        (ROOT / "public" / "icon-512.png").write_bytes(render(page, "rounded", 512))
        (ROOT / "public" / "icon-maskable-512.png").write_bytes(render(page, "maskable", 512))
        big = Image.open(BytesIO(render(page, "rounded", 256)))
        browser.close()
    big.save(ROOT / "app" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote app/icon.svg, app/favicon.ico, app/apple-icon.png, public/icon-192.png, public/icon-512.png, public/icon-maskable-512.png")


if __name__ == "__main__":
    main()
