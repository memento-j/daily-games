// The one loading state, used everywhere something is on its way (a game's page
// before its code runs, the puzzle file, the 3D board, the map): the site's coral
// raindrop falls into a ripple, over a short line saying what's coming. It fades in
// after a beat (CSS `.loading`), so a fast load never flashes it; and each stage of a
// load draws it in the same place, so consecutive stages read as one wait.
//
// No hooks, so server pages can use it too (as a Suspense fallback).

export default function Loading({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`font-sans grid place-items-center text-ink ${className}`}>
      <div className="loading flex flex-col items-center gap-3">
        <svg viewBox="0 0 40 52" className="h-13 w-10 overflow-visible" aria-hidden="true">
          <ellipse className="loading-ripple" cx="20" cy="46" rx="13" ry="3.6" fill="none" stroke="var(--color-coral)" strokeWidth="1.8" />
          <path
            className="loading-drop"
            d="M20 6C20 6 11.5 16.2 11.5 22a8.5 8.5 0 0 0 17 0C28.5 16.2 20 6 20 6Z"
            fill="var(--color-coral)"
          />
        </svg>
        <p className="text-sm font-semibold text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
