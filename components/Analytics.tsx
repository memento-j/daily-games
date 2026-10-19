"use client";

// Loads Umami's script (lib/analytics.ts) on every page, after the page is interactive
// so it never slows the game down, and sends the once-a-day visit. Renders nothing
// while UMAMI_WEBSITE_ID is empty.
//
// `data-domains` makes Umami itself ignore any other address too (local development).

import Script from "next/script";
import { useEffect } from "react";
import { ANALYTICS_HOSTS, UMAMI_WEBSITE_ID, flushPending, trackDailyVisit } from "@/lib/analytics";

export default function Analytics() {
  useEffect(() => {
    trackDailyVisit();
  }, []);
  if (!UMAMI_WEBSITE_ID) return null;
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id={UMAMI_WEBSITE_ID}
      data-domains={ANALYTICS_HOSTS.join(",")}
      strategy="afterInteractive"
      onLoad={flushPending}
    />
  );
}
