"""Store-listing images for Slice (AlternativeTo, Product Hunt, ...): icons and screenshots.

Usage (from the repo root, after `npm run build`):
    python scripts/marketing/shots.py

Writes to marketing/slice/ (gitignored):
    icon-1024.png, icon-512.png, icon-256.png   Slice's icon (scripts/marketing/slice-icon.svg)
    pondo-icon-512.png                          the site's own app icon (public/icon-512.png)
    phone-1-draw.png ... phone-5-summary.png    today's puzzle on a phone (390x844 at 3x)
    desktop-1-draw.png ... desktop-6-home.png   the same on a desktop (1440x900 at 2x)

It serves the static build in out/ (no dev overlay) and plays today's puzzle in a
headless browser: a cut on round 1, its reveal, the perfect cut, a cut on round 2,
then the day's summary. Today's countries and the cuts differ day to day, so look the
images over before using them. Needs Playwright (pip install playwright; playwright
install chromium).
"""

import functools
import http.server
import shutil
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "marketing" / "slice"
SITE = ROOT / "out"
PORT = 3124
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=str(SITE))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def icons(browser):
    svg = (ROOT / "scripts" / "marketing" / "slice-icon.svg").read_text(encoding="utf-8")
    for size in (1024, 512, 256):
        page = browser.new_page(viewport={"width": size, "height": size})
        sized = svg.replace('width="1024" height="1024"', f'width="{size}" height="{size}"')
        page.set_content("<body style='margin:0'>" + sized + "</body>")
        page.screenshot(path=str(OUT / f"icon-{size}.png"), clip={"x": 0, "y": 0, "width": size, "height": size})
        page.close()
    shutil.copy(ROOT / "public" / "icon-512.png", OUT / "pondo-icon-512.png")


def cut(page, w, h, cy, dx, dy):
    """Draw a line from the board's middle, retrying a little lower if it misses."""
    button = page.get_by_role("button", name="Cut", exact=True)
    for attempt in range(8):
        y = cy + (attempt % 4) * 0.03 * h
        page.mouse.move(w * 0.5, y)
        page.mouse.down()
        for k in range(1, 25):
            page.mouse.move(w * 0.5 + dx * k / 24, y + dy * k / 24)
            page.wait_for_timeout(16)
        page.mouse.up()
        page.wait_for_timeout(400)
        if button.is_enabled():
            return button
    raise SystemExit("couldn't draw a cut across the country")


def reveal_done(page):
    """Wait for a cut's reveal to finish: its buttons become clickable then."""
    keep = page.get_by_role("button", name="Keep this cut")
    keep.wait_for(timeout=60000)
    for _ in range(240):
        if keep.is_enabled():
            break
        page.wait_for_timeout(250)
    page.wait_for_timeout(1500)  # the card fades in


def play(browser, name, viewport, scale):
    ctx = browser.new_context(viewport=viewport, device_scale_factor=scale, color_scheme="light")
    page = ctx.new_page()
    w, h = viewport["width"], viewport["height"]
    cy = h * (0.47 if w < 700 else 0.46)
    shot = lambda n, label: page.screenshot(path=str(OUT / f"{name}-{n}-{label}.png"))
    top = lambda: page.evaluate("window.scrollTo(0, 0)")

    page.goto(f"http://127.0.0.1:{PORT}/slice/")
    page.wait_for_timeout(12000)
    # Round 1: a cut straight across, its reveal, then the perfect cut.
    button = cut(page, w, h, cy, w * 0.32, h * 0.01)
    top(); shot(1, "draw")
    button.click()
    reveal_done(page)
    top(); shot(2, "reveal")
    page.get_by_role("button", name="Keep this cut").click()
    page.get_by_role("button", name="Show perfect cut").click()
    page.wait_for_timeout(3500)
    top(); shot(3, "perfect-cut")
    page.get_by_role("button", name="Next round").click()
    page.wait_for_timeout(3000)
    # Round 2: a cut the other way.
    top()
    cut(page, w, h, cy, w * 0.05, h * 0.22).click()
    reveal_done(page)
    top(); shot(4, "round-2")
    # The rest of the day, quickly, for the summary.
    page.get_by_role("button", name="Keep this cut").click()
    page.get_by_role("button", name="Next round").click()
    for r in (3, 4):
        page.wait_for_timeout(3000)
        top()
        cut(page, w, h, cy, w * 0.3, h * 0.05).click()
        reveal_done(page)
        page.get_by_role("button", name="Keep this cut").click()
        page.get_by_role("button", name="Next round").or_(page.get_by_role("button", name="See results")).click()
    page.wait_for_timeout(4000)
    top(); shot(5, "summary")
    if w >= 700:
        page.goto(f"http://127.0.0.1:{PORT}/")
        page.wait_for_timeout(3000)
        shot(6, "home")
    ctx.close()
    print(f"{name}: done", flush=True)


def main():
    if not (SITE / "slice" / "index.html").exists():
        raise SystemExit("No build in out/: run `npm run build` first")
    OUT.mkdir(parents=True, exist_ok=True)
    httpd = serve()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=GL)
        icons(browser)
        print("icons: done", flush=True)
        play(browser, "phone", {"width": 390, "height": 844}, 3)
        play(browser, "desktop", {"width": 1440, "height": 900}, 2)
        browser.close()
    httpd.shutdown()
    print(f"Images in {OUT}")


if __name__ == "__main__":
    main()
