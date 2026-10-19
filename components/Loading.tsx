// The one loading state, used everywhere something is on its way (a game's page
// before its code runs, the puzzle file, the 3D board, the map): Pondo's Peeker bobs up
// over the horizon, looks left and right, and ducks back down, over a short line saying
// what's coming. It fades in after a beat (CSS `.loading`), so a fast load never
// flashes it; and each stage of a load draws it in the same place, so consecutive
// stages read as one wait.
//
// No hooks, so server pages can use it too (as a Suspense fallback).

import { PeekerParts } from "./Peeker";

export default function Loading({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`font-sans grid place-items-center text-ink ${className}`}>
      <div className="loading flex flex-col items-center gap-3">
        <svg viewBox="0 0 48 48" className="size-14 overflow-visible" aria-hidden="true">
          {/* The Peeker only shows above the horizon: it rises from behind it. Every
              Loading draws the same clip, so a shared id is harmless. */}
          <defs>
            <clipPath id="loading-horizon">
              <rect x="-4" y="-8" width="56" height="42" />
            </clipPath>
          </defs>
          <g clipPath="url(#loading-horizon)">
            <g className="loading-peeker">
              <PeekerParts pupilClass="loading-look" />
            </g>
          </g>
          <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
        </svg>
        <p className="text-sm font-semibold text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
