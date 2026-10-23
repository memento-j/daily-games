// /countries/<slug>/: one question people search for ("Where does half of Japan's
// population live?"), answered from the game's own data, explained with researched
// facts (each with its source), and an invitation to split the country in Slice.
//
// A Server Component, built once per country at build time (generateStaticParams):
// the maps and numbers are computed from the puzzle files during the build, so the page
// is plain HTML and SVG with no JavaScript of its own (only the button's click event).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import SiteFooter from "@/components/SiteFooter";
import { countryJsonLd, pageMetadata } from "@/lib/seo";
import { capitalise, possessive } from "@/games/slice/words";
import CountryBoard from "../CountryBoard";
import { countryPage, countryPages, pct } from "../data";
import Header from "../Header";
import PracticeButton from "../PracticeButton";

type Props = { params: Promise<{ slug: string }> };

// Only the countries listed in data.ts get a page; any other address is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return countryPages().map((p) => ({ slug: p.country.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = countryPage((await params).slug);
  if (!page) return {};
  return pageMetadata({
    title: page.content.title,
    description: page.content.description,
    path: page.path,
    absoluteTitle: true,
    image: { url: page.image, width: 1200, height: 630, alt: `${page.answer} A map of ${page.name} split in two by one straight line.` },
  });
}

// The data's own credit, linked wherever a number measured from it appears.
const DATA_SOURCE = (
  <>
    <a href="https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php">GHSL population grid</a> (European Commission JRC, 2025) inside{" "}
    <a href="https://www.naturalearthdata.com/">Natural Earth</a> borders
  </>
);

