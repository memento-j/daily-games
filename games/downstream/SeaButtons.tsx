"use client";

// The option seas as buttons on the map, where each sea is (phone and desktop).
// Tapping one picks it; the game screen then asks the player to lock it in, so a
// stray click never costs a drop. "Hide seas" takes them off to see the whole map.

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { GameState } from "./game";
import { pinBox, placeLabels, type Box } from "./labelPlacement";
import type { Project } from "./RouteMap";
import { sound } from "./sound";
import type { LngLat } from "./types";

type Spot = { name: string; x: number; y: number };
/** The option seas on screen, the pin, and the water drawn so far (none of them ever covered). */
type Spots = { seas: Spot[]; pin: { x: number; y: number } | null; water: Box[] };

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
 * The sea the player has picked but not locked in. It stays picked while the
 * water flows (a hunch you watch play out; Lock in shows the new points) and is
 * cleared by the next drop.
 */
export function usePick(game: GameState): [string | null, (name: string | null) => void] {
  const [pick, setPick] = useState<{ name: string; at: string } | null>(null);
  const at = `${game.drop}`;
  const picked = pick?.at === at ? pick.name : null;
  return [picked, (name) => setPick(name ? { name, at } : null)];
}

/** The option seas' (and the pin's) screen positions, which change on every camera frame. */
export type SpotStore = { get: () => Spots; subscribe: (listener: () => void) => () => void };

/**
 * Where each option sea is on screen; pass `onCamera` to RouteMap and the store to
 * SeaButtons. The positions live in a small store that only SeaButtons listens to,
 * so a moving camera re-renders four buttons, not the whole game screen.
 */
export function useSeaSpots(labels?: Record<string, LngLat>, pin?: LngLat): [(project: Project, water: Box[]) => void, SpotStore] {
  const [store] = useState(() => {
    let spots: Spots = NO_SPOTS;
    const listeners = new Set<() => void>();
    return {
      get: () => spots,
      set: (next: Spots) => {
        spots = next;
        listeners.forEach((l) => l());
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  });
  const onCamera = (project: Project, water: Box[]) => {
    if (labels) store.set({ seas: Object.entries(labels).map(([name, ll]) => ({ name, ...project(ll) })), pin: pin ? project(pin) : null, water });
  };
  return [onCamera, store];
}

const NO_SPOTS: Spots = { seas: [], pin: null, water: [] };

/**
 * Keep the sea buttons inside the map's free area, off each other, and clear of the
 * pin (labelPlacement.ts): a button that would cover where the rain fell moves away
 * from it. Every button stays: they're the choices. Sizes are the buttons' own,
 * measured once drawn (an estimate before that).
 */
function placeSpots(
  spots: Spots,
  sizes: Map<string, { w: number; h: number }>,
  previous: Map<string, [number, number]>,
  width: number,
  top: number,
  bottom: number,
  big: boolean,
): Spot[] {
  const items = [...spots.seas]
    .sort((a, b) => a.y - b.y)
    .map((s) => {
      const size = sizes.get(s.name) ?? { w: Math.min(big ? 176 : 124, s.name.length * (big ? 8.5 : 7) + (big ? 60 : 24)), h: big ? 38 : 30 };
      return { id: s.name, x: s.x, y: s.y, w: size.w, h: size.h, keep: true };
    });
  // The area holds the buttons' centres between top and bottom, as before.
  const area = { x0: 4, y0: top - 15, x1: width - 4, y1: bottom + 15 };
  // The pin, and the water as it flows (the drop and the line behind it).
  const markers = [...(spots.pin ? [pinBox(spots.pin.x, spots.pin.y)] : []), ...spots.water];
  const placed = placeLabels(items, markers, area, { previous });
  return spots.seas.map((s) => {
    const p = placed.find((q) => q.id === s.name);
    return { ...s, x: s.x + (p?.dx ?? 0), y: s.y + (p?.dy ?? 0) };
  });
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
  keys,
}: {
  /** Desktop: the option order, shown as number badges for the 1-4 keys. */
  keys?: string[];
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
  // Each button's drawn size (for placing it), and where it was last frame (so it doesn't hop).
  const [sizes] = useState(() => new Map<string, { w: number; h: number }>());
  const [previous] = useState(() => new Map<string, [number, number]>());
  const [, remeasured] = useState(0);
  const measure = (el: HTMLButtonElement | null) => {
    if (!el?.dataset.sea) return;
    const old = sizes.get(el.dataset.sea);
    const now = { w: el.offsetWidth, h: el.offsetHeight };
    if (now.w && (!old || Math.abs(old.w - now.w) > 1 || Math.abs(old.h - now.h) > 1)) {
      sizes.set(el.dataset.sea, now);
      remeasured((n) => n + 1);
    }
  };
  if (!width) return null;
  return (
    <div className="sea-buttons-in pointer-events-none absolute inset-0 z-[5]" role="group" aria-label="Which sea does this raindrop reach?">
      {placeSpots(list, sizes, previous, width, top, Math.max(top + 40, bottom), size === "md")
        // Tab order follows the 1-4 badges (positions are absolute, so order is free).
        .sort((a, b) => (keys ? keys.indexOf(a.name) - keys.indexOf(b.name) : 0))
        .map((s) => {
        const on = s.name === picked;
        return (
          <button
            key={s.name}
            ref={measure}
            type="button"
            onClick={() => {
              sound.tap();
              onPick(s.name);
            }}
            aria-pressed={on}
            data-sea={s.name}
            style={{ left: s.x, top: s.y }}
            // Small to look at, bigger to touch: the ::after extends the tap area. `w-max`: its width
            // never depends on where it sits (near the edge it would wrap, be measured, move, unwrap...).
            // A flex row centres the number badge and the name on each other and in the pill (inline,
            // the 20px badge stretched the line and lifted the name 3px).
            className={`pointer-events-auto absolute inline-flex w-max -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center leading-[1.15] font-bold ${
              // Half a pixel more above than below: Hanken's letters sit a little high in their line.
              size === "md" ? "max-w-[176px] px-4 pt-[8.5px] pb-[7.5px] text-[15px]" : "max-w-[124px] px-2.5 pt-[6.5px] pb-[5.5px] text-[12.5px]"
            } shadow-[0_3px_10px_-3px_rgb(18_26_43/0.35)] transition-[scale,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] active:scale-95 active:duration-100 motion-reduce:transition-none ${
              on ? "z-10 scale-110 bg-coral-strong text-white ring-2 ring-card" : "bg-card/95 text-coral-deep ring-[1.5px] ring-coral/60 hover:bg-coral-soft"
            }`}
          >
            {keys && keys.includes(s.name) && (
              <kbd
                aria-hidden="true"
                className={`mr-1.5 grid size-5 shrink-0 place-items-center rounded-full font-sans text-[11px] leading-none font-bold ${on ? "bg-white/25 text-white" : "bg-coral-soft text-coral-deep"}`}
              >
                {keys.indexOf(s.name) + 1}
              </kbd>
            )}
            <span className="sea-name">{s.name}</span>
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
      style={style}
      className={`z-10 flex items-center gap-1.5 rounded-full bg-card/95 py-1.5 pr-3 pl-2.5 text-xs font-semibold text-ink-soft shadow-card transition-colors hover:text-coral-deep ${className}`}
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
