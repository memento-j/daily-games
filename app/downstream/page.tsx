// Downstream (/downstream): the game itself, no front page in between (one click
// less; developer's call, 2026-10-18). A Server Component: it renders the static
// HTML shell at build time; the game (today's puzzle, the map, saved progress) is a
// Client Component that takes over in the browser. The how-to-play text below the
// game is plain HTML, there for players who scroll and for search engines.

import type { Metadata } from "next";
import { Suspense } from "react";
import JsonLd from "@/components/JsonLd";
import Loading from "@/components/Loading";
import SiteFooter from "@/components/SiteFooter";
import { preconnectMapHosts } from "@/games/downstream/preconnect";
import { gameJsonLd, pageMetadata } from "@/lib/seo";
import DownstreamGame from "./DownstreamGame";

const DESCRIPTION =
  "A daily geography puzzle: a raindrop lands somewhere on Earth. Follow it downhill and guess which sea or ocean it reaches. Five drops a day, free.";

export const metadata: Metadata = pageMetadata({ title: "Downstream: guess which sea the rain reaches", description: DESCRIPTION, path: "/downstream/" });

const STEPS = [
  [
    "Watch the rain land.",
    "A raindrop falls on a pin somewhere on the map, and four seas or oceans are labelled around it. One of them is where this water ends up.",
  ],
  [
    "Pick a sea and lock it in.",
    "Tap a sea to pick it, then Lock in. Not sure yet? Let it flow: the water runs a stretch further downhill and stops, up to three times, before it reaches the coast.",
  ],
  [
    "Call it early for more points.",
    "Locking in the right sea before the water moves earns 4 points, then 3, 2 and 1 after each stop. A wrong guess earns nothing, and either way you see the water's whole journey to the sea.",
  ],
  [
    "Share your squares.",
    "Five drops a day. Afterwards, share your row of squares (green, blue, yellow, orange for 4 to 1 points, red for a miss) to compare with friends. It never gives away the answers.",
  ],
];

export default function DownstreamPage() {
  preconnectMapHosts();
  return (
    <>
      <JsonLd data={gameJsonLd({ name: "Downstream", description: DESCRIPTION, path: "/downstream/" })} />
      {/* DownstreamGame reads ?puzzle=N with useSearchParams, which in a static
          export must sit inside a Suspense boundary. */}
      <Suspense fallback={<Loading label="Finding today's drops…" className="h-svh bg-land" />}>
        <DownstreamGame />
      </Suspense>
      <section className="font-sans bg-land px-4 pb-12 text-ink">
        <div className="mx-auto max-w-[560px] pt-8">
          <h2 className="font-display text-xl font-semibold">How to play Downstream</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Downstream is a free daily geography puzzle about where rain goes. Water runs downhill along rivers until it meets the sea, and
            mountains, valleys and huge river basins mean that&apos;s often not the nearest one: rain in the Andes can fall a short way from
            the Pacific and still travel thousands of kilometres to the Atlantic.
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {STEPS.map(([title, text], i) => (
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
            Rivers: HydroRIVERS (HydroSHEDS). Seas: IHO Sea Areas (Marine Regions). Map: OpenFreeMap, OpenMapTiles, OpenStreetMap. <a href="/about/#credits" className="underline underline-offset-2 hover:text-ink">Full credits</a>
          </p>
          <SiteFooter className="mt-10" />
        </div>
      </section>
    </>
  );
}
