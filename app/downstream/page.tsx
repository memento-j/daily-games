// Downstream (/downstream): the game itself, no front page in between (one click
// less; developer's call, 2026-10-18). A Server Component: it renders the static
// HTML shell at build time; the game (today's puzzle, the map, saved progress) is a
// Client Component that takes over in the browser.

import type { Metadata } from "next";
import { Suspense } from "react";
import Loading from "@/components/Loading";
import { preconnectMapHosts } from "@/games/downstream/preconnect";
import DownstreamGame from "./DownstreamGame";

export const metadata: Metadata = {
  title: "Downstream",
  description: "A raindrop lands somewhere on Earth. Follow it downhill and guess which sea it reaches. Five drops a day.",
};

export default function DownstreamPage() {
  preconnectMapHosts();
  return (
    // DownstreamGame reads ?puzzle=N with useSearchParams, which in a static
    // export must sit inside a Suspense boundary.
    <Suspense fallback={<Loading label="Finding today's drops…" className="min-h-svh bg-land" />}>
      <DownstreamGame />
    </Suspense>
  );
}
