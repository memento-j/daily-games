"use client";

// The streak under the score on both games' results screens (lib/streak.ts has the rules):
// "🔥 6-day streak", the last seven days as dots, the freezes held, and the countdown to the
// next puzzle. The streak part only shows from 2 days. On today's own results (`news`) it
// also says when a freeze saved the streak, and celebrates a milestone (3, 7, 30, 100 days)
// once ever: a small burst under 1.5 s, no sound; reduced motion shows only the message.
// Calm on purpose: it says what happened, never what could be lost.

import { useEffect, useState } from "react";
import Countdown from "@/components/Countdown";
import { getSetting, setSetting } from "@/lib/storage";
import { MAX_FREEZES, FREEZE_EVERY, milestoneText, type DayMark } from "@/lib/streak";
import { useToday } from "@/lib/useToday";
import { MILESTONES_SHOWN, useStreak } from "@/lib/useStreak";

const WORDS: Record<DayMark, string> = { played: "played", frozen: "saved by a freeze", missed: "missed", today: "today, not played yet" };

export default function StreakRow({ news }: { /** Today's daily results: freeze and milestone lines. */ news: boolean }) {
  const today = useToday();
  const streak = useStreak(today?.number ?? null);
  const milestone = news ? (streak?.milestone ?? null) : null;
  // The milestone celebrated on this screen, once ever: decided when it's first seen, then
  // remembered (the setting) so no later visit shows it again.
  const [celebrate, setCelebrate] = useState<number | null>(null);
  useEffect(() => {
    if (!milestone) return;
    const shown = getSetting<number[]>("site", MILESTONES_SHOWN, []);
    if (shown.includes(milestone)) return;
    setSetting("site", MILESTONES_SHOWN, [...shown, milestone]);
    setCelebrate(milestone); // eslint-disable-line react-hooks/set-state-in-effect -- shown once, read from storage after mount
  }, [milestone]);

  const show = !!streak && streak.current >= 2;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {show && (
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <span className="flex items-center gap-1">
              <span className="relative inline-block" aria-hidden="true">
                <span className={`inline-block ${celebrate ? "streak-pop" : ""}`}>🔥</span>
                {celebrate &&
                  SPARKS.map(([x, y], i) => (
                    <span key={i} className="streak-spark" style={{ "--to-x": `${x}px`, "--to-y": `${y}px` } as React.CSSProperties} />
                  ))}
              </span>
              <span>{streak.current}-day streak</span>
            </span>
            <span role="img" aria-label={`The last 7 days: ${streak.week.map((d) => WORDS[d]).join(", ")}`} className="flex items-center gap-[3px]">
              {streak.week.map((d, i) => (
                <Dot key={i} mark={d} wave={celebrate ? i : null} />
              ))}
            </span>
            {streak.freezes > 0 && (
              <span
                className="text-xs font-medium whitespace-nowrap text-ink-faint"
                title={`Streak freezes: each covers a missed day. One for every ${FREEZE_EVERY} days played, up to ${MAX_FREEZES}.`}
              >
                <span aria-hidden="true">🧊</span> {streak.freezes} saved
                <span className="sr-only"> streak {streak.freezes === 1 ? "freeze" : "freezes"}</span>
              </span>
            )}
          </p>
        )}
        <Countdown prefix="Next puzzle in" className="text-xs whitespace-nowrap text-ink-faint tabular-nums" />
      </div>
      {celebrate && <p className="streak-news text-[13px] font-semibold text-coral-deep">{milestoneText(celebrate)}</p>}
      {news && streak && streak.frozenToday > 0 && (
        <p className="text-[13px] text-ink-soft">
          A freeze saved your streak <span aria-hidden="true">🧊</span>
        </p>
      )}
    </div>
  );
}

/** Where the celebration's sparks fly, from the flame (px). */
const SPARKS: [number, number][] = [
  [0, -16],
  [14, -9],
  [14, 8],
  [0, 15],
  [-14, 8],
  [-14, -9],
];

/** One day: coral when played, an ice dot when a freeze covered it, an empty ring when missed,
 *  a dashed coral ring for today until it's played. */
function Dot({ mark, wave }: { mark: DayMark; wave: number | null }) {
  const anim = wave !== null ? "streak-dot-in" : "";
  const style = wave !== null ? ({ "--i": wave } as React.CSSProperties) : undefined;
  if (mark === "frozen") {
    return (
      <svg viewBox="0 0 10 10" className={`size-2.5 text-drop ${anim}`} style={style} aria-hidden="true">
        <circle cx="5" cy="5" r="4.35" className="fill-drop/20" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 2.6v4.8M2.9 3.8l4.2 2.4M2.9 6.2l4.2-2.4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  const look =
    mark === "played"
      ? "bg-coral"
      : mark === "today"
        ? "border-[1.5px] border-dashed border-coral"
        : "border-[1.5px] border-ink-faint/35";
  return <span className={`block size-2.5 rounded-full ${look} ${anim}`} style={style} aria-hidden="true" />;
}

/** The freeze rule, in a line, under each game's stats. */
export function FreezeNote() {
  return (
    <p className="-mt-2 text-xs text-ink-faint">
      One streak played in either game. Every {FREEZE_EVERY} days played earns a freeze <span aria-hidden="true">🧊</span> (hold up to {MAX_FREEZES}),
      which covers a missed day for you.
    </p>
  );
}
