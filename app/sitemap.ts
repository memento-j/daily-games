// /sitemap.xml: the list of pages search engines should know about. Generated at build
// time (static export needs `force-static`). Puzzle links (?puzzle=N) are left out:
// they're the same page.

import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";
import { countryPages } from "./countries/data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date();
  return [
    { url: absolute("/"), lastModified: built, changeFrequency: "daily", priority: 1 },
    { url: absolute("/slice/"), lastModified: built, changeFrequency: "daily", priority: 0.9 },
    { url: absolute("/downstream/"), lastModified: built, changeFrequency: "daily", priority: 0.9 },
    { url: absolute("/countries/"), lastModified: built, changeFrequency: "weekly", priority: 0.7 },
    ...countryPages().map((p) => ({ url: absolute(p.path), lastModified: built, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: absolute("/about/"), lastModified: built, changeFrequency: "monthly", priority: 0.5 },
    { url: absolute("/privacy/"), lastModified: built, changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/contact/"), lastModified: built, changeFrequency: "yearly", priority: 0.3 },
  ];
}
