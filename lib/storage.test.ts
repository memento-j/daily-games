import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInProgress,
  getHistory,
  getInProgress,
  getLastPlayed,
  getResult,
  saveInProgress,
  saveResult,
} from "./storage";

// Tests run in Node, which has no localStorage: stand in a simple in-memory one.
function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

let storage: ReturnType<typeof fakeStorage>;
beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("results history", () => {
  it("saves results per day and remembers the last day played", () => {
    saveResult("downstream", 3, { points: 12 });
    saveResult("downstream", 4, { points: 7 });
    expect(getResult("downstream", 3)).toEqual({ points: 12 });
    expect(getHistory("downstream")).toEqual({ 3: { points: 12 }, 4: { points: 7 } });
    expect(getLastPlayed("downstream")).toBe(4);
  });

  it("uses namespaced, versioned keys and keeps games separate", () => {
    saveResult("downstream", 1, { points: 1 });
    expect([...storage.data.keys()]).toContain("dg:v1:downstream:history");
    expect(getResult("othergame", 1)).toBeNull();
  });

  it("returns empty values when nothing is stored", () => {
    expect(getHistory("downstream")).toEqual({});
    expect(getResult("downstream", 1)).toBeNull();
    expect(getLastPlayed("downstream")).toBeNull();
  });
});

describe("in-progress state", () => {
  it("only resumes the same day", () => {
    saveInProgress("downstream", 5, { drop: 2 });
    expect(getInProgress("downstream", 5)).toEqual({ drop: 2 });
    expect(getInProgress("downstream", 6)).toBeNull();
    clearInProgress("downstream");
    expect(getInProgress("downstream", 5)).toBeNull();
  });
});

describe("when storage is unavailable", () => {
  it("never throws, and reads come back empty", () => {
    const boom = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: boom, setItem: boom, removeItem: boom });
    expect(() => saveResult("downstream", 1, { points: 1 })).not.toThrow();
    expect(() => saveInProgress("downstream", 1, {})).not.toThrow();
    expect(() => clearInProgress("downstream")).not.toThrow();
    expect(getHistory("downstream")).toEqual({});
    expect(getInProgress("downstream", 1)).toBeNull();
  });

  it("ignores corrupted data", () => {
    storage.data.set("dg:v1:downstream:history", "{not json");
    expect(getHistory("downstream")).toEqual({});
  });
});
