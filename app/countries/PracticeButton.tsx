"use client";

// A country page's main action: practise this country in Slice. A Client Component only
// for the click event (country_practice_clicked), which shows whether readers become
// players. A plain link, so it works before (or without) JavaScript too.

import { track } from "@/lib/analytics";

/** `name` as a sentence says it ("the United States"); `country` for analytics ("United States"). */
export default function PracticeButton({ slug, name, country }: { slug: string; name: string; country: string }) {
  return (
    <a
      href={`/slice/?country=${slug}`}
      onClick={() => track("country_practice_clicked", { country })}
      className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-coral px-7 text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale] duration-200 hover:bg-coral-strong active:scale-[0.98]"
    >
      {/* The game's cut: a dashed line across a slab. */}
      <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
        <path d="M5 7.5c3-2 9-2.5 14 .5l-1 9c-4 2-9 1.5-13-.5Z" fill="white" opacity="0.35" />
        <path d="M3 18 21 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3.2 2.6" />
      </svg>
      Split {name} yourself
    </a>
  );
}
