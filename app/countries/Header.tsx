// The country pages' header: the Peeker and "Pondo." home, a breadcrumb back to the
// list of countries, and the theme toggle. (The reading pages' TextPage has the same
// top line; these pages need a wider body for the maps.)

import Link from "next/link";
import { PeekerMark } from "@/components/Peeker";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_NAME } from "@/lib/site";

export default function Header({ crumb }: { crumb?: string }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <Link href="/" className="font-display flex shrink-0 items-center gap-2 rounded-md text-lg font-semibold tracking-[-0.02em]">
          <PeekerMark className="size-8" />
          <span>
            {SITE_NAME}
            <span className="text-coral">.</span>
          </span>
        </Link>
        <span aria-hidden="true" className="text-ink-faint">
          /
        </span>
        {crumb ? (
          <>
            <Link href="/countries/" className="font-semibold text-ink-soft hover:text-coral-deep">
              Countries
            </Link>
            <span aria-hidden="true" className="text-ink-faint">
              /
            </span>
            <span aria-current="page" className="truncate font-semibold">
              {crumb}
            </span>
          </>
        ) : (
          <span aria-current="page" className="font-semibold">
            Countries
          </span>
        )}
      </nav>
      <ThemeToggle />
    </header>
  );
}
