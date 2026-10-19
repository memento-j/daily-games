// /robots.txt: tells search engines they may read every page, and where the sitemap is.
// The puzzle files (/data/) are allowed too: they're fetched by the pages, and blocking
// them would stop Google from seeing the game as players do.

import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absolute("/sitemap.xml"),
  };
}
