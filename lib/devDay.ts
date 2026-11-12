// Dev only: pretend today is another puzzle day, to check streaks across days.
//
//   http://localhost:3000/slice/?debugDay=20   today is puzzle #20 (for this tab, until changed)
//   ?debugDay=off                              back to the real day
//
// Kept in sessionStorage, so it holds while moving between pages in that tab. Production
// builds never read it (NODE_ENV is fixed at build time). While it's on, no scores are queued
// for the scores API (lib/scores.ts): a made-up day must never reach any database.

const KEY = "dg:dev:debugDay";

export function debugDay(): number | null {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return null;
  try {
    const param = new URLSearchParams(window.location.search).get("debugDay");
    if (param === "off") sessionStorage.removeItem(KEY);
    else if (param && /^\d+$/.test(param)) sessionStorage.setItem(KEY, param);
    const saved = sessionStorage.getItem(KEY);
    return saved ? Number(saved) : null;
  } catch {
    return null;
  }
}
