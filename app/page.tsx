import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, siteJsonLd } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import DownstreamStatus from "./DownstreamStatus";
import SliceStatus from "./SliceStatus";
import { DownstreamYesterday, SliceYesterday } from "./HomeYesterday";
import SiteFooter from "@/components/SiteFooter";
import ThemeToggle from "@/components/ThemeToggle";
import TodayDate from "./TodayDate";
import { HomePeeker, TodayProgress } from "./HomeToday";

// The homepage: a short list of the site's daily games. A Server Component, so
// all of this text is in the static HTML (good for search and, later, AdSense);
// only today's date is filled in by the browser.

// "Daily geography puzzles" is what people search for; the brand alone isn't yet. Under
// ~60 characters, so Google shows it whole, and it names both games.
export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME}: free daily geography puzzles · Slice & Downstream`,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function Home() {
  return (
    <div className="font-sans flex min-h-svh flex-col bg-land text-ink">
      <JsonLd data={siteJsonLd(SITE_DESCRIPTION)} />
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5 pt-6 pb-10 sm:px-8 sm:pt-8 lg:pb-7">
        <header className="flex items-center justify-between">
          <span className="font-display flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <HomePeeker />
            <span>
              {SITE_NAME}
              <span className="text-coral">.</span>
            </span>
          </span>
          <span className="flex items-center gap-3">
            <TodayDate />
            <ThemeToggle />
          </span>
        </header>

        <section className="mt-[8svh] lg:mt-[5svh]">
          <h1 className="font-display max-w-[13ch] lg:max-w-[19ch] text-[clamp(44px,7.4vw,72px)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
            {/* The coral punctuation that ends every headline: here the question mark. */}
            Your daily dose of &ldquo;wait, really<span className="text-coral">?</span>&rdquo;
          </h1>
          <p className="mt-5 max-w-[48ch] text-lg leading-snug text-ink-soft">
            Quick puzzles that are easy to start and hard to put down. A new one in every game each day, the same for everyone, so you can
            compare with friends. Free, and no sign-up.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="games">
          <div className="flex items-center justify-between gap-3">
            <h2 id="games" className="font-display text-[22px] font-semibold tracking-[-0.02em]">
              Today&apos;s puzzles
            </h2>
            <TodayProgress />
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-3">
            <li>
              <Link
                href="/slice/"
                className="home-card home-card-slice group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-5 rounded-[28px] bg-card p-5 shadow-card transition-all duration-175 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-20px_rgb(18_26_43/0.32),0_3px_10px_-4px_rgb(18_26_43/0.12)] sm:p-7"
              >
                <span>
                  <span className="font-display block text-[34px] leading-none font-semibold tracking-[-0.035em]">
                    Slice<span className="text-coral">.</span>
                  </span>
                  <span className="mt-2 block text-[17px] leading-snug text-ink-soft">
                    Draw one straight line across a real country to cut off half its population. Easy, until you see where everyone lives.
                  </span>
                  <span className="mt-4 block">
                    <SliceStatus />
                  </span>
                </span>
                <MiniSlice />
              </Link>
              <SliceYesterday />
            </li>
            <li>
              <Link
                href="/downstream/"
                className="home-card home-card-downstream group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-5 rounded-[28px] bg-card p-5 shadow-card transition-all duration-175 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-20px_rgb(18_26_43/0.32),0_3px_10px_-4px_rgb(18_26_43/0.12)] sm:p-7"
              >
                <span>
                  <span className="font-display block text-[34px] leading-none font-semibold tracking-[-0.035em]">
                    Downstream<span className="text-coral">.</span>
                  </span>
                  <span className="mt-2 block text-[17px] leading-snug text-ink-soft">
                    A raindrop lands somewhere on Earth. Guess which sea it ends up in. It&apos;s not always the nearest one.
                  </span>
                  <span className="mt-4 block">
                    <DownstreamStatus />
                  </span>
                </span>
                <MiniMap />
              </Link>
              <DownstreamYesterday />
            </li>
            <ComingSoon number={3} line="Still an idea on a napkin." />
          </ul>
        </section>

        <p className="mt-8 max-w-[52ch] leading-relaxed text-ink-soft">
          More games are on the way, one at a time and only once they&apos;re fun. Bookmark this page and check back.
        </p>

        <SiteFooter className="mt-auto pt-8" note="New puzzles every midnight, your time." />
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

/**
 * A tiny Slice board in the game's look: a paper slab on the sage cutting mat. A dashed
 * cut draws itself across, the slab parts along it, the crowded corner's people rise
 * as coral columns (grey on the other piece), then it all settles back and repeats.
 * Reduced motion: the finished state (pieces apart, people risen). CSS: `.mini-slice-*`.
 */
function MiniSlice() {
  const country = "M30 30 C 48 16, 78 22, 98 18 S 128 30, 124 50 S 112 80, 90 86 S 50 92, 36 78 S 18 44, 30 30 Z";
  // The cut runs through (20, 18) and (136, 82); each clip keeps one side of it.
  const upper = "-10,1.4 160,95.3 160,-20 -10,-20";
  const lower = "-10,1.4 160,95.3 160,124 -10,124";
  const slab = (clip: string, top: string) => (
    <g clipPath={`url(#${clip})`}>
      <path d={country} transform="translate(0 4)" fill="var(--color-slab-side)" />
      <path d={country} fill={top} stroke="rgb(18 26 43 / 0.25)" strokeWidth="0.8" className={clip === "mini-slice-a" ? "mini-slice-tint" : undefined} />
    </g>
  );
  // [x, base y, height]: the crowded corner on the counted piece, a few people elsewhere.
  const crowd: [number, number, number][] = [
    [101, 36, 15],
    [109, 42, 11],
    [93, 31, 8],
    [115, 50, 7],
    [100, 46, 5],
    [87, 38, 4],
  ];
  const sparse: [number, number, number][] = [
    [58, 64, 4],
    [74, 76, 3],
    [48, 52, 3],
  ];
  const columns = (list: [number, number, number][], fill: string) =>
    list.map(([x, y, h], i) => (
      <rect key={i} x={x - 2} y={y - h} width="4" height={h} rx="0.8" fill={fill} className="mini-slice-rise" style={{ animationDelay: `${i * 70}ms` }} />
    ));
  return (
    <svg viewBox="0 0 150 104" className="w-[112px] shrink-0 overflow-visible sm:w-[150px]" aria-hidden="true">
      <defs>
        <clipPath id="mini-slice-a">
          <polygon points={upper} />
        </clipPath>
        <clipPath id="mini-slice-b">
          <polygon points={lower} />
        </clipPath>
        <mask id="mini-slice-cut">
          <path d="M16 15.8 L140 84.2" stroke="#fff" strokeWidth="8" pathLength={1} className="mini-slice-draw" />
        </mask>
        <pattern id="mini-slice-grid" width="15" height="15" patternUnits="userSpaceOnUse">
          <path d="M15 0H0V15" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="150" height="104" rx="18" fill="var(--color-mat)" />
      <rect width="150" height="104" rx="18" fill="url(#mini-slice-grid)" />
      <g className="mini-slice-b">
        {slab("mini-slice-b", "var(--color-slab)")}
        {columns(sparse, "var(--color-people-other)")}
      </g>
      <g className="mini-slice-a">
        {slab("mini-slice-a", "var(--color-slab)")}
        {columns(crowd, "var(--color-coral)")}
      </g>
      <g className="mini-slice-whole">
        <path d={country} transform="translate(0 4)" fill="var(--color-slab-side)" />
        <path d={country} fill="var(--color-slab)" stroke="rgb(18 26 43 / 0.25)" strokeWidth="0.8" />
      </g>
      <path
        d="M16 15.8 L140 84.2"
        stroke="var(--color-coral)"
        strokeWidth="2.6"
        strokeDasharray="5 3.5"
        strokeLinecap="round"
        mask="url(#mini-slice-cut)"
        className="mini-slice-line"
      />
    </svg>
  );
}
