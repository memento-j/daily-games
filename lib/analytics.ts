// Privacy-friendly analytics with PostHog (EU cloud), in cookieless mode: no cookies and
// nothing of PostHog's stored on the player's device, so no consent banner is needed.
// PostHog counts page views by itself; the game events below are sent with `track`.
//
// The launch questions are just two: do players finish, and do they come back. So the
// events are few on purpose: puzzle_started / puzzle_finished, and daily_visit.
//
// Cookieless PostHog can't follow a person across days, so each browser sends one
// `daily_visit` a day carrying how many days it has been since its first visit (0 = the
// first day): day-2 returns are the browsers that send day 1, day-7 returns those that
// send day 6, as a share of those that sent day 0.
//
// Plays of a preview puzzle carry `preview: true`; leave them out of launch numbers.

import { getSetting, setSetting } from "./storage";

/** The PostHog project's API key (Settings → Project → General). Not a secret: it's in
 *  every page's JavaScript. Empty = analytics off. */
export const POSTHOG_KEY: string ="phc_oMKn3T9PjE2u8ncHPsvgabnRkeLf7poJ3JYBEFhqyMqS";
/** The project lives in PostHog's EU region (eu.posthog.com); a key only works there. */
const POSTHOG_HOST = "https://eu.i.posthog.com";
const POSTHOG_SCRIPT = "https://eu-assets.i.posthog.com/static/array.js";
/** Only visits to these addresses are counted, so local development and other copies
 *  of the site don't pollute the numbers. */
export const ANALYTICS_HOSTS = ["pondo.games"];

type Game = "slice" | "downstream";
type Play = { game: Game; puzzle: number; preview: boolean };

/** Every event the site sends, and what each carries. */
export type Events = {
  daily_visit: { day: number };
  puzzle_started: Play;
  puzzle_finished: Play & { points: number; maxPoints: number };
};

type PostHog = { __loaded?: boolean; capture: (name: string, data?: object) => void };

// Events sent before PostHog's script has loaded wait here (flushed by loadAnalytics).
const pending: [string, object][] = [];

function posthog(): PostHog | null {
  const p = (window as unknown as { posthog?: PostHog }).posthog;
  return p?.__loaded ? p : null;
}

export function analyticsEnabled(): boolean {
  return typeof window !== "undefined" && POSTHOG_KEY !== "" && ANALYTICS_HOSTS.includes(location.hostname);
}

export function track<K extends keyof Events>(name: K, data: Events[K]): void {
  if (!analyticsEnabled()) return;
  try {
    const p = posthog();
    if (p) p.capture(name, data);
    else pending.push([name, data]);
  } catch {
    // Analytics must never break the game.
  }
}

/** Loads PostHog's script once (components/Analytics.tsx calls it after the page is
 *  interactive), then sends the events that were waiting for it. */
export function loadAnalytics(): void {
  if (!analyticsEnabled() || document.getElementById("posthog-js")) return;
  // PostHog's script looks for this placeholder (what its official snippet sets up),
  // runs the queued `init` with our settings and replaces it with the real library.
  const config = {
    api_host: POSTHOG_HOST,
    defaults: "2026-05-30",
    cookieless_mode: "always", // no cookies, no ids on the device
    persistence: "memory",
    autocapture: false, // only the events below and page views
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    enable_heatmaps: false,
    advanced_disable_flags: true,
  };
  (window as unknown as { posthog: unknown }).posthog = Object.assign([], { __SV: 1, _i: [[POSTHOG_KEY, config]], people: [] });
  const script = document.createElement("script");
  script.id = "posthog-js";
  script.src = POSTHOG_SCRIPT;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.onload = () => {
    const p = posthog();
    if (!p) return;
    for (const [name, data] of pending.splice(0)) {
      try {
        p.capture(name, data);
      } catch {
        // ignore
      }
    }
  };
  document.head.appendChild(script);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The player's local calendar day as a whole number (days since 1970), the same way
 *  lib/daily.ts counts days, so daylight saving can't shift it. */
export function localDay(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
}

/** Days since the first visit, 0 on the first day. Capped: past two months the exact
 *  number doesn't matter, and fewer distinct values keep the breakdowns readable. */
export function visitDay(firstDay: number, today: number): number {
  return Math.min(Math.max(0, today - firstDay), 60);
}

/** Once a day per browser: remember the first visit, then send `daily_visit`. */
export function trackDailyVisit(now = new Date()): void {
  if (!analyticsEnabled()) return;
  const today = localDay(now);
  let first = getSetting<number | null>("site", "firstVisit", null);
  if (first === null) {
    first = today;
    setSetting("site", "firstVisit", today);
  }
  if (getSetting<number | null>("site", "lastVisitSent", null) === today) return;
  setSetting("site", "lastVisitSent", today);
  track("daily_visit", { day: visitDay(first, today) });
}
