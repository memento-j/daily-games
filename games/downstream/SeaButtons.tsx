"use client";

// The option seas as buttons on the map, where each sea is (phone and desktop).
// Tapping one picks it; the game screen then asks the player to lock it in, so a
// stray click never costs a drop. "Hide seas" takes them off to see the whole map.

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { GameState } from "./game";
import type { Project } from "./RouteMap";
import { sound } from "./sound";
import type { LngLat } from "./types";

type Spot = { name: string; x: number; y: number };

/**
 * Size of an element, kept up to date. Returns a callback ref, so measuring starts
 * whenever the element appears (it may render later than the component mounts).
 */
export function useSize<T extends HTMLElement>(): [(el: T | null) => void, { width: number; height: number }] {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size];
}

/**
 * The sea the player has picked but not locked in. Tied to the current drop and
 * stage, so moving on (or letting the water flow, which changes the points) clears it.
 */
export function usePick(game: GameState): [string | null, (name: string | null) => void] {
  const [pick, setPick] = useState<{ name: string; at: string } | null>(null);
  const at = `${game.drop}:${game.stage}`;
  const picked = pick?.at === at ? pick.name : null;
  return [picked, (name) => setPick(name ? { name, at } : null)];
}

/** The option seas' screen positions, which change on every camera frame. */
export type SpotStore = { get: () => Spot[]; subscribe: (listener: () => void) => () => void };

/**
 * Where each option sea is on screen; pass `onCamera` to RouteMap and the store to
 * SeaButtons. The positions live in a small store that only SeaButtons listens to,
 * so a moving camera re-renders four buttons, not the whole game screen.
 */
export function useSeaSpots(labels?: Record<string, LngLat>): [(project: Project) => void, SpotStore] {
  const [store] = useState(() => {
    let spots: Spot[] = [];
    const listeners = new Set<() => void>();
    return {
      get: () => spots,
      set: (next: Spot[]) => {
        spots = next;
        listeners.forEach((l) => l());
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  });
  const onCamera = (project: Project) => {
    if (labels) store.set(Object.entries(labels).map(([name, ll]) => ({ name, ...project(ll) })));
  };
  return [onCamera, store];
}

const NO_SPOTS: Spot[] = [];

/** Keep the sea buttons inside the map's free area and off each other (a simple top-to-bottom nudge). */
function placeSpots(spots: Spot[], width: number, top: number, bottom: number, big: boolean): Spot[] {
  const half = big ? 90 : 66; // about half a button's width, to keep it on the map
  const gapX = big ? 170 : 120;
  const gapY = big ? 44 : 34;
  const placed: Spot[] = [];
  for (const s of [...spots].sort((a, b) => a.y - b.y)) {
    const x = Math.min(Math.max(s.x, half), width - half);
    let y = Math.min(Math.max(s.y, top), bottom);
    for (const o of placed) {
      if (Math.abs(o.x - x) < gapX && y - o.y < gapY) y = o.y + gapY;
    }
    placed.push({ ...s, x, y: Math.min(y, bottom) });
  }
  return placed;
}

/** The buttons themselves, laid over the map (the parent is the map's positioned wrapper). */
export function SeaButtons({
  spots,
  width,
  top,
  bottom,
  picked,
  onPick,
  size = "sm",
}: {
  /** "sm" on phones (keep the map visible), "md" on desktop's bigger map. */
  size?: "sm" | "md";
  spots: SpotStore;
  /** The map's width, and the free band (in px from its top) the buttons must stay within. */
  width: number;
  top: number;
  bottom: number;
  picked: string | null;
  onPick: (name: string) => void;
}) {
  const list = useSyncExternalStore(spots.subscribe, spots.get, () => NO_SPOTS);
  if (!width) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" role="group" aria-label="Which sea does this raindrop reach?">
      {placeSpots(list, width, top, Math.max(top + 40, bottom), size === "md").map((s) => {
        const on = s.name === picked;
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => {
              sound.tap();
              onPick(s.name);
            }}
            aria-pressed={on}
            style={{ left: s.x, top: s.y }}
            // Small to look at, bigger to touch: the ::after extends the tap area.
            className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full text-center leading-[1.15] font-bold ${
              size === "md" ? "max-w-[176px] px-4 py-2 text-[15px]" : "max-w-[124px] px-2.5 py-1 text-[12.5px]"
            } shadow-[0_3px_10px_-3px_rgb(18_26_43/0.35)] transition-[scale,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] after:absolute after:-inset-2 after:content-[''] active:scale-95 active:duration-100 motion-reduce:transition-none ${
              on ? "z-10 scale-110 bg-coral text-white ring-2 ring-white" : "bg-white/95 text-coral-deep ring-[1.5px] ring-coral/60 hover:bg-coral-soft"
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

/** "Hide seas" / "Show seas": takes the sea buttons (and names) off the map, to see all of it. */
export function HideSeasToggle({
  hidden,
  onToggle,
  className = "",
  style,
}: {
  hidden: boolean;
  onToggle: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sound.tap();
        onToggle();
      }}
      aria-pressed={hidden}
      style={style}
      className={`z-10 flex items-center gap-1.5 rounded-full bg-white/95 py-1.5 pr-3 pl-2.5 text-xs font-semibold text-ink-soft shadow-card transition-colors hover:text-coral-deep ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
        <circle cx="10" cy="10" r="2.3" />
        {!hidden && <path d="m3.5 3.5 13 13" />}
      </svg>
      {hidden ? "Show seas" : "Hide seas"}
    </button>
  );
}
