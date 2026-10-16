// The ONLY module that touches localStorage. Game code calls these functions, so
// a backend could replace localStorage later without changing any game.
//
// Every read and write is wrapped in try/catch: storage can be unavailable
// (private windows, blocked storage, quota) and the game must still work.
// Keys are namespaced and versioned: dg:v1:<game>:<key>.
//
// We store history (a result per puzzle day), not counters. Streaks and stats
// are derived from history later.

const PREFIX = "dg:v1";

function key(game: string, name: string): string {
  return `${PREFIX}:${game}:${name}`;
}

function read<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(k: string, value: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    // Storage unavailable or full: the game continues, it just won't be remembered.
  }
}

function remove(k: string): void {
  try {
    localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

/** Every finished puzzle's result, keyed by puzzle number. */
export function getHistory<T>(game: string): Record<number, T> {
  return read<Record<number, T>>(key(game, "history")) ?? {};
}

export function getResult<T>(game: string, day: number): T | null {
  return getHistory<T>(game)[day] ?? null;
}

export function saveResult<T>(game: string, day: number, result: T): void {
  write(key(game, "history"), { ...getHistory<T>(game), [day]: result });
  write(key(game, "lastPlayed"), day);
  notify();
}

export function getLastPlayed(game: string): number | null {
  return read<number>(key(game, "lastPlayed"));
}

/** A half-finished puzzle, so a reload resumes where the player left off. */
export function getInProgress<T>(game: string, day: number): T | null {
  const saved = read<{ day: number; state: T }>(key(game, "inProgress"));
  return saved && saved.day === day ? saved.state : null;
}

export function saveInProgress<T>(game: string, day: number, state: T): void {
  write(key(game, "inProgress"), { day, state });
}

export function clearInProgress(game: string): void {
  remove(key(game, "inProgress"));
}

/** A small per-game setting (sound on/off, intro seen, ...). Use game "site" for site-wide ones. */
export function getSetting<T>(game: string, name: string, fallback: T): T {
  return read<T>(key(game, `setting:${name}`)) ?? fallback;
}

export function setSetting<T>(game: string, name: string, value: T): void {
  write(key(game, `setting:${name}`), value);
  notify();
}

// Change notifications, so components can re-read storage (e.g. with
// useSyncExternalStore) when a result is saved here or in another tab.
const EVENT = "dg-storage";

function notify(): void {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // not in a browser (tests, build): nothing to notify
  }
}

/** Calls `onChange` whenever stored data changes (this tab or another). Returns an unsubscribe. */
export function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
