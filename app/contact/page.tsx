// /contact: one email address and what's worth writing about. No form: a form needs a
// server (the site is static) or a third-party service that would see players' messages.

import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import CopyEmail from "./CopyEmail";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Get in touch with ${SITE_NAME}: report a wrong answer or a bug, suggest a game, or ask about your data.`,
  path: "/contact/",
});

export default function ContactPage() {
  return (
    <TextPage title="Say hello" lead="Found something wrong, have an idea, or just want to say which puzzle got you? Email is the way.">
      <CopyEmail email={CONTACT_EMAIL} />

      <h2>Worth writing about</h2>
      <ul>
        <li>
          <strong>A wrong answer.</strong> The puzzles come from real data, and real data has mistakes. If a river ends in the wrong sea or a country looks
          off, tell us which game and puzzle number.
        </li>
        <li>
          <strong>Something broken.</strong> Say what happened, and which phone or computer and browser you were on.
        </li>
        <li>
          <strong>Ideas.</strong> A game you&apos;d like to see, a country or river that surprised you, or anything that would make your daily puzzle better.
        </li>
        <li>
          <strong>Your data.</strong> Questions about privacy are welcome; the <Link href="/privacy/">privacy policy</Link> explains what {SITE_NAME}{" "}
          collects (very little).
        </li>
      </ul>
      <p>
        {SITE_NAME} is a small project, so replies can take a few days, but every message is read.
      </p>
    </TextPage>
  );
}
