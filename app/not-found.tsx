// The 404 page: any address the site doesn't have (the static export writes it as
// 404.html, which Cloudflare serves for unknown paths; wrangler.jsonc). Next.js marks
// it noindex by itself. A Server Component: only the picture (NotFoundScene) runs in
// the browser.

import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import NotFoundScene from "./NotFoundScene";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="font-sans flex min-h-svh flex-col bg-land text-ink">
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5 pt-6 pb-8 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-display rounded-md text-lg font-semibold tracking-[-0.02em]">
            {SITE_NAME}
            <span className="text-coral">.</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <div className="w-full max-w-[460px]">
            <NotFoundScene />
          </div>
          <h1 className="font-display mt-10 text-[clamp(36px,6vw,54px)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
            Nothing over the horizon<span className="text-coral">.</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg leading-snug text-pretty text-ink-soft">
            We had a good look, but there&apos;s no page at this address. It may have moved, or the link has a typo.
          </p>
          <Link
            href="/"
            className="mt-8 flex h-14 w-full max-w-[340px] items-center justify-center rounded-full bg-coral px-6 text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale] duration-200 hover:bg-coral-strong active:scale-[0.98]"
          >
            See today&apos;s puzzles
          </Link>
          <p className="mt-5 text-[15px] text-ink-soft">
            Or go straight to{" "}
            <Link href="/slice/" className="font-semibold text-coral-deep underline decoration-2 underline-offset-4 hover:decoration-coral">
              Slice
            </Link>{" "}
            or{" "}
            <Link href="/downstream/" className="font-semibold text-coral-deep underline decoration-2 underline-offset-4 hover:decoration-coral">
              Downstream
            </Link>
            .
          </p>
        </main>

        <SiteFooter note="Error 404: page not found." />
      </div>
    </div>
  );
}
