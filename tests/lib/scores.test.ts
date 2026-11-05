import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { averageScore, betterThanPercent, bucketIndex, buckets, chartX, flushScores, includePlayer, isFirstPlayer, loadComparison, newScoreId, playerCount, queueScore, type ScoreSubmission } from "../../lib/scores";
import { getSetting } from "../../lib/storage";

const counts = [
  { score: 100, count: 3 },
  { score: 200, count: 5 },
  { score: 300, count: 2 },
];

describe("percentile", () => {
  it("counts players with a lower score, and ties aren't better", () => {
    expect(playerCount(counts)).toBe(10);
    expect(betterThanPercent(counts, 200)).toBe(30);
    expect(betterThanPercent(counts, 100)).toBe(0);
    expect(betterThanPercent(counts, 300)).toBe(80);
  });

  it("is 0 with nobody listed", () => {
    expect(betterThanPercent([], 200)).toBe(0);
  });

  it("doesn't round up to 100 while someone else scored as high", () => {
    expect(betterThanPercent([{ score: 1, count: 999 }, { score: 2, count: 1 }], 2)).toBe(99);
    expect(betterThanPercent([{ score: 1, count: 5 }], 2)).toBe(100);
  });
});

describe("the chart", () => {
  it("averages the scores", () => {
    expect(averageScore([{ score: 10, count: 1 }, { score: 20, count: 3 }])).toBe(17.5);
    expect(averageScore([])).toBe(0);
  });

  it("places scores across the chart", () => {
    expect(chartX(200, 400, 20)).toBe(0.5);
    expect(chartX(10, 20, 1)).toBe(0.5);
    expect(chartX(0, 4, 1)).toBeCloseTo(0.1);
  });
});

describe("the standing", () => {
  it("is first only when there's nobody else", () => {
    expect(isFirstPlayer([{ score: 50, count: 1 }])).toBe(true);
    expect(isFirstPlayer([{ score: 50, count: 2 }])).toBe(false);
  });

  it("doesn't count a tie as beaten", () => {
    expect(betterThanPercent([{ score: 50, count: 2 }], 50)).toBe(0);
    expect(betterThanPercent([{ score: 10, count: 1 }, { score: 50, count: 2 }], 50)).toBe(33);
  });
});

describe("includePlayer", () => {
  const data = {
    totalScores: [{ score: 100, count: 4 }],
    roundScores: [{ round: 1, score: 60, count: 4 }, { round: 2, score: 40, count: 4 }],
  };

  it("leaves the data alone when the player's scores are all listed", () => {
    expect(includePlayer(data, 100, [60, 40])).toBe(data);
  });

  it("adds a player who isn't counted to their total and every missing round", () => {
    const out = includePlayer(data, 120, [70, 50]);
    expect(out.totalScores).toEqual([{ score: 100, count: 4 }, { score: 120, count: 1 }]);
    expect(out.roundScores).toContainEqual({ round: 1, score: 70, count: 1 });
    expect(out.roundScores).toContainEqual({ round: 2, score: 50, count: 1 });
    expect(playerCount(out.totalScores)).toBe(5);
  });

  it("counts them once when only a round shows they're missing", () => {
    const out = includePlayer(data, 100, [60, 50]);
    expect(out.totalScores).toEqual([{ score: 100, count: 5 }]);
    expect(out.roundScores).toContainEqual({ round: 1, score: 60, count: 4 });
    expect(out.roundScores).toContainEqual({ round: 2, score: 50, count: 1 });
    expect(playerCount(out.totalScores)).toBe(5);
  });

  it("fills a listed score whose count is 0, and handles an empty day", () => {
    expect(includePlayer({ totalScores: [{ score: 9, count: 0 }], roundScores: [] }, 9, []).totalScores).toEqual([{ score: 9, count: 1 }]);
    expect(playerCount(includePlayer({ totalScores: [], roundScores: [] }, 9, [9]).totalScores)).toBe(1);
  });

  it("raises the player count behind the percentile", () => {
    const out = includePlayer(data, 120, [70, 50]);
    expect(betterThanPercent(out.totalScores, 120)).toBe(80);
  });
});

