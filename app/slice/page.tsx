// Slice (/slice): the game itself, straight away (one click less; developer's call,
// 2026-10-18). A Server Component: the how-to-play text below is static HTML; the
// game is a Client Component that takes over in the browser.

import type { Metadata } from "next";
import { Suspense } from "react";
import SliceGame from "./SliceGame";

export const metadata: Metadata = {
  title: "Slice",
  description: "Cut a real country with one straight line: half its land, half its people, a third of them. Four cuts a day.",
};

export default function SlicePage() {
  return (
    <>
      {/* SliceGame reads ?puzzle=N with useSearchParams, which in a static export must
          sit inside a Suspense boundary. */}
      <Suspense fallback={null}>
        <SliceGame />
      </Suspense>
      <section className="font-sans bg-land px-4 pb-12 text-ink">
        <div className="mx-auto max-w-[560px] border-t border-line pt-8">
          <h2 className="font-display text-xl font-semibold">How to play</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Each day you get four countries. Draw one straight line across each to cut off what the round asks for: half its land, half its
            people, a third of its people, or a tenth. People are rarely spread like land, so the line you&apos;d guess by eye is often far
            from the right one.
          </p>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Drag across the map to draw your cut, drag its ends to adjust it, then confirm. Whichever piece is closer to the target counts.
            The reveal shows where the people live and the perfect cut at your angle.
          </p>
          <p className="mt-4 text-xs text-ink-faint">
            Population: GHSL GHS-POP 2025 (European Commission, JRC), CC BY 4.0. Borders: Natural Earth.
          </p>
        </div>
      </section>
    </>
  );
}
