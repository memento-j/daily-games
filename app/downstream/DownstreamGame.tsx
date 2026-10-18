"use client";

// The Downstream game screen (/downstream). Phones get PhoneGame; this file
// is the desktop split screen: a fixed control column on the left and the map in
// the rest. The seas are picked on the map (one place to choose; developer's call,
// 2026-10-17); the column holds what a correct call is worth, Lock in, Let it flow,
// and the result. Keys: 1-4 pick a sea, Enter locks it in, Space lets it flow,
// N goes on. The column's foot is reserved for an ad (after launch).
//
// Game rules and loading live in games/downstream (useDownstreamGame); this file
// only decides how it looks.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import AdSlot from "@/components/AdSlot";
import RouteMap from "@/games/downstream/RouteMap";
import { POINTS_BY_STAGE } from "@/games/downstream/scoring";
import { HideSeasToggle, SeaButtons, usePick, useSeaSpots, useSize } from "@/games/downstream/SeaButtons";
import { sound } from "@/games/downstream/sound";
import { mostSurprisingDrop } from "@/games/downstream/summary";
import {
  DaySummary,
  DropAnnouncer,
  DropTokens,
  FirstTimeHint,
  FlowButton,
  GameNotice,
  GameTopBar,
  LockInSlot,
  NextButton,
  ResultSeas,
  ResultText,
  SoundToggle,
  useFirstTime,
} from "@/games/downstream/ui";
import { useDownstreamGame } from "@/games/downstream/useDownstreamGame";
import PhoneGame from "./PhoneGame";

// Phones get their own layout (PhoneGame); this file's split screen is for 1024px and up.
const DESKTOP = "(min-width: 1024px)";
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(DESKTOP);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => matchMedia(DESKTOP).matches,
    () => true,
  );
}

