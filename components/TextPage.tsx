// The frame for the site's reading pages (About, Privacy, Contact): the homepage's
// header (the Peeker and "Pondo.", home), a big title with the coral full stop, the
// page's text set for reading (CSS `.text-page` in globals.css), and the footer.

import Link from "next/link";
import { PeekerMark } from "./Peeker";
import SiteFooter from "./SiteFooter";
import ThemeToggle from "./ThemeToggle";
import { SITE_NAME } from "@/lib/site";

export default function TextPage({ title, lead, children }: { title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="font-sans flex min-h-svh flex-col bg-land text-ink">
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5 pt-6 pb-8 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-display flex items-center gap-2 rounded-md text-lg font-semibold tracking-[-0.02em]">
            <PeekerMark className="size-8" />
            <span>
              {SITE_NAME}
              <span className="text-coral">.</span>
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="mt-[7svh] mb-16 max-w-[640px]">
          <h1 className="font-display text-[clamp(40px,6.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance">
            {title}
            <span className="text-coral">.</span>
          </h1>
          {lead && <p className="mt-5 text-xl leading-snug text-pretty text-ink-soft">{lead}</p>}
          <div className="text-page mt-10">{children}</div>
        </main>

        <SiteFooter className="mt-auto" note={`${SITE_NAME} · New puzzles every midnight, your time.`} />
      </div>
    </div>
  );
}
