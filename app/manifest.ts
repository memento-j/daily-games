// The web app manifest (/manifest.webmanifest): lets phones add Pondo to the home
// screen as an app, with its name, colours and icons (made by scripts/brand/make_icons.py).
// Generated at build time, so it works in the static export.

import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Quick daily puzzles that are easy to start and hard to put down.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef0ec",
    theme_color: "#1d2533",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
