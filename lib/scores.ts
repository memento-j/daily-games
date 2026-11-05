// Score percentiles: how a player's finished daily puzzle compares with everyone else's,
// from the scores API (API_URL in lib/site.ts). The game must never depend on it: every
// call here times out, never throws into a screen, and a failure only means the results
// screen leaves the comparison out.
//
// A finished puzzle goes into a small "outbox" in storage first and leaves it once the
// server has answered, so a failed submit is simply still there at the next site load.
// Submitting twice is safe: the server ignores the duplicate and still returns the data.
//
// Pure parts (percentile, buckets) first; they're unit tested.

import { track } from "./analytics";
import { API_URL } from "./site";
import { getSetting, removeOldDeviceId, setSetting } from "./storage";

export type ScoreGame = "slice" | "downstream";

export type ScoreCount = { score: number; count: number };
export type RoundScoreCount = ScoreCount & { round: number }; // round is 1-based
export type ScoresResponse = { totalScores: ScoreCount[]; roundScores: RoundScoreCount[] };

/** A finished daily puzzle, as sent. `deviceId` is what the API calls it, but it's random
 *  per puzzle (newScoreId), saved with that puzzle's result, and links nothing across days. */
export type ScoreSubmission = {
  deviceId: string;
  game: ScoreGame;
  puzzle: number;
  totalScore: number;
  roundScores: number[];
  hintsUsed: boolean[];
};

/** How each game's scores group into bars. Downstream's scores are small whole numbers, so
 *  each one is its own bar; on both games the total's chart is about 20 bars. */
export const CHART_SCALES: Record<ScoreGame, { maxRound: number; rounds: number; totalBucket: number; roundBucket: number }> = {
  slice: { maxRound: 100, rounds: 4, totalBucket: 20, roundBucket: 5 },
  downstream: { maxRound: 4, rounds: 5, totalBucket: 1, roundBucket: 1 },
};

export function playerCount(counts: ScoreCount[]): number {
  return counts.reduce((sum, c) => sum + c.count, 0);
}

/** "Better than X%": players with a lower score over all players, rounded. Ties don't
 *  count as better. 100 only if the player truly beat everyone listed. */
export function betterThanPercent(counts: ScoreCount[], score: number): number {
  const total = playerCount(counts);
  if (total === 0) return 0;
  const lower = counts.reduce((sum, c) => (c.score < score ? sum + c.count : sum), 0);
  const percent = Math.round((lower / total) * 100);
  return lower < total ? Math.min(percent, 99) : percent;
}

/** Is the player the only one on this puzzle? (Worked out after includePlayer.) */
export function isFirstPlayer(counts: ScoreCount[]): boolean {
  return playerCount(counts) <= 1;
}

/** A read (GET) can be up to 60 s old, so it may not count the player yet, which would leave
 *  their own bar empty. If their exact total or any round's exact score isn't listed, they
 *  can't have been counted, so they're added: to each missing score and, as they're one more
 *  player whichever was missing, to their total's bar, which is what player counts and the
 *  percentile are worked out from. Run once on the data, so chart and percentile agree. */
export function includePlayer(data: ScoresResponse, total: number, rounds: number[]): ScoresResponse {
  const listed = (counts: ScoreCount[], score: number) => counts.some((c) => c.score === score && c.count > 0);
  const missingRounds = rounds.map((score, i) => ({ round: i + 1, score })).filter((r) => !listed(data.roundScores.filter((c) => c.round === r.round), r.score));
  if (listed(data.totalScores, total) && missingRounds.length === 0) return data;
  const addOne = <T extends ScoreCount>(counts: T[], match: (c: T) => boolean, extra: T): T[] =>
    counts.some(match) ? counts.map((c) => (match(c) ? { ...c, count: c.count + 1 } : c)) : [...counts, extra];
  return {
    totalScores: addOne(data.totalScores, (c) => c.score === total, { score: total, count: 1 }),
    roundScores: missingRounds.reduce(
      (counts, r) => addOne(counts, (c) => c.round === r.round && c.score === r.score, { round: r.round, score: r.score, count: 1 }),
      data.roundScores,
    ),
  };
}

/** The average score, for the chart's marker. */
export function averageScore(counts: ScoreCount[]): number {
  const total = playerCount(counts);
  return total === 0 ? 0 : counts.reduce((sum, c) => sum + c.score * c.count, 0) / total;
}

/** Where a score sits across a chart of bars `size` wide, 0..1. With a bar per score (size
 *  1), a score sits at its bar's middle; wider bars cover a range, so it runs edge to edge. */
export function chartX(score: number, max: number, size: number): number {
  return size === 1 ? (score + 0.5) / (max + 1) : score / max;
}

export type Bucket = { from: number; to: number; count: number };

/** Groups scores from 0 to `max` into bars `size` wide. The last bar takes `max` itself
 *  too (380-400), so a perfect score doesn't get a bar of its own, unless each score
 *  already has one (size 1). */
export function buckets(counts: ScoreCount[], max: number, size: number): Bucket[] {
  const bars = size === 1 ? max + 1 : Math.ceil(max / size);
  const out: Bucket[] = Array.from({ length: bars }, (_, i) => ({
    from: i * size,
    to: i === bars - 1 ? max : (i + 1) * size - 1,
    count: 0,
  }));
  for (const { score, count } of counts) out[bucketIndex(score, bars, size)].count += count;
  return out;
}

