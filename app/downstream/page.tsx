import type { Metadata } from "next";
import TrackerHome from "./TrackerHome";

// Downstream's front page. A Server Component: everything live inside it (the 3D
// map, today's date) lives in Client Components and runs in the browser.

export const metadata: Metadata = {
  title: "Downstream",
  description: "A raindrop lands somewhere on Earth. Follow it downhill and guess which sea it reaches. Five drops a day.",
};

export default function DownstreamPage() {
  return <TrackerHome />;
}
