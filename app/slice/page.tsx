// Slice (/slice): the game itself, straight away (one click less; developer's call,
// 2026-10-18). A Server Component: the how-to-play text below is static HTML; the
// game is a Client Component that takes over in the browser.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import JsonLd from "@/components/JsonLd";
import Loading from "@/components/Loading";
import SiteFooter from "@/components/SiteFooter";
import { gameJsonLd, pageMetadata } from "@/lib/seo";
import { PRACTICE } from "@/games/slice/practice";
import SliceGame from "./SliceGame";

const DESCRIPTION =
  "A daily geography puzzle: draw one straight line across a real country to cut its population exactly in half. Four countries a day, free.";

export const metadata: Metadata = pageMetadata({ title: "Slice: cut a country's population in half", description: DESCRIPTION, path: "/slice/" });

export default function SlicePage() {
  return (
    <>
      <JsonLd data={gameJsonLd({ name: "Slice", description: DESCRIPTION, path: "/slice/" })} />
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
          <h2 className="font-display text-xl font-semibold">How to play Slice</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Slice is a free daily geography puzzle about where people really live. It looks like a test of shapes, but most
            countries&apos; populations crowd into a small part of their land, so the obvious cut is often far off.
          </p>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Every day you get four real countries and one goal for each: cut its population exactly in half. You get one straight line to do it, and a second try if you want it.
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {[
              [
                "Read the goal.",
                "Split the population in half. Think about where the population lives, not how big the country looks: it crowds into cities, coasts and river valleys, so the line that splits the shape in half rarely splits the population in half.",
              ],
              [
                "Draw your line.",
                "Drag across the country, from one side to the other. Drag either end to adjust the angle and position, then press Cut. Only one of the two pieces needs to match the goal: whichever is closer counts.",
              ],
              [
                "See how close you got.",
                "The country splits along your line and the population rises in columns, so you can see where everyone actually lives. Each cut scores out of 100, halving for every 7 percentage points you're off: 1 point off scores 91, 7 off scores 50, 10 off still scores 37. Cutting off 47.7% instead of 50%, for example, is 2.3 points off, so 80. Not happy? Cut again once: your better cut counts. When you're done, Show perfect cut reveals the ideal line at your angle.",
              ],
              ["Share your score.", "After four rounds you have a score out of 400. Share it, with each round's score, to compare with friends. It never gives away the answers."],
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
          <h2 className="font-display mt-8 text-xl font-semibold">Practice on past countries</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Want more than four a day? Practice on a country from an earlier puzzle. It plays just like a daily round, and it never touches your score, streak or stats.
            Curious where everyone lives first? <Link href="/countries/" className="font-semibold text-coral-deep underline decoration-coral/40 underline-offset-[3px]">See the country maps</Link>.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {PRACTICE.map((c) => (
              <li key={c.slug}>
                <a
                  href={`/slice/?country=${c.slug}`}
                  className="block rounded-full bg-card px-3 py-1.5 text-sm font-semibold ring-1 ring-ink/15 transition-shadow hover:ring-coral-deep/60"
                >
                  Split {c.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-ink-faint">
            Population: GHSL GHS-POP 2025 (European Commission, JRC), CC BY 4.0. Borders: Natural Earth. <a href="/about/#credits" className="underline underline-offset-2 hover:text-ink">Full credits</a>
          </p>
          <SiteFooter className="mt-10" />
        </div>
      </section>
    </>
  );
}
