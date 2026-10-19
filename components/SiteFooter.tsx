// The site's footer: About, Privacy and Contact, on every page that isn't the game
// board itself (the homepage, the text pages, under each game's how-to-play). A line
// of text can lead it ("New puzzles every midnight, your time.").

import Link from "next/link";

const LINKS = [
  ["/about/", "About"],
  ["/privacy/", "Privacy"],
  ["/contact/", "Contact"],
] as const;

export default function SiteFooter({ note, className = "" }: { note?: string; className?: string }) {
  return (
    <footer className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-ink-faint ${className}`}>
      {note && <p>{note}</p>}
      <nav aria-label="About this site" className="flex gap-4">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-sm underline-offset-4 hover:text-ink hover:underline">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
