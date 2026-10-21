"use client";

// Loads PostHog (lib/analytics.ts) on every page once the page is interactive, so it
// never slows the game down, and sends the once-a-day visit. Does nothing away from
// pondo.games (local development) or while POSTHOG_KEY is empty. Renders nothing.

import { useEffect } from "react";
import { loadAnalytics, trackDailyVisit } from "@/lib/analytics";

export default function Analytics() {
  useEffect(() => {
    trackDailyVisit();
    loadAnalytics();
  }, []);
  return null;
}