export function bucketIndex(score: number, bars: number, size: number): number {
  return Math.max(0, Math.min(Math.floor(score / size), bars - 1));
}

// ---- The server ----

const TIMEOUT_MS = 4000;

/** The server turned this submission down (a bad request): retrying won't help. */
class Rejected extends Error {}

function isCount(c: unknown): c is ScoreCount {
  const v = c as ScoreCount | null;
  return typeof v?.score === "number" && typeof v?.count === "number";
}

function isScoresResponse(data: unknown): data is ScoresResponse {
  const d = data as ScoresResponse | null;
  return Array.isArray(d?.totalScores) && Array.isArray(d?.roundScores) && d.totalScores.every(isCount) && d.roundScores.every(isCount);
}

async function request(path: string, init?: RequestInit): Promise<ScoresResponse> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, signal: abort.signal });
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw new Rejected();
    if (!res.ok) throw new Error(`scores API: ${res.status}`);
    const data: unknown = await res.json();
    if (!isScoresResponse(data)) throw new Error("scores API: unexpected response");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ---- The outbox ----

const OUTBOX = "pendingScores";
const OUTBOX_LIMIT = 30; // a device offline for a month shouldn't grow this for ever

const idOf = (s: Pick<ScoreSubmission, "game" | "puzzle">) => `${s.game}:${s.puzzle}`;

/** A fresh id for one puzzle's score. The game saves it with that puzzle's result; retries
 *  reuse it, so the server's duplicate check (game + puzzle + id) still works. Null if the
 *  browser can't make one (old browser, or a page not on https): that score isn't sent. */
export function newScoreId(): string | null {
  try {
    return crypto.randomUUID();
  } catch {
    return null;
  }
}

// Also kept for this page's life, so a submit still happens with storage blocked.
const session = new Map<string, ScoreSubmission>();
// One request per submission at a time, whoever asks (results screen, site load).
const inFlight = new Map<string, Promise<ScoresResponse>>();

function outbox(): ScoreSubmission[] {
  const stored = getSetting<ScoreSubmission[]>("site", OUTBOX, []);
  // Entries from before ids were per puzzle have none, and the old id is gone: left unsent.
  const saved = (Array.isArray(stored) ? stored : []).filter((s) => s.deviceId);
  return [...saved, ...[...session.values()].filter((s) => !saved.some((o) => idOf(o) === idOf(s)))];
}

function removeFromOutbox(s: ScoreSubmission): void {
  session.delete(idOf(s));
  setSetting("site", OUTBOX, outbox().filter((o) => idOf(o) !== idOf(s)));
}

/** The game calls this as a daily puzzle finishes (never for practice). */
export function queueScore(s: ScoreSubmission): void {
  session.set(idOf(s), s);
  setSetting("site", OUTBOX, [...outbox().filter((o) => idOf(o) !== idOf(s)), s].slice(-OUTBOX_LIMIT));
}

function send(s: ScoreSubmission): Promise<ScoresResponse> {
  const id = idOf(s);
  const running = inFlight.get(id);
  if (running) return running;
  const attempt = (async () => {
    try {
      const data = await request("/api/v1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      removeFromOutbox(s);
      track("score_submitted", { game: s.game, puzzle: s.puzzle, success: true });
      return data;
    } catch (e) {
      if (e instanceof Rejected) removeFromOutbox(s);
      track("score_submitted", { game: s.game, puzzle: s.puzzle, success: false });
      throw e;
    } finally {
      inFlight.delete(id);
    }
  })();
  inFlight.set(id, attempt);
  return attempt;
}

// What this page already knows, so reopening a summary doesn't ask again, and doesn't swap
// the POST's answer for a cached GET that may not include the player yet.
const known = new Map<string, LoadedScores>();

/** The server's counts, and whether they came from a read, which may not count the player
 *  yet (a submit's answer always does). */
export type LoadedScores = { data: ScoresResponse; fromRead: boolean };

/** The comparison for a finished puzzle: submits it if it's still in the outbox, otherwise
 *  only reads. Rejects when the server can't be reached; callers leave the comparison out. */
export async function loadComparison(game: ScoreGame, puzzle: number): Promise<LoadedScores> {
  const id = idOf({ game, puzzle });
  const had = known.get(id);
  if (had) return had;
  const queued = outbox().find((s) => idOf(s) === id);
  const loaded = queued ? { data: await send(queued), fromRead: false } : { data: await request(`/api/v1/scores?game=${game}&puzzle=${puzzle}`), fromRead: true };
  known.set(id, loaded);
  return loaded;
}

/** At each site load: clears the old permanent id, and retries failed submits, one at a
 *  time, stopping at the first failure (the server is probably still away). */
export async function flushScores(): Promise<void> {
  removeOldDeviceId();
  for (const s of outbox()) {
    try {
      known.set(idOf(s), { data: await send(s), fromRead: false });
    } catch (e) {
      if (!(e instanceof Rejected)) return;
    }
  }
}
