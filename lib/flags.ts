// Country flags as emoji. A flag emoji is two "regional indicator" letters (JP -> 🇯🇵),
// which most phones and Macs draw as the flag, but Windows draws as two letters in boxes.
// So the share text uses flags only where this device draws them (`canShowFlags`), and the
// plain code ("JP") otherwise. That's the sender's device: the friend who reads it may see
// either, which is why the fallback is the code, readable everywhere.

/** The flag emoji for an ISO 3166-1 two-letter code ("JP" -> "🇯🇵"); "" for anything else. */
export function flagEmoji(iso: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso)) return "";
  return [...iso.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

let shows: boolean | null = null;

/**
 * Whether this device draws flag emoji as flags: draws Switzerland's on a canvas and looks
 * for its red. Where flags aren't supported the letters come out grey or black. Browser only;
 * the answer is kept for the visit.
 */
export function canShowFlags(): boolean {
  if (shows !== null) return shows;
  shows = false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return shows;
    ctx.font = "28px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000";
    ctx.fillText(flagEmoji("CH"), 0, 0);
    const px = ctx.getImageData(0, 0, 32, 32).data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] > 128 && px[i] > 150 && px[i + 1] < 90 && px[i + 2] < 90) return (shows = true);
    }
  } catch {
    // No canvas (or it's blocked): use the codes.
  }
  return shows;
}