export default function DownstreamGame() {
  const g = useDownstreamGame();
  const [firstTime, dismissIntro] = useFirstTime();
  const stopFlow = useRef<() => void>(() => {});
  const isDesktop = useIsDesktop();
  // The sea picked on the map waits for Lock in.
  const [picked, setPick] = usePick(g.game);
  const [seasHidden, setSeasHidden] = useState(false);
  // The day's summary: which drop's route the map is replaying (null = the biggest surprise).
  const [viewing, setViewing] = useState<number | null>(null);
  const [mapRef, mapSize] = useSize<HTMLDivElement>();
  const ready = g.load.status === "ready" ? g.load : null;
  const current = ready ? ready.puzzle.drops[Math.min(g.game.drop, ready.puzzle.drops.length - 1)] : null;
  const [onCamera, spots] = useSeaSpots(current?.seaLabels);
  // Start downloading the map code now, alongside the puzzle, not after it.
  useEffect(() => {
    import("maplibre-gl").catch(() => {}); // RouteMap shows "Try again" if it really fails
  }, []);

  const finished = g.phase === "finished";
  const result = !ready || finished ? undefined : g.game.results[g.game.drop];
  const guessing = !!ready && !finished && !result;

  if (!ready || !current) return <GameNotice load={g.load as Exclude<typeof g.load, { status: "ready" }>} preview={g.preview} />;

  const { number, puzzle } = ready;
  const drop = current;
  const shown = viewing ?? mostSurprisingDrop(puzzle.drops);
  const mapDrop = finished ? puzzle.drops[shown] : drop;
  const revealKm = finished || result ? Infinity : g.game.stage === 0 ? 0 : drop.stages[g.game.stage - 1];
  const points = POINTS_BY_STAGE[g.game.stage];
  const last = g.game.drop + 1 >= puzzle.drops.length;

  function guess(option: string) {
    setPick(null);
    if (firstTime) dismissIntro();
    if (option === drop.answer) sound.right();
    else sound.wrong();
    g.act({ type: "guess", option });
  }
  function pick(name: string) {
    setPick(name === picked ? null : name); // the picked one again un-picks it
  }
  function flow() {
    sound.tap();
    if (firstTime) dismissIntro();
    g.act({ type: "reveal" });
  }
  function next() {
    sound.next();
    g.act({ type: "next" });
  }

  // Keyboard play (desktop): 1-4 pick, Enter lock in, Space let it flow, N next.
  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const onButton = target?.closest("button, a, input, textarea, select");
    if (guessing && !seasHidden && /^[1-4]$/.test(e.key)) {
      const name = drop.options[Number(e.key) - 1];
      if (name) {
        sound.tap();
        pick(name);
      }
    } else if (guessing && e.key === "Enter" && picked && (!onButton || target?.closest(`[data-sea="${CSS.escape(picked)}"]`))) {
      // Enter with nothing focused, or on the already-picked sea, locks it in.
      e.preventDefault();
      guess(picked);
    } else if (guessing && e.key === " " && !onButton) {
      e.preventDefault();
      flow();
    } else if (result && (e.key === "n" || e.key === "N")) {
      next();
    }
  }

  const mapProps = {
    pin: mapDrop.pin,
    route: mapDrop.route,
    revealKm: finished ? Infinity : revealKm,
    labels: mapDrop.seaLabels,
    answer: finished || result ? mapDrop.answer : undefined,
    yourPick: result?.guess && !result.correct ? result.guess : undefined,
    interactive: finished || !!result,
    // The river network would give the answer away: only once the drop is decided.
    showRivers: finished || !!result,
    onLand: () => sound.drip(),
    onFlowStart: (ms: number) => {
      stopFlow.current();
      stopFlow.current = ms > 0 ? sound.flow(ms) : () => {};
    },
    onFlowEnd: (final: boolean) => (final ? sound.splash() : sound.chime()),
  };

  if (!isDesktop) {
    return (
      <PhoneGame
        number={number}
        preview={g.preview}
        puzzle={puzzle}
        game={g.game}
        drop={drop}
        result={result}
        finished={finished}
        firstTime={firstTime}
        onDismissIntro={() => {
          sound.tap();
          dismissIntro();
        }}
        onGuess={guess}
        onFlow={flow}
        onNext={next}
        viewing={shown}
        onView={setViewing}
        map={mapProps}
      />
    );
  }

  return (
    <div className="font-sans grid h-svh grid-cols-[440px_1fr] overflow-hidden bg-land text-ink">
      <KeyboardControls onKey={onKey} />
      <section className="relative z-10 flex flex-col overflow-y-auto bg-card p-8 shadow-[8px_0_30px_-18px_rgb(18_26_43/0.3)]">
        <h1 className="sr-only">
          Downstream {g.preview ? "preview" : "No."} {number}
          {finished ? ": today's results" : `, drop ${g.game.drop + 1} of ${puzzle.drops.length}`}
        </h1>
        <GameTopBar number={number} preview={g.preview} />
        {finished ? (
          <div className="mt-8">
            <DaySummary number={number} puzzle={puzzle} game={g.game} preview={g.preview} viewing={shown} onView={setViewing} />
          </div>
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between">
              <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">
                Drop {g.game.drop + 1} <span className="text-ink-faint">of {puzzle.drops.length}</span>
              </p>
              <DropTokens puzzle={puzzle} game={g.game} />
            </div>
            <DropAnnouncer drop={drop} stage={g.game.stage} decided={!!result} />

            {result ? (
              <div className="mt-6 flex flex-col gap-4">
                <ResultText drop={drop} result={result} />
                <ResultSeas drop={drop} result={result} />
                <NextButton last={last} onNext={next} />
                <p className="text-center text-xs text-ink-faint">
                  Press <kbd className="font-sans font-semibold">N</kbd> for the {last ? "results" : "next drop"}
                </p>
              </div>
            ) : (
              <>
                {firstTime && g.game.drop === 0 && (
                  <div className="mt-6">
                    <FirstTimeHint
                      onDismiss={() => {
                        sound.tap();
                        dismissIntro();
                      }}
                    />
                  </div>
                )}
                <div className="mt-6 rounded-2xl bg-coral-soft/60 p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-coral-deep">A correct call now is worth</p>
                    <p className="font-display text-[34px] leading-none font-semibold tracking-[-0.03em] text-coral-deep">
                      {points}
                      <span className="text-base"> pt{points === 1 ? "" : "s"}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex gap-1.5" aria-hidden="true">
                    {POINTS_BY_STAGE.map((_, i) => (
                      <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-500 ${i >= g.game.stage ? "bg-coral" : "bg-coral/20"}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-[15px] text-ink-soft">Which sea does this raindrop reach?</p>
                <div className="mt-3 flex flex-col gap-3" aria-live="polite">
                  <LockInSlot picked={picked} points={points} onLock={guess} />
                  <FlowButton stage={g.game.stage} stops={drop.stages.length} onFlow={flow} />
                </div>
                <p className="mt-4 text-center text-xs text-ink-faint">
                  Keys: <kbd className="font-sans font-semibold">1</kbd>–<kbd className="font-sans font-semibold">4</kbd> pick ·{" "}
                  <kbd className="font-sans font-semibold">Enter</kbd> lock in · <kbd className="font-sans font-semibold">Space</kbd> let it flow
                </p>
              </>
            )}
          </>
        )}
        <AdSlot className="mt-auto pt-8" />
      </section>

      <div ref={mapRef} className="relative h-full">
        <RouteMap
          {...mapProps}
          hideOptionLabels={guessing}
          onCamera={onCamera}
          padding={{ top: 100, bottom: 100, left: 120, right: 120 }}
          className="h-full w-full"
        />
        {guessing && !seasHidden && (
          <SeaButtons
            size="md"
            keys={drop.options}
            spots={spots}
            width={mapSize.width}
            top={40}
            bottom={mapSize.height - 70}
            picked={picked}
            onPick={pick}
          />
        )}
        {guessing && (
          <HideSeasToggle
            hidden={seasHidden}
            onToggle={() => {
              setSeasHidden((h) => !h);
              setPick(null);
            }}
            className="absolute bottom-6 left-6"
          />
        )}
        {/* Sound on/off: big, in the map's top-right corner. */}
        <SoundToggle className="absolute top-6 right-6 z-10" />
      </div>
    </div>
  );
}

/** Listens for the game's keys while the desktop screen is shown. */
function KeyboardControls({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);
  return null;
}
