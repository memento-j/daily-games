// The researched copy for each country page (/countries/<slug>/). Everything measured
// from the game's own data (the shares, the straight-line cuts) is computed by the page
// itself; this file holds what comes from elsewhere, and every fact here has its source
// listed under `sources`. Researched 2026-10-23. Never add a fact without a source: a
// wrong fact on a page meant to teach is worse than a shorter page.
//
// A page exists only for a country in games/slice/practice.ts: its daily puzzle is over,
// so showing the perfect cut spoils nothing.

import type { ReactNode } from "react";

export type Source = { label: string; url: string };

export type CountryContent = {
  /** The page's <title>, around the way people search ("where do most people in Japan live"). */
  title: string;
  description: string;
  /** The heading over the researched section. */
  whyHeading: string;
  why: ReactNode[];
  /** What the outline leaves out, for "How we measured this" (or null). */
  outlineNote: string | null;
  sources: Source[];
};

const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>;

export const CONTENT: Record<string, CountryContent> = {
  japan: {
    title: "Where do most people in Japan live? Half on 2.2% of the land",
    description:
      "Half of Japan's population lives on just 2.2% of its land. See where on a map built from 1 km population data, why the plains are so crowded, and try splitting Japan in half yourself.",
    whyHeading: "Why Japan's population is so packed together",
    why: [
      <>
        About three-quarters of Japan is mountains, according to{" "}
        <A href="https://www.mlit.go.jp/river/basic_info/english/land.html">Japan&apos;s land ministry</A>. People live where the land is flat: on the
        plains that rivers built at the foot of the mountains, along the coast. That is where rice could be grown, and it is where the cities are
        today.
      </>,
      <>
        Most of those plains line one stretch of the Pacific coast. The <A href="https://en.wikipedia.org/wiki/Taiheiy%C5%8D_Belt">Taiheiyō Belt</A>,
        a chain of cities about 1,200 km long from Ibaraki, north-east of Tokyo, to Fukuoka in the south-west, is home to around 80 million
        people: roughly two in every three people in Japan.
      </>,
      <>
        <A href="https://en.wikipedia.org/wiki/Greater_Tokyo_Area">Greater Tokyo</A> alone has about 37 million people. Compare{" "}
        <A href="https://en.wikipedia.org/wiki/Hokkaido">Hokkaido</A>, the big northern island: it covers about 22% of Japan&apos;s land (83,424
        km²) but is home to about 5 million people, only around 4% of the country.
      </>,
    ],
    outlineNote: null,
    sources: [
      { label: "Ministry of Land, Infrastructure, Transport and Tourism: Land and climate of Japan", url: "https://www.mlit.go.jp/river/basic_info/english/land.html" },
      { label: "Wikipedia: Taiheiyō Belt", url: "https://en.wikipedia.org/wiki/Taiheiy%C5%8D_Belt" },
      { label: "Wikipedia: Greater Tokyo Area (UN estimate, 2026)", url: "https://en.wikipedia.org/wiki/Greater_Tokyo_Area" },
      { label: "Wikipedia: Hokkaido (area; population, 1 October 2025)", url: "https://en.wikipedia.org/wiki/Hokkaido" },
    ],
  },

  "united-states": {
    title: "Where do most people in the US live? Half on 0.8% of the land",
    description:
      "Half of the United States' population lives on just 0.8% of its land. See where on a map built from 1 km population data, why the east carries the weight, and try splitting the US in half yourself.",
    whyHeading: "Why America's population leans east",
    why: [
      <>
        The United States has more than 3,000 counties, but half of all Americans live in just 145 of them, according to an analysis of Census
        Bureau estimates <A href="https://carolinademography.cpc.unc.edu/2014/12/15/half-of-north-carolinians-live-in-these-13-counties/">reported by
        Carolina Demography</A>. The rest of the country, most of its land, holds the other half.
      </>,
      <>
        The weight sits in the east. If every American weighed the same, the country would balance on one point: the{" "}
        <A href="https://www.census.gov/newsroom/press-releases/2021/center-of-population-hartville-missouri.html">2020 center of population</A>, near
        Hartville, Missouri. The middle of the map itself, the{" "}
        <A href="https://en.wikipedia.org/wiki/Geographic_center_of_the_contiguous_United_States">geographic center of the lower 48</A>, is near Lebanon,
        Kansas: hundreds of miles further west.
      </>,
      <>
        That point has moved almost 900 miles since the first census in 1790, and 2020&apos;s is the furthest west and south it has ever been. Even
        so, it is still in Missouri, as it has been for five censuses in a row.
      </>,
    ],
    outlineNote: "The map shows the lower 48 states: Alaska and Hawaii are left out, as they are in the game.",
    sources: [
      { label: "Carolina Demography (UNC): half of Americans live in 145 counties (Census Bureau 2013 estimates)", url: "https://carolinademography.cpc.unc.edu/2014/12/15/half-of-north-carolinians-live-in-these-13-counties/" },
      { label: "U.S. Census Bureau: 2020 center of population, Hartville, Missouri", url: "https://www.census.gov/newsroom/press-releases/2021/center-of-population-hartville-missouri.html" },
      { label: "Wikipedia: Geographic center of the contiguous United States", url: "https://en.wikipedia.org/wiki/Geographic_center_of_the_contiguous_United_States" },
    ],
  },

  australia: {
    title: "Where do most people in Australia live? Half on 0.1% of the land",
    description:
      "Half of Australia's population lives on just 0.1% of its land. See where on a map built from 1 km population data, why it all crowds into one corner, and try splitting Australia in half yourself.",
    whyHeading: "Why Australia crowds into one corner",
    why: [
      <>
        More than two in three Australians live in the eight capital cities: 18.75 million of about 27.6 million people in June 2025, according
        to the <A href="https://www.abs.gov.au/statistics/people/population/regional-population/latest-release">Australian Bureau of Statistics</A>.
        Sydney (5.64 million) and Melbourne (5.44 million) alone hold about four in ten.
      </>,
      <>
        And the cities hug the shore. When the ABS last measured it,{" "}
        <A href="https://www.abs.gov.au/Ausstats/abs@.nsf/Previousproducts/1301.0Feature%20Article32004">85% of Australians lived within 50 km of the
        coast</A>. The vast interior holds very few people, so most of the map is nearly empty.
      </>,
    ],
    outlineNote: null,
    sources: [
      { label: "Australian Bureau of Statistics: Regional population, 2024–25 (capital cities, 30 June 2025)", url: "https://www.abs.gov.au/statistics/people/population/regional-population/latest-release" },
      { label: "Australian Bureau of Statistics: Population up 1.5% in June 2025", url: "https://www.abs.gov.au/media-centre/media-releases/population-15-june-2025" },
      { label: "Australian Bureau of Statistics: Year Book Australia 2004, how many people live near the coast (2001)", url: "https://www.abs.gov.au/Ausstats/abs@.nsf/Previousproducts/1301.0Feature%20Article32004" },
    ],
  },

  germany: {
    title: "Where do most people in Germany live? Half on 3.2% of the land",
    description:
      "Half of Germany's population lives on 3.2% of its land, yet it's one of the most evenly spread big countries. See the map built from 1 km population data, and try splitting Germany in half yourself.",
    whyHeading: "Why Germany is spread so evenly",
    why: [
      <>
        Germany&apos;s biggest cluster of people, <A href="https://en.wikipedia.org/wiki/Rhine-Ruhr">Rhine-Ruhr</A> in the west, isn&apos;t one
        giant city. It is a region of more than 10 million people where Cologne, Düsseldorf, Dortmund, Essen and their neighbours have grown into
        each other: many centres, not one.
      </>,
      <>
        Our own measure shows how even it is. Germany&apos;s most lopsided half-cut still needs almost a third of the land: far more than Japan,
        Australia or South Korea, where a much smaller corner holds half of everyone.
      </>,
      <>
        The east has been thinning out, though: about 1.7 million people, 12% of its population, have left the former East German states since
        the fall of the Berlin Wall, according to <A href="https://en.wikipedia.org/wiki/Demographics_of_Germany">official figures</A>. Germany is
        home to about 83.5 million people in all, the most of any country in the European Union.
      </>,
    ],
    outlineNote: null,
    sources: [
      { label: "Wikipedia: Rhine-Ruhr metropolitan region", url: "https://en.wikipedia.org/wiki/Rhine-Ruhr" },
      { label: "Wikipedia: Demographics of Germany (population at 31 December 2025; migration from the east)", url: "https://en.wikipedia.org/wiki/Demographics_of_Germany" },
    ],
  },

  "south-korea": {
    title: "Where do most people in South Korea live? Half on 1.4% of the land",
    description:
      "Half of South Korea's population lives on just 1.4% of its land, most of it around Seoul. See where on a map built from 1 km population data, and try splitting South Korea in half yourself.",
    whyHeading: "Why half of South Korea lives around Seoul",
    why: [
      <>
        The <A href="https://en.wikipedia.org/wiki/Seoul_Capital_Area">Seoul Capital Area</A> (Seoul, Incheon and Gyeonggi Province) covers only
        about 12% of the country, but it is home to about 51% of South Korea&apos;s population, according to government figures for the end of
        2025 <A href="https://www.koreaherald.com/article/10846727">reported by the Korea Herald</A>. More people live in and around the capital than
        in the rest of the country put together.
      </>,
      <>
        The rest of the land is hard to build on: mountains cover about 70% of the{" "}
        <A href="https://en.wikipedia.org/wiki/Geography_of_Korea">Korean Peninsula</A>, especially in the east and north. So even outside the
        capital, Koreans live packed into cities: urban areas make up 16.7% of the country&apos;s territory but hold 92.1% of its people.
      </>,
    ],
    outlineNote: null,
    sources: [
      { label: "Korea Herald: Capital region remains home to more than half of the population (August 2026)", url: "https://www.koreaherald.com/article/10846727" },
      { label: "Wikipedia: Seoul Capital Area", url: "https://en.wikipedia.org/wiki/Seoul_Capital_Area" },
      { label: "Wikipedia: Geography of Korea", url: "https://en.wikipedia.org/wiki/Geography_of_Korea" },
    ],
  },
};
