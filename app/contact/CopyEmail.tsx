"use client";

// The contact address, big, with a Copy button beside it: not everyone has a mail app
// set up for mailto: links (most desktop browsers don't).

import { useState } from "react";

export default function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <a
        href={`mailto:${email}`}
        className="font-display rounded-md text-[clamp(26px,5vw,36px)] font-semibold tracking-[-0.03em] text-ink underline decoration-coral decoration-[3px] underline-offset-[0.18em] hover:text-coral-deep"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        className="h-10 rounded-full bg-card px-4 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-shadow hover:ring-ink/35"
        aria-live="polite"
      >
        {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy"}
      </button>
    </div>
  );
}
