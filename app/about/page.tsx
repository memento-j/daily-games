// /about: what Pondo is, how the daily puzzles work, and the credits every dataset
// asks for (a running list: add each new dataset here as it arrives). Real content in
// the static HTML, for players, search engines and, later, AdSense review.

import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: `${SITE_NAME} makes small, free daily geography puzzles built on real data: Slice and Downstream. How they work, and where the data comes from.`,
  path: "/about/",
});

export default function AboutPage() {
  return (
    <TextPage
      title={`About ${SITE_NAME}`}
      lead="Small daily puzzles about the world. One new puzzle a day in each game, the same for everyone, a few minutes long. Free, with no account."
    >
      <h2>The games</h2>
      <h3>
        <Link href="/slice/">Slice</Link>
      </h3>
      <p>
        Draw one straight line across a real country to split its population exactly in half. It looks like a test of
        shapes, but it isn&apos;t: the population crowds into cities, coasts and river valleys, so the line that looks right is often far off.
      </p>
      <h3>
        <Link href="/downstream/">Downstream</Link>
      </h3>
      <p>
        A raindrop lands somewhere on Earth. Follow it downhill and guess which sea it ends up in. Call it early for more points, or let the water
        run a little further first. It isn&apos;t always the nearest sea.
      </p>

      <h2>Real data, real surprises</h2>
      <p>
        The puzzles aren&apos;t made up. Slice&apos;s countries come from Natural Earth&apos;s borders and its populations from a world map of people in 1 km
        squares. Downstream&apos;s routes are traced through a map of 8.5 million river stretches to the sea the water really reaches. When an answer
        surprises you, it&apos;s a true fact about the world.
      </p>

      <h2>How the daily puzzle works</h2>
      <p>
        A new puzzle arrives at midnight where you are. Your browser works out which one from today&apos;s date, so everyone playing on the same day gets the
        same puzzle and can compare results.
      </p>
      <p>
        Your results and streaks are saved on your device, not on a server, so they don&apos;t follow you to another phone or browser, and clearing your
        browser&apos;s data clears them too. More in the <Link href="/privacy/">privacy policy</Link>.
      </p>

      <h2 id="credits">Credits</h2>
      <p>{SITE_NAME} is built on open data. Thank you to everyone who makes it.</p>
      <ul className="credit">
        <li>
          <strong>Population (Slice):</strong> Schiavina M., Freire S., Carioli A., MacManus K. (2023): GHS-POP R2023A, GHS population grid multitemporal
          (1975-2030). European Commission, Joint Research Centre (JRC). Licensed{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. The puzzles use the 2025 grid at 1 km, summed into points.
        </li>
        <li>
          <strong>Country borders (Slice):</strong> <a href="https://www.naturalearthdata.com/">Natural Earth</a>, Admin 0 Countries 1:10m. Public domain.
        </li>
        <li>
          <strong>Rivers (Downstream):</strong> HydroRIVERS, from <a href="https://www.hydrosheds.org/">HydroSHEDS</a>. Lehner, B., Grill, G. (2013): Global
          river hydrography and network routing: baseline data and new approaches to study the world&apos;s large river systems. Hydrological Processes,
          27(15): 2171-2186.
        </li>
        <li>
          <strong>Seas and oceans (Downstream):</strong> Flanders Marine Institute (2018). IHO Sea Areas, version 3. Available from{" "}
          <a href="https://www.marineregions.org/">Marine Regions</a>.
        </li>
        <li>
          <strong>Maps (Downstream):</strong> <a href="https://openfreemap.org/">OpenFreeMap</a>, © <a href="https://openmaptiles.org/">OpenMapTiles</a>,
          data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>.
        </li>
        <li>
          <strong>Type:</strong> Bricolage Grotesque and Hanken Grotesk, under the SIL Open Font License.
        </li>
      </ul>

      <h2>Say hello</h2>
      <p>
        Found a wrong answer, a bug, or have an idea for a game? <Link href="/contact/">Get in touch</Link>.
      </p>
    </TextPage>
  );
}
