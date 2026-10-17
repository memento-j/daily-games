import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import DownstreamStatus from "./DownstreamStatus";
import TodayDate from "./TodayDate";

// The homepage: a short list of the site's daily games. A Server Component, so
// all of this text is in the static HTML (good for search and, later, AdSense);
// only today's date is filled in by the browser.

export default function Home() {
  return (
    <div className="font-sans flex min-h-svh flex-col bg-land text-ink">
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5 pt-6 pb-10 sm:px-8 sm:pt-8 lg:pb-7">
        <header className="flex items-center justify-between">
          <span className="font-display flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <DropMark />
            {SITE_NAME}
          </span>
          <TodayDate />
        </header>

        <section className="mt-[8svh] lg:mt-[5svh]">
          <h1 className="font-display max-w-[13ch] lg:max-w-[19ch] text-[clamp(44px,7.4vw,72px)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
            Small daily puzzles about the real world<span className="text-coral">.</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-snug text-ink-soft">
            One a day, the same for everyone. A few minutes with your coffee, then it&apos;s tomorrow&apos;s turn.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="games">
          <h2 id="games" className="font-display text-[22px] font-semibold tracking-[-0.02em]">
            The games
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3">
            <li>
              <Link
                href="/downstream/"
                className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-5 rounded-[28px] bg-card p-5 shadow-card transition-all duration-175 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-20px_rgb(18_26_43/0.32),0_3px_10px_-4px_rgb(18_26_43/0.12)] sm:p-7"
              >
                <span>
                  <span className="font-display block text-[34px] leading-none font-semibold tracking-[-0.035em]">
                    Downstream<span className="text-coral">.</span>
                  </span>
                  <span className="mt-2 block text-[17px] leading-snug text-ink-soft">
                    A raindrop lands somewhere on Earth. Pick the sea it reaches.
                  </span>
                  <span className="mt-4 block">
                    <DownstreamStatus />
                  </span>
                </span>
                <MiniMap />
              </Link>
            </li>
            <ComingSoon number={2} line="Being made. It lands here when it's ready." />
            <ComingSoon number={3} line="Still an idea on a napkin." />
          </ul>
        </section>

        <p className="mt-8 max-w-[52ch] leading-relaxed text-ink-soft">
          More games are on the way, one at a time, and only once they&apos;re fun. Bookmark this page and check back.
        </p>

        <footer className="mt-auto pt-8 text-xs text-ink-faint">New puzzles every midnight, your time.</footer>
      </div>
    </div>
  );
}

function ComingSoon({ number, line }: { number: number; line: string }) {
  return (
    <li className="flex items-center gap-5 rounded-[28px] border-2 border-dashed border-ink/12 px-5 py-4 sm:px-7">
      <span className="font-display text-[28px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap text-ink/25">No. {number}</span>
      <span className="text-[15px] text-ink-faint">{line}</span>
    </li>
  );
}

/** Small raindrop mark beside the site name. */
function DropMark() {
  return (
    <svg viewBox="0 0 16 20" className="h-[18px] w-[14px]" aria-hidden="true">
      <path d="M8 1.5C8 1.5 2 8.6 2 12.6A6 6 0 0 0 14 12.6C14 8.6 8 1.5 8 1.5Z" fill="var(--color-coral)" />
    </svg>
  );
}

/**
 * A tiny hand-drawn Downstream map: land, the coast, a river, and a coral
 * raindrop running from its pin down the route to the sea (still under reduced motion).
 */
function MiniMap() {
  const route = "M34 82 C 46 74, 44 60, 58 54 S 82 44, 92 34 S 112 22, 122 20";
  return (
    <svg viewBox="0 0 150 104" className="w-[112px] shrink-0 overflow-visible sm:w-[150px]" aria-hidden="true">
      <rect width="150" height="104" rx="18" fill="var(--color-sea)" />
      <path d="M0 40 C 30 36, 52 46, 78 34 S 112 16, 130 22 S 150 30, 150 30 V104 H0 Z" fill="var(--color-land)" />
      <path d="M0 40 C 30 36, 52 46, 78 34 S 112 16, 130 22 S 150 30, 150 30" fill="none" stroke="var(--color-coast)" strokeWidth="1.2" />
      <path d="M20 96 C 30 88, 40 80, 46 72 M70 96 C 66 84, 62 70, 58 54" fill="none" stroke="var(--color-river)" strokeWidth="1.4" strokeLinecap="round" />
      <path d={route} fill="none" stroke="var(--color-drop)" strokeWidth="3.2" strokeLinecap="round" className="mini-route" pathLength={1} />
      <circle cx="122" cy="20" r="4.5" fill="#fff" stroke="var(--color-drop)" strokeWidth="2" />
      <circle cx="34" cy="82" r="4" fill="#fff" stroke="var(--color-coral)" strokeWidth="2" />
      <circle r="5.5" fill="var(--color-coral)" stroke="#fff" strokeWidth="2" className="mini-drop" style={{ offsetPath: `path("${route}")` }} />
    </svg>
  );
}
