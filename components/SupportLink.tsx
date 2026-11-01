"use client";

// "Support Pondo ☕": the quiet tip link to Buy Me a Coffee (developer's call, 2026-11-01).
// A plain text link in muted type, never a button: in the site footer and as one line at
// the end of each game's finished-day summary, where it must not compete with Share or
// the next game. Opens in a new tab so the game stays open. A client component only for
// the click event (tip_clicked); the link itself works without JavaScript.

import { track } from "@/lib/analytics";
import { SUPPORT_URL } from "@/lib/site";

type Props = {
  location: "footer" | "results";
  /** The game whose page this is, if any. */
  game?: "slice" | "downstream";
  className?: string;
};

export default function SupportLink({ location, game, className = "" }: Props) {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener"
      onClick={() => track("tip_clicked", game ? { location, game } : { location })}
      className="group rounded-sm hover:text-ink"
    >
      {/* Only the words are underlined, not the cup. */}
      <span className={`underline-offset-4 group-hover:underline ${className}`}>Support Pondo</span>
      <span aria-hidden="true"> ☕</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** The line at the end of a finished day's summary. */
export function SupportLine({ game }: { game: "slice" | "downstream" }) {
  return (
    <p className="text-center text-xs text-ink-faint">
      Enjoying the puzzles? <SupportLink location="results" game={game} className="underline decoration-ink/25" />
    </p>
  );
}
