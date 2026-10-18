"use client";

// The /slice/lab prototype screen: the 3D table (sliceScene.ts) under a thin layer of
// interface. Pick a sample country, draw, confirm, watch the reveal, orbit, again.
// Scoring is the real game's (games/slice); only the presentation is new.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { crosses, perfectLine, share } from "@/games/slice/cut";
import { lineThrough } from "@/games/slice/geometry";
import { cutEmoji, scoreCut, type CutResult } from "@/games/slice/scoring";
import type { Round } from "@/games/slice/types";
import { instruction, resultLine } from "@/games/slice/words";
import { subscribe } from "@/lib/storage";
import { isMuted, labSound, setMuted } from "./labSound";
import type { SliceScene } from "./sliceScene";

const SAMPLES = ["egypt", "canada", "chile", "indonesia", "australia", "italy"];
const TIER_WORDS = ["Spot on", "Close", "Not bad", "Way off"];
const LABEL = "pointer-events-none absolute top-0 left-0 rounded-full bg-white/90 px-3 py-1 text-[17px] font-bold tabular-nums shadow-card";

export default function LabGame() {
  const holder = useRef<HTMLDivElement>(null);
  const labelA = useRef<HTMLDivElement>(null);
  const labelB = useRef<HTMLDivElement>(null);
  const scene = useRef<SliceScene | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [sample, setSample] = useState(SAMPLES[0]);
  const [round, setRound] = useState<Round | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [phase, setPhase] = useState<"draw" | "reveal" | "done">("draw");
  const [result, setResult] = useState<CutResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Create the 3D scene once. three.js is imported here, in the browser, never at build time.
  useEffect(() => {
    let cancelled = false;
    let made: SliceScene | null = null;
    import("./sliceScene")
      .then(({ SliceScene }) => {
        if (cancelled || !holder.current) return;
        made = new SliceScene(holder.current, [labelA.current!, labelB.current!], (d) => {
          setHasDraft(!!d);
          setMessage(null);
        });
        scene.current = made;
        measure();
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      made?.dispose();
      scene.current = null;
    };
  }, []);

  // Tell the scene how much of the screen the interface covers, so the country is
  // framed in the space between (on desktop the card used to hide its south).
  function measure() {
    const t = top.current?.getBoundingClientRect();
    const b = bottom.current?.getBoundingClientRect();
    if (!t || !b || !scene.current) return;
    scene.current.setInsets({ top: Math.round(t.bottom + 8), bottom: Math.round(window.innerHeight - b.top + 8) });
  }
  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (top.current) ro.observe(top.current);
    if (bottom.current) ro.observe(bottom.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Load the picked sample, then hand it to the scene (retrying until the scene exists).
  useEffect(() => {
    let cancelled = false;
    fetch(`/data/slice/lab/${sample}.json`)
      .then((r) => r.json() as Promise<Round>)
      .then((r) => {
        if (cancelled) return;
        setRound(r);
        setPhase("draw");
        setResult(null);
        const hand = () => {
          if (cancelled) return;
          if (scene.current) scene.current.setRound(r);
          else window.setTimeout(hand, 50);
        };
        hand();
      });
    return () => {
      cancelled = true;
    };
  }, [sample]);

  function confirm() {
    const draft = scene.current?.getDraft();
    const line = draft && lineThrough(draft[0], draft[1]);
    if (!round || !line) return;
    if (!crosses(round, line)) {
      setMessage(`That line doesn't cross ${round.country}. Draw one that cuts through it.`);
      return;
    }
    const scored = scoreCut(round, line);
    setResult(scored);
    setPhase("reveal");
    scene.current?.reveal(line, perfectLine(round, line), share(round, line), scored.positive, scored.tier, () => setPhase("done"));
  }

  function again() {
    labSound.tap();
    setPhase("draw");
    setResult(null);
    scene.current?.again();
  }

  return (
    <div className="font-sans relative h-svh overflow-hidden bg-[#bccdbd] text-ink">
      <div ref={holder} className="absolute inset-0" />
      {failed && <p className="absolute inset-0 grid place-items-center p-6 text-center">This prototype needs WebGL.</p>}

      {/* Piece labels, positioned by the scene every frame. */}
      <div ref={labelA} className={LABEL} style={{ opacity: 0 }} />
      <div ref={labelB} className={LABEL} style={{ opacity: 0 }} />

      <div ref={top} className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <Link href="/slice/" className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold shadow-card hover:text-coral-deep">
            ← Slice<span className="text-coral">.</span> lab
          </Link>
          <SoundButton />
          <div className="flex flex-wrap justify-end gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  labSound.tap();
                  setSample(s);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize shadow-card ${s === sample ? "bg-ink text-white" : "bg-white"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {round && (
          <h1 className="font-display mt-4 max-w-[22ch] text-[26px] leading-tight font-semibold tracking-[-0.02em] text-balance">
            {instruction(round)}
          </h1>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div ref={bottom} className="pointer-events-auto mx-auto max-w-[520px] rounded-[26px] bg-white/95 p-4 shadow-card">
          {phase === "draw" ? (
            <div className="flex flex-col gap-3">
              <p className={`text-[15px] ${message ? "font-semibold text-coral-deep" : "text-ink-soft"}`} aria-live="polite">
                {message ?? (hasDraft ? "Drag the ends to adjust, then cut." : "Drag across the country to draw your cut.")}
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={!hasDraft}
                className="h-14 rounded-full bg-coral text-[19px] font-bold text-white transition-colors hover:bg-coral-deep disabled:bg-ink/10 disabled:text-ink-faint"
              >
                Cut
              </button>
            </div>
          ) : result && round ? (
            <div className="flex flex-col gap-2">
              <p className={`text-[18px] font-semibold transition-opacity duration-500 ${phase === "done" ? "opacity-100" : "opacity-0"}`}>
                <span aria-hidden="true">{cutEmoji(result)}</span> {TIER_WORDS[result.tier]}. {resultLine(result.share, round.target)}
              </p>
              <p className={`text-[14px] text-ink-soft transition-opacity duration-500 ${phase === "done" ? "opacity-100" : "opacity-0"}`}>
                {round.fact} Drag to look around.
              </p>
              <button type="button" onClick={again} className="mt-1 h-12 rounded-full bg-ink text-[17px] font-bold text-white">
                Cut again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Sound on/off, remembered (storage setting "slice" / "muted"). */
function SoundButton() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) labSound.tap();
      }}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={!muted}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-card"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
        <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
        {muted ? (
          <path d="M13.5 7.5l4 5m0-5l-4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M13 7.2a4 4 0 0 1 0 5.6M15.4 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
