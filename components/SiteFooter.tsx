// The site's footer: About, Privacy and Contact, on every page that isn't the game
// board itself (the homepage, the text pages, under each game's how-to-play). A line
// of text can lead it ("New puzzles every midnight, your time."). It ends with the quiet
// "Support Pondo ☕" tip link (SupportLink); game pages pass `game` for its click event.

import Link from "next/link";
import SupportLink from "./SupportLink";

const LINKS = [
  ["/countries/", "Countries"],
  ["/about/", "About"],
  ["/privacy/", "Privacy"],
  ["/contact/", "Contact"],
] as const;

type Props = { note?: string; className?: string; game?: "slice" | "downstream" };

export default function SiteFooter({ note, className = "", game }: Props) {
  return (
    <footer className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-ink-faint ${className}`}>
      {note && <p>{note}</p>}
      <nav aria-label="About this site" className="flex flex-wrap gap-x-4 gap-y-2">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-sm underline-offset-4 hover:text-ink hover:underline">
            {label}
          </Link>
        ))}
        <SupportLink location="footer" game={game} />
      </nav>
    </footer>
  );
}
