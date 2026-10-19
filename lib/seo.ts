// Search and link-preview metadata shared by every page.
//
// Next.js merges metadata from the layout and the page *shallowly*: a page that sets
// `openGraph` replaces the layout's whole `openGraph` object. So each page builds its
// full set here, from a title, a description and its path. The preview image itself
// is not set here: it's the `opengraph-image.png` file next to each page
// (scripts/brand/make_og.py), which Next.js adds on its own.

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

type Page = {
  title: string; // the page's own title; the layout's template adds " · Pondo"
  description: string;
  path: string; // "/slice/" (with the trailing slash the site uses)
  absoluteTitle?: boolean; // true: use `title` as it is, with no " · Pondo" added
};

export function pageMetadata({ title, description, path, absoluteTitle }: Page): Metadata {
  const full = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    // The one true address of this page: ?puzzle=N links count as this page, not as
    // copies of it (and once pondo.games is live, so does the workers.dev address).
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: SITE_NAME, type: "website", locale: "en_US" },
    // X shows the big image card only when asked to; it reads the Open Graph image.
    twitter: { card: "summary_large_image", title: full, description },
  };
}

/** A full address on the site, for structured data (which can't use relative links). */
export function absolute(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** Structured data (schema.org JSON-LD) for a game page: what the game is, plus the
 *  breadcrumb Google may show above the result ("Pondo › Slice"). */
export function gameJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        name,
        description,
        url: absolute(path),
        image: absolute(`${path}opengraph-image.png`),
        genre: ["Puzzle", "Geography", "Daily puzzle"],
        gamePlatform: "Web browser",
        applicationCategory: "Game",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
        publisher: { "@id": absolute("/#organization") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absolute("/") },
          { "@type": "ListItem", position: 2, name, item: absolute(path) },
        ],
      },
    ],
  };
}

/** Structured data for the homepage: the site (its name, for the name Google shows
 *  above results) and who makes it (with the logo). */
export function siteJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": absolute("/#website"), name: SITE_NAME, url: absolute("/"), description, publisher: { "@id": absolute("/#organization") } },
      { "@type": "Organization", "@id": absolute("/#organization"), name: SITE_NAME, url: absolute("/"), logo: absolute("/icon-512.png") },
    ],
  };
}
