// The hint's lightbulb, shared by the game screen and the homepage's Slice card.

/** The hint's mark, a lightbulb: on the hint button, and beside every score that used the
 *  hint (the top bar, the summary, practice), as the 💡 does in the share text. Drawn
 *  rather than the emoji, which looks different on every phone. Shape after Lucide's
 *  "lightbulb" (ISC licence). `on`: the bulb lit (filled). */
export function HintIcon({ on = false, className = "size-[18px]" }: { on?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path
        d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5Z"
        fill={on ? "currentColor" : "none"}
        fillOpacity={on ? 0.28 : 0}
      />
      <path d="M9 18h6M10 22h4" />
    </svg>
  );
}

/** "Hint used", beside a score: a small lit bulb in coral. */
export function HintMark({ className = "size-3" }: { className?: string }) {
  return (
    <span className="text-coral-deep" title="Hint used">
      <HintIcon on className={className} />
      <span className="sr-only">, hint used</span>
    </span>
  );
}
