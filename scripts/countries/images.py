"""Images for the country pages (/countries/<slug>/), written to public/countries/:

    <slug>-game.webp   the country in Slice after a cut, with the perfect cut shown: a real
                       moment from the game, next to the page's "Split it yourself" button
    <slug>-card.png    the link-preview card (1200 x 630): the page's question, its answer
                       and its map, with nothing near the edges (previews crop them)

Usage (from the repo root, with `npm run dev` running on port 3000):
    python scripts/countries/images.py [slug ...]     # default: every country page

It plays the practice round (/slice/?country=<slug>) and reads the map and answer from
the page itself, so run it after adding a country page or changing how they look.
Needs Playwright (pip install playwright; playwright install chromium) and ffmpeg.
"""

import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "marketing"))
from shots import cut, reveal_done  # noqa: E402  (the store shots' helpers: draw a line, wait out the reveal)

OUT = ROOT / "public" / "countries"
BASE = "http://localhost:3000"
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
SLUGS = ["japan", "united-states", "australia", "germany", "south-korea"]

# The light theme's tokens (app/globals.css): the card is always light.
TOKENS = """--color-land:#eef0ec;--color-ink:#121a2b;--color-ink-soft:#4a5468;--color-ink-faint:#5f6a7d;
--color-coral:#f2545b;--color-coral-deep:#c0303a;--color-mat:#bccdbd;--color-slab:#fffaf3;
--color-slab-side:#e9a68c;--color-slab-counted:#ffdcd2;--color-people-other:#7b8597;"""
FONTS = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700"
         "&family=Hanken+Grotesk:wght@500;600;700&display=block")
PEEKER = """<svg width="44" height="44" viewBox="0 0 48 48"><path d="M5 34a19 19 0 0 1 38 0Z" fill="#f2545b"/>
<circle cx="17.5" cy="24.5" r="4.6" fill="#fff"/><circle cx="30.5" cy="24.5" r="4.6" fill="#fff"/>
<circle cx="19.2" cy="23.2" r="2.2" fill="#121a2b"/><circle cx="32.2" cy="23.2" r="2.2" fill="#121a2b"/>
<rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="#121a2b"/></svg>"""


def game_shot(browser, slug):
    """Cut the country straight across the middle, keep it, show the perfect cut."""
    w, h = 440, 900
    ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, color_scheme="light")
    page = ctx.new_page()
    page.goto(f"{BASE}/slice/?country={slug}")
    page.wait_for_timeout(12000)
    cut(page, w, h, h * 0.46, w * 0.34, h * 0.02).click()
    reveal_done(page)
    page.get_by_role("button", name="Keep this cut").click()
    page.get_by_role("button", name="Show perfect cut").click()
    page.wait_for_timeout(3500)
    png = OUT / f"{slug}-game.png"
    page.screenshot(path=str(png), clip={"x": 0, "y": 170, "width": w, "height": 460})  # the board, square-ish
    ctx.close()
    webp = OUT / f"{slug}-game.webp"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(png), "-quality", "78", str(webp)], check=True)
    png.unlink()


def card(browser, slug):
    page = browser.new_page(viewport={"width": 1200, "height": 900}, color_scheme="light")
    page.goto(f"{BASE}/countries/{slug}/")
    page.wait_for_timeout(2500)
    svg = page.locator("figure svg").first.evaluate("e => e.outerHTML")
    question = page.locator("h1").first.inner_text()
    dense = page.locator("main .slice-mark").first.inner_text()
    answer = page.locator("main .slice-mark").first.evaluate("e => e.parentElement.innerText")
    page.close()
    html = f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{FONTS}">
    <style>:root{{{TOKENS}}} *{{margin:0;box-sizing:border-box}}
    body{{width:1200px;height:630px;overflow:hidden;background:var(--color-land);color:var(--color-ink);font-family:"Hanken Grotesk";position:relative}}
    .text{{position:absolute;left:64px;top:60px;width:520px;bottom:60px;display:flex;flex-direction:column}}
    .brand{{display:flex;align-items:center;gap:10px;font:600 30px "Bricolage Grotesque";letter-spacing:-.02em}}
    h1{{font:600 52px/1.0 "Bricolage Grotesque";letter-spacing:-.035em;margin-top:34px}}
    p{{font:600 30px/1.2 "Bricolage Grotesque";letter-spacing:-.015em;margin-top:22px}}
    mark{{color:var(--color-coral-deep);background:rgb(242 84 91/.26);border-radius:6px;padding:0 .12em}}
    .url{{margin-top:auto;font:700 24px "Hanken Grotesk";color:var(--color-coral-deep)}}
    .map{{position:absolute;right:48px;top:48px;width:540px;height:534px;border-radius:30px;background-color:var(--color-mat);
          background-image:linear-gradient(rgb(255 255 255/.28) 1.5px,transparent 1.5px),linear-gradient(90deg,rgb(255 255 255/.28) 1.5px,transparent 1.5px);
          background-size:36px 36px;display:grid;place-items:center;padding:26px}}
    .map svg{{width:100%;height:100%}}</style></head><body>
    <div class="text"><div class="brand">{PEEKER}<span>Pondo<span style="color:var(--color-coral)">.</span></span></div>
      <h1>{question}</h1><p>{answer.replace(dense, f"<mark>{dense}</mark>", 1)}</p>
      <div class="url">pondo.games/countries/{slug}</div></div>
    <div class="map">{svg}</div></body></html>"""
    page = browser.new_page(viewport={"width": 1200, "height": 630})
    page.set_content(html)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / f"{slug}-card.png"))
    page.close()


def main():
    slugs = sys.argv[1:] or SLUGS
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=GL)
        for slug in slugs:
            card(browser, slug)
            game_shot(browser, slug)
            print(f"{slug}: done", flush=True)
        browser.close()


if __name__ == "__main__":
    main()
