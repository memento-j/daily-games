// /privacy: the privacy policy, in plain words. It describes what the site actually
// does; when that changes (ads, accounts, a new service the browser talks to), this
// page must change with it, along with the date below.

import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: `How ${SITE_NAME} handles your data: no accounts, no cookies, progress kept on your device, random per-puzzle score IDs and cookie-free analytics.`,
  path: "/privacy/",
});

const UPDATED = "12 November 2026";

export default function PrivacyPage() {
  return (
    <TextPage
      title="Privacy"
      lead={`The short version: no accounts, no cookies, no ads. Your game progress stays on your device. When you finish a daily puzzle, your scores are sent with a random ID made for that puzzle alone, so you can see how you compare.`}
    >
      <p>
        This policy explains what happens to your data when you use {SITE_NAME} (this website and its games). Last updated {UPDATED}.
      </p>

      <h2>Who&apos;s responsible</h2>
      <p>
        {SITE_NAME} is run by an independent developer based in the United States. For anything about your data, contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What stays on your device</h2>
      <p>
        {SITE_NAME} saves your game progress, streaks, saved results and the per-puzzle IDs described below in your browser&apos;s own storage (local storage),
        along with settings like sound on or off, light or dark mode, and whether you&apos;ve seen the first-time tips. It also notes the day you first visited
        and how many days you&apos;ve visited, to count return visits (see Analytics).
      </p>
      <p>
        This is needed for the game to work and is never used for advertising or cross-site tracking. It isn&apos;t a cookie. You can delete it at any time by
        clearing this site&apos;s data in your browser settings, which also resets your streaks.
      </p>

      <h2>Your scores</h2>
      <p>
        So you can see how you compare with other players, our score server stores the following when you finish a daily puzzle: a random ID generated for that
        puzzle, the game, the puzzle number, your round scores, which rounds used a hint, and the time of submission.
      </p>
      <p>
        The ID is not linked to your name, account or email, and a new one is made for each puzzle. All of this is used only to show score comparisons and prevent
        duplicate submissions. Practice rounds are never sent. Our score server is hosted by DigitalOcean in New York, USA.
      </p>
      <p>
        Scores are kept to power the comparisons. Server backups are kept for 14 days. To ask for your scores to be deleted, contact{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Because the IDs are random and made per puzzle, we may not be able to identify your scores unless you
        give us the ID. Deleted scores may remain in server backups for up to 14 days before those backups are automatically removed.
      </p>

      <h2>Server logs</h2>
      <p>
        The score server&apos;s web server records standard request logs (IP address, time, requested URL and browser user agent) for security and abuse prevention.
        They&apos;re automatically deleted after 14 days. Rate limiting uses IP addresses in memory only for a few minutes and never stores them.
      </p>

      <h2>Analytics</h2>
      <p>
        We use <a href="https://posthog.com/">PostHog</a>, hosted in the European Union, to understand how {SITE_NAME} is used: how many people visit,
        which games they play, how many finish, and how many come back. It runs in a cookieless mode: no cookies, nothing stored on your device for it,
        and no ID that follows you from one day to the next. It records:
      </p>
      <ul>
        <li>the page you visit, the site that linked you here, and your browser, operating system, device type, screen size and language;</li>
        <li>your approximate location (country, region and city), worked out from your IP address, which is not stored;</li>
        <li>
          game events: starting a puzzle, finishing it with your total score, current streak, streak freezes held and (in Slice) how many rounds used the hint, reaching a streak milestone (how many days) or having a streak freeze cover a missed day (your streak and freezes left), starting and
          finishing a Slice practice country (which country, its score and whether you used the hint), pressing a country page&apos;s button to try that country, clicking the &ldquo;Support Pondo&rdquo; link (and where it was), whether a score reached the score server, switching the score chart between its views, turning Slice&apos;s map overlays on or off, choosing what to play next from a results screen (which option and where it was), pressing Share or saving the result picture (whether it was
          shared, copied, saved or cancelled, never what you shared or who to), and a once-a-day visit that says how many days it has been since your first visit and on how many
          different days you&apos;ve visited.
        </li>
      </ul>
      <p>
        We don&apos;t use it to identify you, and we never combine it with anything else. You can block it with any content blocker, and the games
        work exactly the same.
      </p>

      <h2>Services your browser talks to</h2>
      <p>Like every website, {SITE_NAME} can only reach you through other services. Each one sees your IP address when your browser connects to it:</p>
      <ul>
        <li>
          <strong>Cloudflare</strong> hosts the website and delivers its pages (not the score traffic). It processes connection data, including IP addresses, to serve
          the site and protect it from abuse. See <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare&apos;s privacy policy</a>.
        </li>
        <li>
          <strong>OpenFreeMap</strong> provides Downstream&apos;s map. Your browser downloads the map&apos;s pieces from its servers while you play. See{" "}
          <a href="https://openfreemap.org/privacy">OpenFreeMap&apos;s privacy policy</a>.
        </li>
        <li>
          <strong>Buy Me a Coffee</strong>, only if you click &ldquo;Support Pondo&rdquo;: it opens their site in a new tab, under{" "}
          <a href="https://buymeacoffee.com/privacy-policy">their privacy policy</a>. Nothing is loaded from it otherwise.
        </li>
        <li>
          <strong>Our score server</strong> (api.pondo.games), hosted by DigitalOcean in New York, USA, for the scores above. It&apos;s reached directly, not through
          Cloudflare. See <a href="https://www.digitalocean.com/legal/privacy-policy">DigitalOcean&apos;s privacy policy</a>.
        </li>
        <li>
          <strong>PostHog</strong> (EU hosting), for the analytics above. See <a href="https://posthog.com/privacy">PostHog&apos;s privacy policy</a>.
        </li>
      </ul>
      <p>Fonts and everything else are served from {SITE_NAME} itself.</p>

      <h2>Where data is processed</h2>
      <p>PostHog analytics are hosted in the EU. The score server is in the USA. Cloudflare and OpenFreeMap operate globally.</p>

      <h2>Why we use this data</h2>
      <p>
        Game progress and per-puzzle IDs on your device are needed for the games to work. Score comparisons, server logs and analytics rely on our legitimate interest
        in running, improving and protecting {SITE_NAME}, kept to the minimum needed.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete data about you, or object to how it&apos;s used, by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If
        you&apos;re in the EU or UK, you can also complain to your local data protection authority.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No accounts, sign-ups or passwords.</li>
        <li>No cookies.</li>
        <li>No advertising or ad tracking, and no selling or sharing of data.</li>
        <li>
          Sharing a result only puts a line of text (the puzzle number and your score) on your clipboard or share sheet, and on phones a picture of
          your score, drawn in your browser. We never see what you share.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is a general-audience site, not directed at children under 13, and we don&apos;t knowingly collect personal information from children under 13.
      </p>

      <h2>Emails</h2>
      <p>
        If you email us, we use your address and message only to reply, and we don&apos;t add you to any list.
      </p>

      <h2>Changes</h2>
      <p>
        If {SITE_NAME} starts doing something new with data, for example showing ads, this page will say so first, and we&apos;ll ask for your consent where
        the law requires it. The date at the top shows the last change.
      </p>

      <h2>Questions</h2>
      <p>
        Ask anything about your data, or how to exercise your rights, at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, or see the{" "}
        <Link href="/contact/">contact page</Link>.
      </p>
    </TextPage>
  );
}
