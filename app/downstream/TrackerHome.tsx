"use client";

// Downstream's front page (/downstream): a raindrop tracked to the sea behind a
// card that explains the game and starts it. Desktop: one screen, the card set in
// from the left with the route framed in the open space beside it. Phones: the
// map on top, the card as a bottom sheet. Coral is the main colour (the raindrop,
// the player's actions); blue is kept for water.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SITE_NAME } from "@/lib/site";
import TrackerScene, { type TrackerStatus } from "./TrackerScene";
import { puzzleToPlay } from "@/games/downstream/schedule";
import { padPuzzleNumber } from "@/lib/daily";
import { useToday } from "@/lib/useToday";
import Countdown from "@/components/Countdown";
import { dropEmoji, maxPoints, totalPoints, type DropResult } from "@/games/downstream/scoring";
import { ShareButton } from "@/games/downstream/ui";
import { useTodayResult } from "@/games/downstream/useTodayResult";

type Scene = "loading" | "ready" | "unavailable";

export default function TrackerHome() {
  const [status, setStatus] = useState<TrackerStatus | null>(null);
  const [scene, setScene] = useState<Scene>("loading");
  const [clearLeft, setClearLeft] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const today = useToday();
  const done = useTodayResult();

  // Once this page is idle, fetch what the game needs (the map code, today's
  // puzzle) so pressing Play opens it straight away.
  useEffect(() => {
    const warm = () => {
      import("maplibre-gl").catch(() => {});
      const { number } = puzzleToPlay(null);
      fetch(`/data/downstream/${padPuzzleNumber(number)}.json`).catch(() => {});
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(warm);
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, []);

  // On wide screens, tell the scene how much of the left the card covers, so the
  // route is always framed beside it, never underneath.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const wide = matchMedia("(min-width: 1024px)");
    const measure = () => setClearLeft(wide.matches ? card.getBoundingClientRect().right + 24 : 0);
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(document.documentElement);
    wide.addEventListener("change", measure);
    measure();
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, []);

  return (
    <div className="font-sans relative bg-land text-ink lg:h-svh lg:overflow-hidden">
      <div className="relative h-[56svh] min-h-[340px] bg-sea lg:absolute lg:inset-0 lg:h-auto">
        <TrackerScene onStatus={setStatus} onReady={(ok) => setScene(ok ? "ready" : "unavailable")} clearLeft={clearLeft} />
        {scene === "ready" && (
          <p className="pointer-events-none absolute bottom-11 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-medium whitespace-nowrap text-ink-soft shadow-card lg:right-8 lg:bottom-14 lg:left-auto lg:translate-x-0">
            <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">Tap</span>
            <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">Click</span> the land to follow a new raindrop
          </p>
        )}
      </div>

      <Link
        href="/"
        className="group absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3.5 pl-2.5 text-xs font-semibold tracking-wide shadow-card transition-colors hover:text-coral-deep lg:top-6 lg:left-[max(2rem,6vw)]"
      >
        <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true">
          <path d="M16 10H5M9 5.5 4.5 10 9 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {SITE_NAME}
      </Link>

      <section
        ref={cardRef}
        className="relative z-10 -mt-7 rounded-t-[28px] bg-card px-5 pt-7 pb-8 shadow-card lg:absolute lg:top-1/2 lg:left-[max(2rem,6vw)] lg:mt-0 lg:w-[460px] lg:-translate-y-1/2 lg:rounded-[30px] lg:p-9"
      >
        <span aria-hidden="true" className="absolute top-3 left-1/2 block h-1 w-10 -translate-x-1/2 rounded-full bg-line lg:hidden" />

        <h1 className="font-display text-[56px] leading-[0.92] font-semibold tracking-[-0.04em] lg:text-[66px]">
          Downstream<span className="text-coral">.</span>
        </h1>
        <p className="mt-3.5 text-[18px] leading-snug text-ink-soft">
          A raindrop lands somewhere on Earth. Follow it downhill and guess which sea it reaches.
        </p>

        {done?.result ? (
          <DoneToday number={done.number} preview={done.preview} results={done.result.results} streak={done.stats.currentStreak} />
        ) : (
          <>
            <Link
              href="/downstream/play/"
              className="group mt-6 flex h-14 items-center justify-center gap-2 rounded-full bg-coral text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,transform] duration-200 ease-out hover:bg-coral-deep active:scale-[0.98]"
            >
              Play today&apos;s drops
              <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="mt-3 text-center text-sm text-ink-faint">
              {today ? (today.number ? `No. ${today.number} · ${today.date}` : `Preview · launches ${today.launch}`) : " "}
              {done && done.stats.currentStreak > 1 && ` · ${done.stats.currentStreak}-day streak`}
            </p>
          </>
        )}

        <HowItWorks status={scene === "ready" ? status : null} />
      </section>

      <p className="relative px-5 pb-6 text-[11px] leading-relaxed text-ink-faint lg:absolute lg:right-8 lg:bottom-5 lg:p-0">
        HydroRIVERS · IHO Sea Areas · © OpenStreetMap · Terrain Tiles.
        {scene === "ready" && " Hero map: an illustrative world."}
      </p>
    </div>
  );
}

const STEPS = [
  { icon: <PinIcon />, title: "Rain falls on the pin", body: "Somewhere real on Earth. Four seas are on offer." },
  { icon: <RouteIcon />, title: "Let it flow", body: "The route reveals in three stops, from stream to river to coast." },
  { icon: <FlagIcon />, title: "Call the sea", body: "One guess per drop. Lock in early for 4, 3, 2 or 1 points." },
];

/**
 * How a round works, set as a tracker timeline. Each step lights as the demo drop
 * reaches it: landing, flowing, arrived.
 */
function HowItWorks({ status }: { status: TrackerStatus | null }) {
  const at = !status ? -1 : status.phase === "arrived" ? 2 : status.progress < 0.12 ? 0 : 1;
  return (
    <div className="mt-7 border-t border-line pt-6">
      <h2 className="font-display text-[22px] leading-tight font-semibold tracking-[-0.02em]">How a round works</h2>
      <ol className="relative mt-4">
        {/* The timeline's thread, from first chip to last */}
        <span aria-hidden="true" className="absolute top-5 bottom-5 left-[19px] border-l-2 border-dotted border-coral/35" />
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 py-2.5">
            <span
              className={`relative grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-500 ${
                i === at ? "bg-coral text-white" : "bg-coral-soft text-coral-deep"
              }`}
            >
              {step.icon}
            </span>
            <span className="pt-0.5">
              <span className="block text-[16px] font-semibold">{step.title}</span>
              <span className="block text-[15px] leading-snug text-ink-soft">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-ink-faint">Five drops a day, from easy to surprising.</p>
    </div>
  );
}

const iconProps = { viewBox: "0 0 20 20", className: "size-[18px]", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 17s5-4.6 5-8.5a5 5 0 0 0-10 0C5 12.4 10 17 10 17Z" />
      <circle cx="10" cy="8.5" r="1.8" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="5" cy="5" r="1.8" />
      <circle cx="15" cy="15" r="1.8" />
      <path d="M6.5 6.5c2 2 5.5 0 6.2 3.2.4 1.9-1 2.8-.5 3.8" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 17V3.5M5 4h9l-2 3 2 3H5" />
    </svg>
  );
}

/** Today's puzzle is finished: the score, the countdown, and sharing come first. */
function DoneToday({ number, preview, results, streak }: { number: number; preview: boolean; results: DropResult[]; streak: number }) {
  const max = maxPoints(results.length);
  return (
    <div className="mt-6">
      <div className="rounded-2xl bg-coral-soft/60 p-4">
        <p className="flex items-baseline justify-between">
          <span className="font-semibold text-coral-deep">Done today{streak > 1 ? ` · ${streak}-day streak` : ""}</span>
          <span className="font-display text-[28px] leading-none font-semibold tracking-[-0.03em]">
            {totalPoints(results)}
            <span className="text-base text-ink-faint"> / {max}</span>
          </span>
        </p>
        <p className="mt-2 text-xl tracking-[0.15em]" aria-label="Your marks for today's five drops">
          {results.map(dropEmoji).join("")}
        </p>
        <Countdown className="mt-2 block text-sm font-semibold text-ink-soft" />
      </div>
      <div className="mt-4 grid gap-2">
        <ShareButton number={number} preview={preview} results={results} maxPointsTotal={max} />
        <Link
          href="/downstream/play/"
          className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
        >
          See your results
        </Link>
      </div>
    </div>
  );
}
