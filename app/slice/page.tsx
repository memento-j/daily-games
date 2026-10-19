// Slice (/slice): the game itself, straight away (one click less; developer's call,
// 2026-10-18). A Server Component: the how-to-play text below is static HTML; the
// game is a Client Component that takes over in the browser.

import type { Metadata } from "next";
import { Suspense } from "react";
import SliceGame from "./SliceGame";

export const metadata: Metadata = {
  title: "Slice",
  description: "Cut a real country with one straight line: half its land, half its population, a third of it. Four countries a day.",
};

export default function SlicePage() {
  return (
    <>
      {/* SliceGame reads ?puzzle=N with useSearchParams, which in a static export must
          sit inside a Suspense boundary. The build can't know the address, so the HTML
          holds this fallback until the browser renders the game: it fills the screen in
          the board's colour, or the how-to-play text below flashed up first. */}
      <Suspense fallback={<div className="h-svh bg-mat" />}>
        <SliceGame />
      </Suspense>
      <section className="font-sans bg-land px-4 pb-12 text-ink">
        <div className="mx-auto max-w-[560px] pt-8">
          <h2 className="font-display text-xl font-semibold">How to play</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Every day there are four countries to cut. For each one, draw a single straight line that cuts off what the question asks for: half
            the land, half the population, a third of it, or a tenth.
          </p>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Check the label above the question. Land rounds are about size. Population rounds are about where people live, which is rarely
            where the land is, so a cut that looks right can be way off.
          </p>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Drag across the country to draw your line, drag its ends to fine-tune it, then press Cut. Whichever piece is closer to the aim
            counts. The pieces part and the population rises in columns, so you can see where everyone lives. Show perfect cut reveals the
            right line at your angle.
          </p>
          <p className="mt-4 text-xs text-ink-faint">
            Population: GHSL GHS-POP 2025 (European Commission, JRC), CC BY 4.0. Borders: Natural Earth.
          </p>
        </div>
      </section>
    </>
  );
}
