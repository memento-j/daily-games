// A country drawn the way Slice shows it after a cut: the paper slab on the cutting mat,
// split in two along a straight line, the crowded piece tinted, its people standing on it
// in columns (coral on the crowded side, grey on the other). Drawn at build time as SVG
// from the puzzle data, so it's sharp at any size, needs no JavaScript and follows the
// light/dark theme (every colour is a token from globals.css).

import { simplifyRing, splitBoard, type HalfCut } from "@/games/slice/countryFacts";
import type { Point, Ring, Round } from "@/games/slice/types";

const TILT = 0.6; // squashes north-south, so the board reads as lying on a table
const THICK = 16; // the slab's depth
const GAP = 18; // how far the two pieces part
// The tallest column and a column's width. Small boards (the index cards) get fewer,
// wider, shorter columns: thin ones read as hatching at that size.
const TALL = { full: 240, compact: 150 };
const WIDTH = { full: 7.5, compact: 13 };

// Whole board units: a unit is well under a pixel on screen, and the map is written into
// the page twice (the HTML and React's copy of it), so every character counts.
const r = (n: number) => Math.round(n);

export default function CountryBoard({
  round,
  cut,
  compact = false,
  label,
  className = "",
}: {
  round: Round;
  cut: HalfCut;
  /** Smaller and lighter (the index page's cards): coarser columns and outline. */
  compact?: boolean;
  /** Read out in place of the drawing (role="img"); omit when a caption says it all. */
  label?: string;
  className?: string;
}) {
  const n = cut.line.normal;
  const board = splitBoard(round, cut.line, compact ? 44 : 24);
  const place = (x: number, y: number, side: number): Point => [x + n[0] * GAP * side, (y + n[1] * GAP * side) * TILT];
  const tol = compact ? 6 : 2.2;
  const tall = compact ? TALL.compact : TALL.full;
  const width = compact ? WIDTH.compact : WIDTH.full;

  const ringsPath = (rings: Ring[], side: number, dy = 0) =>
    rings
      .map(
        (ring) =>
          "M" +
          simplifyRing(ring, tol)
            .map(([x, y]) => {
              const [px, py] = place(x, y, side);
              return `${r(px)} ${r(py + dy)}`;
            })
            .join("L") +
          "Z",
      )
      .join("");

  // Columns, back to front; neighbours of one colour share a path (paint order is kept).
  const max = Math.max(...board.columns.map((c) => c.people));
  const sorted = board.columns
    .map((c) => {
      const [px, py] = place(c.x, c.y, c.crowded ? 1 : -1);
      return { px, py, h: Math.max(2.5, Math.sqrt(c.people / max) * tall), crowded: c.crowded };
    })
    .sort((a, b) => a.py - b.py);
  const runs: { crowded: boolean; d: string }[] = [];
  for (const c of sorted) {
    const d = `M${r(c.px - width / 2)} ${r(c.py)}v${r(-c.h)}h${width}v${r(c.h)}z`;
    const last = runs[runs.length - 1];
    if (last && last.crowded === c.crowded) last.d += d;
    else runs.push({ crowded: c.crowded, d });
  }

  // The cut: an ink dashed line down the middle of the gap, from just before the country
  // to just after it (measured along the line).
  const t: Point = [-n[1], n[0]];
  const along = round.outline.flat().map(([x, y]) => x * t[0] + y * t[1]);
  const seg = [Math.min(...along) - 28, Math.max(...along) + 28].map((s): Point => [n[0] * cut.line.offset + t[0] * s, n[1] * cut.line.offset + t[1] * s]);

  // Fit the view to what's drawn: the slab, its depth and the tallest columns.
  const placed = round.outline.flat().flatMap(([x, y]) => [place(x, y, 1), place(x, y, -1)]);
  const top = Math.min(...placed.map((p) => p[1]), ...sorted.map((c) => c.py - c.h));
  const left = Math.min(...placed.map((p) => p[0]));
  const right = Math.max(...placed.map((p) => p[0]));
  const bottom = Math.max(...placed.map((p) => p[1])) + THICK;
  const pad = compact ? 18 : 28;
  const viewBox = [left - pad, top - pad, right - left + pad * 2, bottom - top + pad * 2].map(Math.round).join(" ");

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* The slab's sides (its outline stacked downwards), then its top faces. */}
      {[
        { side: -1, top: "var(--color-slab)" },
        { side: 1, top: "var(--color-slab-counted)" },
      ].map(({ side, top }) => (
        <g key={side}>
          <path d={ringsPath(side === 1 ? board.crowded : board.other, side, THICK + 6)} fill="var(--color-ink)" opacity="0.1" />
          {[THICK, THICK * 0.66, THICK * 0.33].map((dy) => (
            <path key={dy} d={ringsPath(side === 1 ? board.crowded : board.other, side, dy)} fill="var(--color-slab-side)" />
          ))}
          <path
            d={ringsPath(side === 1 ? board.crowded : board.other, side)}
            fill={top}
            stroke="var(--color-slab-side)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>
      ))}
      {
        <line
          x1={r(seg[0][0])}
          y1={r(seg[0][1] * TILT)}
          x2={r(seg[1][0])}
          y2={r(seg[1][1] * TILT)}
          stroke="var(--color-ink)"
          strokeWidth={compact ? 5 : 3.5}
          strokeDasharray={compact ? "14 10" : "11 8"}
          strokeLinecap="round"
        />
      }
      {runs.map((run, i) => (
        <path key={i} d={run.d} fill={run.crowded ? "var(--color-coral)" : "var(--color-people-other)"} />
      ))}
    </svg>
  );
}
