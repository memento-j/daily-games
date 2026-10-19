// Slice (/slice): the game itself, straight away (one click less; developer's call,
// 2026-10-18). A Server Component: the how-to-play text below is static HTML; the
// game is a Client Component that takes over in the browser.

import type { Metadata } from "next";
import { Suspense } from "react";
import Loading from "@/components/Loading";
import SliceGame from "./SliceGame";

export const metadata: Metadata = {
  title: "Slice",
  description: "Draw one straight line across a real country to cut off half its land or a third of its population. Four countries a day, free.",
};

export default function SlicePage() {
  return (
    <>
      {/* SliceGame reads ?puzzle=N with useSearchParams, which in a static export must
          sit inside a Suspense boundary. The build can't know the address, so the HTML
          holds this fallback until the browser renders the game: the shared loading
          state, full screen in the board's colour (an empty fallback let the how-to-play
          text below flash up first). */}
      <Suspense fallback={<Loading label="Laying out today's countries…" className="h-svh bg-mat" />}>
        <SliceGame />
      </Suspense>
      <section className="font-sans bg-land px-4 pb-12 text-ink">
        <div className="mx-auto max-w-[560px] pt-8">
          <h2 className="font-display text-xl font-semibold">How to play</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Every day you get four real countries, each with a goal like &ldquo;Cut off half of Germany&apos;s land&rdquo; or &ldquo;Cut off a
            third of Japan&apos;s population&rdquo;. You have one straight line to do it.
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {[
              [
                "Read the goal.",
                "The label above it says what you're cutting. A Land round is about size: half the land is half the shape. A Population round is about where the population lives: it crowds into cities, coasts and river valleys, so the line that splits the shape in half rarely splits the population in half.",
              ],
              [
                "Draw your line.",
                "Drag across the country, from one side to the other. Drag either end to adjust the angle and position, then press Cut. Only one of the two pieces needs to match the goal: whichever is closer counts.",
              ],
              [
                "See how close you got.",
                "The country splits along your line and the population rises in columns, so you can see where everyone actually lives. Within 2% of the goal earns a green square, within 6% blue, within 16% yellow, anything further red. Show perfect cut reveals the ideal line at your angle.",
              ],
              ["Share your squares.", "After four rounds, share your row of squares to compare with friends. It never gives away the answers."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="font-display grid size-7 shrink-0 place-items-center rounded-full bg-coral-soft text-sm font-semibold text-coral-deep">
                  {i + 1}
                </span>
                <p className="leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">{title}</span> {text}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ink-faint">
            Population: GHSL GHS-POP 2025 (European Commission, JRC), CC BY 4.0. Borders: Natural Earth.
          </p>
        </div>
      </section>
    </>
  );
}
