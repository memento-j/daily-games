// The game itself (/downstream/play). A Server Component: it renders the static
// HTML shell at build time; the game (today's puzzle, the map, saved progress)
// is a Client Component that takes over in the browser.

import type { Metadata } from "next";
import { Suspense } from "react";
import DownstreamGame from "./DownstreamGame";

export const metadata: Metadata = {
  title: "Play Downstream",
  description: "Today's five drops: follow each raindrop downhill and guess which sea it reaches.",
};

export default function PlayPage() {
  return (
    // DownstreamGame reads ?puzzle=N with useSearchParams, which in a static
    // export must sit inside a Suspense boundary.
    <Suspense fallback={null}>
      <DownstreamGame />
    </Suspense>
  );
}