describe("buckets", () => {
  it("groups Slice's total into 20s, the last taking 400 too", () => {
    const bars = buckets([{ score: 0, count: 1 }, { score: 19, count: 1 }, { score: 20, count: 1 }, { score: 400, count: 2 }], 400, 20);
    expect(bars).toHaveLength(20);
    expect(bars[0]).toEqual({ from: 0, to: 19, count: 2 });
    expect(bars[1].count).toBe(1);
    expect(bars[19]).toEqual({ from: 380, to: 400, count: 2 });
  });

  it("gives each of Downstream's scores its own bar", () => {
    const bars = buckets([{ score: 4, count: 3 }], 4, 1);
    expect(bars.map((b) => b.from)).toEqual([0, 1, 2, 3, 4]);
    expect(bars[4]).toEqual({ from: 4, to: 4, count: 3 });
  });

  it("keeps a score outside the range on the chart", () => {
    expect(bucketIndex(500, 20, 20)).toBe(19);
    expect(bucketIndex(-5, 20, 20)).toBe(0);
  });
});

describe("submitting", () => {
  const response = { totalScores: [{ score: 230, count: 1 }], roundScores: [] };
  const ok = () => ({ ok: true, status: 200, json: async () => response });
  const pending = () => getSetting<ScoreSubmission[]>("site", "pendingScores", []);
  const score = (puzzle: number): ScoreSubmission => ({ deviceId: `id-${puzzle}`, game: "slice", puzzle, totalScore: 230, roundScores: [70, 40, 90, 30], hintsUsed: [false, true, false, false] });
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
      removeItem: (k: string) => void delete store[k],
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs a queued score with the device id, once, and empties the outbox", async () => {
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchMock);
    queueScore(score(1001));
    const [a, b] = await Promise.all([loadComparison("slice", 1001), flushScores()]);
    expect(a).toEqual({ data: response, fromRead: false });
    expect(b).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/scores$/);
    expect(JSON.parse(init.body as string)).toEqual(score(1001));
    expect(pending()).toEqual([]);
  });

  it("GETs when there's nothing to submit", async () => {
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchMock);
    expect((await loadComparison("downstream", 1002)).fromRead).toBe(true);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/api\/v1\/scores\?game=downstream&puzzle=1002$/);
  });

  it("keeps a failed submit for the next site load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    queueScore(score(1003));
    await expect(loadComparison("slice", 1003)).rejects.toThrow();
    expect(pending().map((s) => s.puzzle)).toEqual([1003]);

    vi.stubGlobal("fetch", vi.fn(async () => ok()));
    await flushScores();
    expect(pending()).toEqual([]);
  });

  it("drops a submit the server turns down, since retrying can't help", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => ({}) })));
    queueScore(score(1004));
    await expect(loadComparison("slice", 1004)).rejects.toThrow();
    expect(pending()).toEqual([]);
  });

  it("treats a 500 as worth retrying and a strange reply as a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    queueScore(score(1005));
    await expect(loadComparison("slice", 1005)).rejects.toThrow();
    expect(pending().map((s) => s.puzzle)).toEqual([1005]);

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ nope: 1 }) })));
    await expect(loadComparison("slice", 1006)).rejects.toThrow();
  });

  it("reuses a puzzle's id on a retry, and makes a different one for each puzzle", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    queueScore(score(1008));
    await expect(loadComparison("slice", 1008)).rejects.toThrow();
    const retry = vi.fn(async () => ok());
    vi.stubGlobal("fetch", retry);
    await loadComparison("slice", 1008);
    expect(JSON.parse((retry.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).deviceId).toBe("id-1008");
    expect(newScoreId()).not.toBe(newScoreId());
  });

  it("removes the old permanent id, and leaves unsent any score that only had that", async () => {
    store.pondo_device_id = "old";
    const legacy: Partial<ScoreSubmission> = score(1009);
    delete legacy.deviceId;
    store["dg:v1:site:setting:pendingScores"] = JSON.stringify([legacy]);
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchMock);
    await flushScores();
    expect(store.pondo_device_id).toBeUndefined();
    expect(fetchMock.mock.calls.map((c) => String((c as unknown as [string, RequestInit])[1].body))).not.toContainEqual(expect.stringContaining("1009"));
  });

  it("gives up after 4 seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_: string, init: RequestInit) => new Promise((_res, rej) => {
      init.signal?.addEventListener("abort", () => rej(new Error("aborted")));
    })));
    const load = loadComparison("slice", 1007);
    const caught = expect(load).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(4000);
    await caught;
    vi.useRealTimers();
  });
});
