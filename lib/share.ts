// Share-text generation, shared by all games. Never includes answers: only the
// puzzle number, the day's marks or score, an optional detail line and the link.
// Previews share exactly like real puzzles ("Slice #1", never "Slice preview #1";
// developer's call, 2026-10-19), so playtesters' shares look like the real thing.

export type ShareInput = {
  game: string; // "Downstream"
  number: number;
  marks?: string[]; // one emoji per round (Downstream: "🟩🟨🟥🟩🟧")
  points?: number; // the day's score; left out = the marks alone
  maxPoints?: number;
  detail?: string; // a second line (Slice: each round's score, "94 · 81 · 62 · 75")
  url: string;
};

export function shareText({ game, number, marks, points, maxPoints, detail, url }: ShareInput): string {
  const score = points !== undefined && maxPoints !== undefined ? `${points}/${maxPoints}` : "";
  const first = [`${game} #${number}`, marks?.join("") ?? "", score].filter(Boolean).join(" ");
  return [first, detail, url].filter(Boolean).join("\n");
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * Phones open the system share sheet (Messages, WhatsApp, ...); elsewhere the
 * text is copied. Cancelling the share sheet counts as shared (nothing to do).
 * With a picture (lib/shareCard.ts) phones send it along with the text, where the
 * share sheet takes files. Call it straight from the tap: phones only open the share
 * sheet in answer to one, so the picture must already be drawn.
 */
export async function shareResult(text: string, image?: File | null): Promise<ShareOutcome> {
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.share === "function") {
    const files = image && navigator.canShare?.({ files: [image] }) ? [image] : undefined;
    try {
      await navigator.share(files ? { files, text } : { text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