export default async function CountryPage({ params }: Props) {
  const page = countryPage((await params).slug);
  if (!page) notFound();
  const { country, content, round, name, cut } = page;
  const Name = capitalise(name);
  const others = countryPages().filter((p) => p !== page);

  return (
    <div className="font-sans min-h-svh bg-land text-ink">
      <JsonLd data={countryJsonLd({ headline: page.question, description: content.description, path: page.path, image: page.image, name: country.name })} />
      <div className="mx-auto max-w-[760px] px-5 pt-6 sm:px-8 sm:pt-8">
        <Header crumb={country.name} />

        <main>
          <h1 className="font-display mt-10 text-[clamp(34px,7vw,56px)] leading-[0.98] font-semibold tracking-[-0.035em] text-balance sm:mt-14">
            {page.question}
          </h1>
          {/* The answer, straight away: what someone searching wants first. */}
          <p className="font-display mt-5 text-[clamp(21px,3.4vw,27px)] leading-snug font-semibold tracking-[-0.015em] text-pretty">
            Half of {possessive(name)} population lives on just <span className="slice-mark">{page.dense}</span> of its land.
          </p>
          <p className="mt-2 text-sm text-ink-faint [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-ink">
            Measured from the {DATA_SOURCE}. <a href="#how-we-measured" className="underline underline-offset-2 hover:text-ink">How we measured this</a>
          </p>
        </main>
      </div>

      {/* The map: the game's board, split along the most lopsided half cut. */}
      <figure className="mx-auto mt-8 max-w-[880px] sm:px-8">
        <div className="country-mat relative overflow-hidden bg-mat px-2 py-4 sm:rounded-[28px] sm:px-6 sm:py-6">
          <CountryBoard
            round={round}
            cut={cut}
            className="mx-auto block max-h-[72svh] w-full"
            label={`${Name} drawn as a slab and cut by one straight line. The ${cut.side} side, tinted coral, holds half of the population on ${pct(cut.land)} of the land; the other side holds the other half on ${pct(1 - cut.land)}. Columns show where people live: taller means more people.`}
          />
        </div>
        <figcaption className="mx-auto mt-4 max-w-[760px] px-5 sm:px-0">
          <ul className="flex flex-col gap-1.5 text-[15px]">
            <li className="flex items-center gap-2.5">
              <span className="size-3.5 shrink-0 rounded-[4px] bg-coral" aria-hidden="true" />
              <span>
                <strong className="font-semibold">The {cut.side} side:</strong> half the population, on {pct(cut.land)} of the land
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="size-3.5 shrink-0 rounded-[4px] bg-people-other" aria-hidden="true" />
              <span>
                <strong className="font-semibold">The rest:</strong> the other half, on {pct(1 - cut.land)}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-sm leading-relaxed text-ink-faint [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-ink">
            Taller columns mean more people. The dashed line is the most lopsided straight cut that still splits the population exactly in half.
            Data: {DATA_SOURCE}.
          </p>
        </figcaption>
      </figure>

      <div className="mx-auto max-w-[760px] px-5 sm:px-8">
        <article className="text-page mt-12 max-w-[640px]">
          <h2>The straight-line test</h2>
          <p>
            Draw one straight line across {name} so that exactly half the population is on each side. Of all the lines that do it, the most
            lopsided puts half of everyone on the <strong>{cut.side} side</strong>, on just <strong>{pct(cut.land)} of the land</strong>.
          </p>
          <p>
            Now cut the <em>land</em> in half instead, at the same angle. That looks like the fair cut, but the {cut.side} half ends up with{" "}
            <strong>{pct(page.landHalfPeople)} of the people</strong>. Both figures are our measurements from the {DATA_SOURCE}.
          </p>
          <p>That gap between how a country looks and where its people are is exactly what Slice is about.</p>

          <h2>{content.whyHeading}</h2>
          {content.why.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>

        {/* The invitation: try it in the game. */}
        <section aria-labelledby="try" className="mt-14 overflow-hidden rounded-[28px] bg-card shadow-card sm:grid sm:grid-cols-[1fr_220px]">
          <div className="p-6 sm:p-8">
            <h2 id="try" className="font-display text-[28px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-[32px]">
              Think you can do better? Try splitting {name} yourself<span className="text-coral">.</span>
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Now you know where everyone lives, so this should be easy, right? In Slice you get one straight line to cut {possessive(name)}{" "}
              population exactly in half, and a second try if you need it. Then the country splits and the population rises in columns, to show
              how close you got.
            </p>
            <div className="mt-6 flex flex-col items-start gap-4">
              <PracticeButton slug={country.slug} name={name} country={country.name} />
              <a href="/slice/" className="inline-flex items-center gap-1.5 font-semibold text-coral-deep">
                Or play today&apos;s puzzle: four new countries
                <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                  <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <p className="mt-5 text-xs text-ink-faint">Free, no sign-up. Practice never touches your daily score or streak.</p>
          </div>
          {/* A real moment from the game: this country, cut and revealed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.gameShot}
            width={440}
            height={460}
            loading="lazy"
            alt={`${Name} in Slice after a cut: the country split in two, its population rising in columns, with each side's share labelled.`}
            className="block h-60 w-full object-cover object-[50%_40%] sm:h-full"
          />
        </section>

        <section id="how-we-measured" className="text-page mt-14 max-w-[640px] scroll-mt-6">
          <h2>How we measured this</h2>
          <p>
            Every figure on this page comes from the same data as the game: the {DATA_SOURCE}, which estimates how many people live in each 1 km
            square. We draw the country on an equal-area map, so every square kilometre counts the same.
          </p>
          <p>
            &ldquo;{page.dense} of its land&rdquo; counts the most crowded 1 km squares first, until they hold half the people. It measures how tightly
            people pack, which is why it comes out much smaller than maps that colour whole cities or counties. The straight-line figures test a
            cut at every angle, one degree apart. {content.outlineNote}
          </p>
          <h3>Sources</h3>
          <ul>
            <li>
              Population: Schiavina M., Freire S., Carioli A., MacManus K. (2023), <a href="https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php">GHS-POP R2023A</a>, European Commission, JRC (2025 estimate, 1 km). CC BY 4.0.
            </li>
            <li>
              Borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a>, Admin 0 Countries, 1:10m.
            </li>
            {content.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url}>{s.label}</a>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-labelledby="more" className="mt-14">
          <h2 id="more" className="font-display text-xl font-semibold tracking-[-0.02em]">
            More countries
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {others.map((p) => (
              <li key={p.country.slug}>
                <Link href={p.path} className="group block rounded-2xl bg-card px-4 py-3 ring-1 ring-line transition-shadow hover:ring-ink/25">
                  <span className="block font-semibold group-hover:text-coral-deep">{p.question}</span>
                  <span className="block text-sm text-ink-soft">Half on just {p.dense} of the land.</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/countries/" className="font-semibold text-coral-deep">
              All countries
            </Link>
          </p>
        </nav>

        <SiteFooter className="mt-14 pb-8" note="Pondo · Small daily geography puzzles." />
      </div>
    </div>
  );
}
