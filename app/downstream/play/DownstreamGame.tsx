"use client";

// The Downstream game screen (/downstream/play), split screen: a fixed control
// column on the left and the map in the rest. Nothing floats; everything always
// sits in the same place. A points-at-stake meter shows what an early call is
// worth, and drains as the water flows. The column's foot is reserved for an ad
// (after launch), below the controls and never interrupting play.
//
// Game rules and loading live in games/downstream (useDownstreamGame); this file
// only decides how it looks.

import AdSlot from "@/components/AdSlot";
import RouteMap from "@/games/downstream/RouteMap";
import { POINTS_BY_STAGE } from "@/games/downstream/scoring";
import {
  DaySummary,
  DropTokens,
  FlowButton,
  GameNotice,
  GameTopBar,
  NextButton,
  ResultText,
  SeaOptions,
} from "@/games/downstream/ui";
import { useDownstreamGame } from "@/games/downstream/useDownstreamGame";

export default function DownstreamGame() {
  const g = useDownstreamGame();
  if (g.load.status !== "ready") return <GameNotice load={g.load} preview={g.preview} />;

  const { number, puzzle } = g.load;
  const finished = g.phase === "finished";
  const index = Math.min(g.game.drop, puzzle.drops.length - 1);
  const drop = puzzle.drops[index];
  const result = finished ? undefined : g.game.results[g.game.drop];
  const revealKm = finished || result ? Infinity : g.game.stage === 0 ? 0 : drop.stages[g.game.stage - 1];
  const points = POINTS_BY_STAGE[g.game.stage];

  return (
    <div className="font-sans flex flex-col-reverse bg-land text-ink lg:grid lg:h-svh lg:grid-cols-[440px_1fr] lg:overflow-hidden">
      <section className="relative z-10 -mt-7 flex flex-col rounded-t-[28px] bg-card px-5 pt-6 pb-8 shadow-card lg:mt-0 lg:overflow-y-auto lg:rounded-none lg:p-8 lg:shadow-[8px_0_30px_-18px_rgb(18_26_43/0.3)]">
        <div className="hidden lg:block">
          <GameTopBar number={number} preview={g.preview} />
        </div>
        {finished ? (
          <div className="lg:mt-8">
            <DaySummary puzzle={puzzle} game={g.game} preview={g.preview} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between lg:mt-8">
              <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">
                Drop {g.game.drop + 1} <span className="text-ink-faint">of {puzzle.drops.length}</span>
              </p>
              <DropTokens puzzle={puzzle} game={g.game} />
            </div>

            {result ? (
              <div className="mt-6 flex flex-col gap-4">
                <ResultText drop={drop} result={result} />
                <SeaOptions drop={drop} result={result} onGuess={() => {}} columns={1} />
                <NextButton last={g.game.drop + 1 >= puzzle.drops.length} onNext={() => g.act({ type: "next" })} />
              </div>
            ) : (
              <>
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
                <div className="mt-3">
                  <SeaOptions drop={drop} onGuess={(option) => g.act({ type: "guess", option })} columns={1} />
                </div>
                <div className="mt-3">
                  <FlowButton stage={g.game.stage} stops={drop.stages.length} onFlow={() => g.act({ type: "reveal" })} />
                </div>
              </>
            )}
          </>
        )}
        <AdSlot className="mt-8 lg:mt-auto lg:pt-8" />
      </section>

      <div className="relative h-[46svh] min-h-[300px] lg:h-full">
        <RouteMap
          pin={drop.pin}
          route={drop.route}
          revealKm={revealKm}
          labels={drop.seaLabels}
          answer={finished || result ? drop.answer : undefined}
          className="h-full w-full"
        />
        <div className="absolute top-4 right-4 left-4 lg:hidden">
          <GameTopBar number={number} preview={g.preview} />
        </div>
      </div>
    </div>
  );
}
