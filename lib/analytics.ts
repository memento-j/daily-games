// Privacy-friendly analytics with Umami Cloud (umami.is): no cookies, no personal
// data, nothing stored on the player's device for it, so no consent banner is needed.
// Umami counts page views by itself; the game events below are sent with `track`.
//
// The launch metric is day-2 and day-7 returns. Umami can't follow a person across
// days, so each browser sends one `daily_visit` a day carrying how many days it has
// been since its first visit (0 = the first day): day-2 returns are the browsers that
// send day 1, day-7 returns those that send day 6, as a share of those that sent day 0.
//
// Plays of a preview puzzle carry `preview: true`; leave them out of launch numbers.

import { getSetting, setSetting } from "./storage";

/** This website's id in Umami (dashboard → Websites → the site → Edit). Not a secret:
 *  it's in every page's HTML. Empty = analytics off. */
export const UMAMI_WEBSITE_ID = "";
/** Only visits to these addresses are counted, so local development and other copies
 *  of the site don't pollute the numbers. */
export const ANALYTICS_HOSTS = ["pondo.games"];

type Game = "slice" | "downstream";
type Play = { game: Game; puzzle: number; preview: boolean };

/** Every event the site sends, and what each carries. */
export type Events = {
  daily_visit: { day: number };
  puzzle_started: Play;
  drop_decided: Play & { drop: number; stage: number; result: "correct" | "wrong" | "no guess" };
  round_cut: Play & { round: number; mode: string; attempt: number; score: number };
  puzzle_finished: Play & { points: number; maxPoints: number };
  result_shared: { game: Game; outcome: "shared" | "copied" | "failed" };
  sound_toggled: { game: Game; muted: boolean };
  intro_dismissed: { game: Game };
};

type Umami = { track: (name: string, data?: object) => void };

// Events sent before Umami's script has loaded wait here (components/Analytics.tsx
// flushes them once it has).
const pending: [string, object][] = [];

function umami(): Umami | null {
  return (window as unknown as { umami?: Umami }).umami ?? null;
}

export function analyticsEnabled(): boolean {
  return typeof window !== "undefined" && UMAMI_WEBSITE_ID !== "" && ANALYTICS_HOSTS.includes(location.hostname);
}

export function track<K extends keyof Events>(name: K, data: Events[K]): void {
  if (!analyticsEnabled()) return;
  try {
    const u = umami();
    if (u) u.track(name, data);
    else pending.push([name, data]);
  } catch {
    // Analytics must never break the game.
  }
}

/** Sends the events that were waiting for Umami's script. */
export function flushPending(): void {
  const u = umami();
  if (!u) return;
  for (const [name, data] of pending.splice(0)) {
    try {
      u.track(name, data);
    } catch {
      // ignore
    }
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The player's local calendar day as a whole number (days since 1970), the same way
 *  lib/daily.ts counts days, so daylight saving can't shift it. */
export function localDay(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
}

/** Days since the first visit, 0 on the first day. Capped: past two months the exact
 *  number doesn't matter, and fewer distinct values keep Umami's breakdowns readable. */
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
