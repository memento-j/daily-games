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
  description: `How ${SITE_NAME} handles your data: no accounts, no cookies, game progress kept on your device, and cookie-free analytics.`,
  path: "/privacy/",
});

const UPDATED = "21 October 2026";

export default function PrivacyPage() {
  return (
    <TextPage
      title="Privacy"
      lead={`The short version: no accounts, no cookies, no ads, and nothing that identifies you. Your game progress stays on your device.`}
    >
      <p>
        This policy explains what happens to your data when you use {SITE_NAME} (this website and its games). Last updated {UPDATED}.
      </p>

      <h2>What stays on your device</h2>
      <p>
        To remember your game, {SITE_NAME} saves a few things in your browser&apos;s own storage (local storage): your results for each day&apos;s puzzle,
        your streaks, a puzzle you&apos;re halfway through, and settings like sound on or off, light or dark mode, and whether you&apos;ve seen the first-time
        tips. It also notes the day you first visited and how many days you&apos;ve visited, to count return visits (see below).
      </p>
      <p>
        This never leaves your device and we can&apos;t see it. It isn&apos;t a cookie. You can delete it at any time by clearing this site&apos;s data in your
        browser settings, which also resets your streaks.
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
          game events: starting a puzzle, finishing it with your total score and current streak, pressing Share (whether it was shared or copied,
          never what you shared or who to), and a once-a-day visit that says how many days it has been since your first visit and on how many
          different days you&apos;ve visited.
        </li>
      </ul>
      <p>
        None of this can be used to identify you, and we never combine it with anything else. You can block it with any content blocker, and the games
        work exactly the same.
      </p>

      <h2>Services your browser talks to</h2>
      <p>Like every website, {SITE_NAME} can only reach you through other services. Each one sees your IP address when your browser connects to it:</p>
      <ul>
        <li>
          <strong>Cloudflare</strong> hosts the site and delivers every page. It processes connection data, including IP addresses, to serve the site and
          protect it from abuse. See <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare&apos;s privacy policy</a>.
        </li>
        <li>
          <strong>OpenFreeMap</strong> provides Downstream&apos;s map. Your browser downloads the map&apos;s pieces from its servers while you play. See{" "}
          <a href="https://openfreemap.org/privacy">OpenFreeMap&apos;s privacy policy</a>.
        </li>
        <li>
          <strong>PostHog</strong> (EU hosting), for the analytics above. See <a href="https://posthog.com/privacy">PostHog&apos;s privacy policy</a>.
        </li>
      </ul>
      <p>Fonts and everything else are served from {SITE_NAME} itself.</p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No accounts, sign-ups or passwords.</li>
        <li>No cookies.</li>
        <li>No advertising or ad tracking, and no selling or sharing of data.</li>
        <li>Sharing a result only puts a line of text (the puzzle number and your score) on your clipboard or share sheet. We never see what you share.</li>
      </ul>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is a general-audience site, not directed at children under 13, and we don&apos;t knowingly collect personal information from anyone.
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
