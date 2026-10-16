// A reserved place for an ad. Ads come after launch (AGENTS.md: below the board
// and at the end of a game, never interrupting play), so for now this renders
// nothing. Set NEXT_PUBLIC_SHOW_AD_SLOTS=1 (e.g. in .env.local) to see the
// reserved spaces as dashed placeholders while designing.

const SHOW = process.env.NEXT_PUBLIC_SHOW_AD_SLOTS === "1";

export default function AdSlot({ className = "" }: { className?: string }) {
  if (!SHOW) return null;
  return (
    <div
      aria-hidden="true"
      className={`grid min-h-[100px] place-items-center rounded-2xl border-2 border-dashed border-ink/15 text-xs font-semibold tracking-wide text-ink-faint uppercase ${className}`}
    >
      Ad space
    </div>
  );
}
