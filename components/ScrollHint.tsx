"use client";

// "More below": tells the player a results screen goes on. It has a place of its own in the
// layout rather than floating over the content, so it can never sit on anything tappable: in
// Slice's card, a strip under the sheet; on Downstream, the gap between the next steps and the
// chart. Tapping it scrolls to the chart.
//
// It goes for good once the player starts scrolling or the chart comes into view. Its place
// stays if they've scrolled (taking it away would pull the content from under their finger);
// with the chart already in view and nothing scrolled, a page-level hint folds away entirely.

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { scrollToChart } from "@/components/ScoreComparison";

/** Any more scrolling than this counts as the player having started. */
const SCROLLED_PX = 4;
/** How much of the chart must show to count as in view: its title and tabs and some bars, as
 *  a title just peeking in doesn't show there's a chart to see. */
const CHART_IN_VIEW_PX = 160;

function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(box).overflowY)) return box;
  }
  return null; // the page itself
}

export default function ScrollHint({
  ready,
  scroller,
}: {
  /** The comparison has arrived or failed, so what's below is known. */
  ready: boolean;
  /** What scrolls, when the hint sits outside it (Slice's sheet). Its strip then always stays,
   *  as the board is framed around the card's height. */
  scroller?: RefObject<HTMLElement | null>;
}) {
  const self = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"waiting" | "shown" | "gone" | "folded">("waiting");
  const finished = state === "gone" || state === "folded";

  useEffect(() => {
    const el = self.current;
    if (!el || !ready || finished) return;
    const box = scroller?.current ?? scrollerOf(el);
    const measure = () => {
      const moved = box ? box.scrollTop : scrollY;
      if (moved > SCROLLED_PX) return setState("gone");
      const bottom = Math.min(box?.getBoundingClientRect().bottom ?? innerHeight, innerHeight);
      const chart = document.getElementById("score-chart");
      if (chart && chart.getBoundingClientRect().top < bottom - CHART_IN_VIEW_PX) return setState(scroller ? "gone" : "folded");
      const more = box ? box.scrollHeight - box.clientHeight > 24 : true;
      setState(more ? "shown" : scroller ? "gone" : "folded");
    };
    measure();
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [ready, finished, scroller]);

  if (state === "folded") return null;
  const shown = state === "shown";
  return (
    <div ref={self} className="flex h-8 shrink-0 justify-center">
      <button
        type="button"
        onClick={() => {
          setState("gone");
          scrollToChart();
        }}
        tabIndex={shown ? 0 : -1}
        aria-hidden={!shown}
        className={`flex h-8 items-center gap-1 rounded-full bg-ink pr-2.5 pl-3 text-xs font-semibold text-card shadow-[0_4px_12px_-3px_rgb(18_26_43/0.45)] transition-[opacity,scale] duration-200 hover:scale-105 active:scale-95 ${
          shown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        More below
        <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
          <path d="M10 4v11M5.5 11 10 15.5 14.5 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
