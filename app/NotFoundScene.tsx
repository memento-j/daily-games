"use client";

// The 404 page's picture: "404" peeking over the horizon, with the Peeker as the 0.
// The two 4s rise over the horizon, then the Peeker pops up between them, glances at
// each 4, looks at you and blinks (CSS `.nf-*` in globals.css). With a mouse, its eyes
// follow the pointer; after a moment of stillness it goes back to looking around.
// Tap it and it ducks behind the horizon and pops back up.
//
// A Client Component because of the pointer and the tap; the page around it is a
// Server Component.

import { useEffect, useRef, useState } from "react";
import { PeekerParts } from "@/components/Peeker";

const HORIZON = 232; // y of the horizon line in the drawing
const EYE_REACH = 2.2; // how far the pupils can move, in the Peeker's own units
// The Peeker's 48-unit drawing, scaled up and set on the horizon (its flat bottom is
// at y = 34 in its own grid).
const SCALE = 5.6;
const PEEKER = `translate(${320 - 24 * SCALE} ${HORIZON - 34 * SCALE}) scale(${SCALE})`;

export default function NotFoundScene() {
  const svg = useRef<SVGSVGElement>(null);
  const [following, setFollowing] = useState(false);
  const [ducks, setDucks] = useState(0); // bumped on each tap; re-keys the duck animation

  useEffect(() => {
    // Only for a real mouse: on touch screens a "pointer" is a tap, not a gaze.
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let idle: ReturnType<typeof setTimeout> | undefined;
    function onMove(e: PointerEvent) {
      const el = svg.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      // Aim from the Peeker's eyes (about 40% across its body, near its top).
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height * 0.62);
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, len / 160) * EYE_REACH;
      // The pupils are drawn looking up and to the right (+1.7, -1.3): aim from the
      // middle of the eye instead.
      el.style.setProperty("--nf-x", `${(dx / len) * reach - 1.7}px`);
      el.style.setProperty("--nf-y", `${(dy / len) * reach + 1.3}px`);
      setFollowing(true);
      clearTimeout(idle);
      idle = setTimeout(() => setFollowing(false), 2600);
    }
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      clearTimeout(idle);
    };
  }, []);

  return (
    <svg
      ref={svg}
      viewBox="0 0 640 260"
      className={`w-full overflow-visible select-none ${following ? "nf-following" : ""}`}
      role="img"
      aria-label="404"
    >
      <defs>
        {/* Everything rises from behind the horizon, so nothing shows below it. */}
        <clipPath id="nf-sky">
          <rect x="-40" y="-80" width="720" height={HORIZON + 80} />
        </clipPath>
      </defs>
      <g clipPath="url(#nf-sky)">
        <g className="nf-rise" style={{ fill: "var(--color-ink)" }}>
          <text x="128" y="262" textAnchor="middle" className="font-display" fontSize="250" fontWeight="700" letterSpacing="-8">
            4
          </text>
        </g>
        <g className="nf-rise nf-rise-late" style={{ fill: "var(--color-ink)" }}>
          <text x="512" y="262" textAnchor="middle" className="font-display" fontSize="250" fontWeight="700" letterSpacing="-8">
            4
          </text>
        </g>
        <g className="nf-peeker">
          <g key={ducks} className={ducks ? "nf-duck" : undefined}>
            <g
              transform={PEEKER}
              onClick={() => setDucks((n) => n + 1)}
              style={{ cursor: "pointer" }}
            >
              <PeekerParts eyesClass="nf-blink" pupilClass="nf-look" />
            </g>
          </g>
        </g>
      </g>
      <rect x="8" y={HORIZON} width="624" height="11" rx="5.5" fill="var(--color-ink)" />
    </svg>
  );
}
