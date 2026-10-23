// /countries/: every country page, each with its small map and its answer. Countries
// are added once their daily Slice puzzle is over (games/slice/practice.ts) and their
// copy is written (app/countries/content.tsx).

import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { pageMetadata } from "@/lib/seo";
import CountryBoard from "./CountryBoard";
import { countryPages } from "./data";
import Header from "./Header";

export const metadata: Metadata = pageMetadata({
  title: "Where do people live? Half of each country's population, mapped",
  description:
    "Half of a country's population often lives on a tiny share of its land. See where in Japan, the United States, Australia, Germany and South Korea, from 1 km population data, then try splitting them yourself.",
  path: "/countries/",
});

export default function CountriesPage() {
  const pages = countryPages();
  return (
    <div className="font-sans min-h-svh bg-land text-ink">
      <div className="mx-auto max-w-[1040px] px-5 pt-6 sm:px-8 sm:pt-8">
        <Header />
        <main>
          <h1 className="font-display mt-10 max-w-[16ch] text-[clamp(38px,7vw,64px)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:mt-14">
            Where do people actually live<span className="text-coral">?</span>
          </h1>
          <p className="mt-5 max-w-[56ch] text-lg leading-snug text-pretty text-ink-soft">
            In most countries, half the population crowds onto a tiny share of the land. Each map below splits a country in two with one straight
            line, half the people on each side, measured from 1 km population data. Then you can try splitting it yourself, in{" "}
            <Link href="/slice/" className="font-semibold text-coral-deep underline decoration-coral/40 underline-offset-[3px] hover:decoration-coral-deep">
              Slice
            </Link>
            .
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {pages.map((p) => (
              <li key={p.country.slug}>
                <Link href={p.path} className="group block h-full overflow-hidden rounded-[24px] bg-card shadow-card">
                  <div className="country-mat bg-mat px-3 py-3">
                    <CountryBoard round={p.round} cut={p.cut} compact className="mx-auto block h-48 w-full transition-[scale] duration-500 ease-out group-hover:scale-[1.03]" />
                  </div>
                  <div className="px-5 pt-4 pb-5">
                    <h2 className="font-display text-[22px] leading-tight font-semibold tracking-[-0.02em] group-hover:text-coral-deep">{p.question}</h2>
                    <p className="mt-1.5 text-ink-soft">
                      Half on just <strong className="font-semibold text-ink">{p.dense}</strong> of the land.
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-faint [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-ink">
            Data: <a href="https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php">GHSL population grid</a> (European Commission JRC, 2025)
            inside <a href="https://www.naturalearthdata.com/">Natural Earth</a> borders. Each page explains how it was measured. More countries are
            added after they appear in the daily puzzle.
          </p>
        </main>
        <SiteFooter className="mt-14 pb-8" note="Pondo · Small daily geography puzzles." />
      </div>
    </div>
  );
}
