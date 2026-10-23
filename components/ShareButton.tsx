"use client";

// Every game's Share button. The day's card (lib/shareCard.ts) is tucked into the button
// like a photo, so the player sees what they're about to send; once it's drawn it slides
// up out of the button. Phones share the picture and the text through the share sheet;
// elsewhere the text is copied, and "Save the picture" downloads the card.

import type { ReactNode } from "react";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { shareResult } from "@/lib/share";
import type { ShareCard } from "@/lib/shareCard";

export default function ShareButton({
  game,
  number,
  preview,
  text,
  card,
  onTap,
  caption,
}: {
  game: "slice" | "downstream";
  number: number;
  preview: boolean;
  text: string;
  card: ShareCard;
  /** The game's own button sound. */
  onTap?: () => void;
  /** A line under the button saying what gets sent. */
  caption?: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share() {
    onTap?.();
    const outcome = await shareResult(text, card?.file);
    track("result_shared", { game, puzzle: number, preview, outcome });
    if (outcome !== "shared") {
      setState(outcome);
      window.setTimeout(() => setState("idle"), 2200);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={share}
        className={`group relative flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(217_61_70/0.75)] transition-[background-color,scale] duration-200 hover:bg-coral-strong active:scale-[0.98] ${card ? "mt-4 pr-4 pl-20" : "px-6"}`}
      >
        {card && (
          // The card itself, like a photo half out of an envelope. Decorative: the
          // caption says what's sent.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.url}
            alt=""
            className="share-card-in absolute bottom-2.5 left-5 h-[70px] w-auto -rotate-[7deg] rounded-[5px] shadow-[0_6px_14px_-4px_rgb(18_26_43/0.45)] ring-2 ring-white transition-[rotate,translate] duration-300 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-[2deg]"
          />
        )}
        <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7M4 11v4.5h12V11" />
        </svg>
        <span aria-live="polite">{state === "copied" ? "Copied. Paste it anywhere" : state === "failed" ? "Couldn't copy" : "Share your result"}</span>
      </button>
      {(caption || card) && (
        <p className="text-center text-sm text-ink-soft">
          {caption}
          {card && (
            // Desktops copy text only, so the picture is a download away. (Phones share it.)
            <span className="[@media(pointer:coarse)]:hidden">
              {caption && " "}
              <a
                href={card.url}
                download={card.file.name}
                onClick={() => track("result_shared", { game, puzzle: number, preview, outcome: "saved" })}
                className="font-semibold whitespace-nowrap text-coral-deep underline decoration-coral/40 underline-offset-[3px] hover:decoration-coral-deep"
              >
                Save the picture
              </a>
            </span>
          )}
        </p>
      )}
    </div>
  );
}
