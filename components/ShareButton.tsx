"use client";

// Every game's way of passing on a result: a large Copy result, the one coral action, and a
// smaller Share beside it. Share always shows: it opens the system share sheet, with the result
// picture attached where the sheet takes files, and copies the text where there's no share sheet.
// "Save the picture" downloads it, on devices with a mouse (phones share it instead).

import { useState } from "react";
import { track } from "@/lib/analytics";
import { copyText, openShareSheet } from "@/lib/share";
import type { ShareCard } from "@/lib/shareCard";

export default function ShareButton({
  game,
  number,
  preview,
  text,
  card,
  onTap,
}: {
  game: "slice" | "downstream";
  number: number;
  preview: boolean;
  text: string;
  card: ShareCard;
  /** The game's own button sound. */
  onTap?: () => void;
}) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  function showCopied(outcome: "copied" | "failed") {
    setCopied(outcome);
    window.setTimeout(() => setCopied("idle"), 2000);
  }
  async function copy() {
    onTap?.();
    const outcome = await copyText(text);
    track("result_shared", { game, puzzle: number, preview, outcome });
    showCopied(outcome);
  }
  async function share() {
    onTap?.();
    const outcome = await openShareSheet(text, card?.file);
    track("result_shared", { game, puzzle: number, preview, outcome });
    // The sheet failed for some other reason than the player closing it: it fell back to copying.
    if (outcome === "copied" || outcome === "failed") showCopied(outcome);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-coral text-[17px] font-bold whitespace-nowrap text-white shadow-[0_8px_18px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale] duration-200 hover:bg-coral-strong active:scale-[0.98]"
        >
          {copied === "idle" && (
            <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
              <path d="M13 7V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V11a2 2 0 0 0 2 2H7" />
            </svg>
          )}
          <span aria-live="polite">{copied === "copied" ? "Copied!" : copied === "failed" ? "Couldn’t copy" : "Copy result"}</span>
        </button>
        <button
          type="button"
          onClick={share}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-card px-4 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-[box-shadow,scale] duration-200 hover:ring-ink/40 active:scale-[0.98]"
        >
          <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7M4 11v4.5h12V11" />
          </svg>
          Share
        </button>
      </div>
      {card && (
        <a
          href={card.url}
          download={card.file.name}
          onClick={() => track("result_shared", { game, puzzle: number, preview, outcome: "saved" })}
          className="self-center text-xs font-semibold whitespace-nowrap text-coral-deep underline decoration-coral/40 underline-offset-[3px] hover:decoration-coral-deep [@media(pointer:coarse)]:hidden"
        >
          Save the picture
        </a>
      )}
    </div>
  );
}
