// Pondo's mark: the Peeker, a round coral character peeking over the horizon to see
// what today's puzzle is (chosen by the developer, 2026-10-19). Drawn on a 48-unit grid.
// The horizon takes the page's ink colour, so the mark works in light and dark mode;
// the app icons (scripts/brand/make_icons.py) put the same drawing on an ink tile.
//
// No hooks: server pages can use it too.

const CORAL = "var(--color-coral)";
const PUPIL = "#1d2533";

/** The Peeker's body and eyes, for reuse (Loading and the 404 page animate these
 *  parts: `eyesClass` moves both eyes, e.g. to blink; `pupilClass` just the pupils). */
export function PeekerParts({ pupilClass = "", eyesClass = "" }: { pupilClass?: string; eyesClass?: string }) {
  return (
    <>
      <path d="M5 34a19 19 0 0 1 38 0Z" fill={CORAL} />
      <g className={eyesClass}>
        <circle cx="17.5" cy="24.5" r="4.6" fill="#fff" />
        <circle cx="30.5" cy="24.5" r="4.6" fill="#fff" />
        <g className={pupilClass}>
          <circle cx="19.2" cy="23.2" r="2.2" fill={PUPIL} />
          <circle cx="32.2" cy="23.2" r="2.2" fill={PUPIL} />
        </g>
      </g>
    </>
  );
}

export function PeekerMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <PeekerParts />
      <rect x="1" y="33.5" width="46" height="3.6" rx="1.8" fill="var(--color-ink)" />
    </svg>
  );
}
