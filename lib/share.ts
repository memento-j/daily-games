// Share-text generation, shared by all games. Never includes answers: only the
// puzzle number, one mark per round, the score and the link.

export type ShareInput = {
  game: string; // "Downstream"
  number: number;
  preview?: boolean;
  marks: string[]; // one emoji per round
  points: number;
  maxPoints: number;
  url: string;
};

export function shareText({ game, number, preview, marks, points, maxPoints, url }: ShareInput): string {
  const title = preview ? `${game} preview #${number}` : `${game} #${number}`;
  return `${title} ${marks.join("")} ${points}/${maxPoints}\n${url}`;
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * Phones open the system share sheet (Messages, WhatsApp, ...); elsewhere the
 * text is copied. Cancelling the share sheet counts as shared (nothing to do).
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
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
