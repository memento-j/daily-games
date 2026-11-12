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
  streak?: number; // the shared streak (lib/streak.ts): " · 🔥 5-day streak" on the first line; under 2 = none
  url: string;
};

export function shareText({ game, number, marks, points, maxPoints, detail, streak = 0, url }: ShareInput): string {
  const score = points !== undefined && maxPoints !== undefined ? `${points}/${maxPoints}` : "";
  const first = [`${game} #${number}`, marks?.join("") ?? "", score].filter(Boolean).join(" ") + (streak >= 2 ? ` · 🔥 ${streak}-day streak` : "");
  return [first, detail, url].filter(Boolean).join("\n");
}

export async function copyText(text: string): Promise<"copied" | "failed"> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/**
 * Opens the system share sheet (Messages, WhatsApp, ...), with the result picture
 * (lib/shareCard.ts) where the sheet takes files. Call it straight from the tap: browsers only
 * open it in answer to one, so the picture must already be drawn. If the sheet fails for any
 * reason but the player closing it, the text is copied instead.
 */
export async function openShareSheet(text: string, image?: File | null): Promise<"shared" | "cancelled" | "copied" | "failed"> {
  try {
    const files = image && navigator.canShare?.({ files: [image] }) ? [image] : undefined;
    await navigator.share(files ? { files, text } : { text });
    return "shared";
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
    return copyText(text);
  }
}
