"use client";

// The Slice board: the country's outline as SVG, where the player draws one straight
// cut. Drag anywhere to draw; drag either end to adjust. No numbers show until the
// cut is confirmed. On the reveal: where the people live, the perfect cut at the
// player's angle, and each piece's share.

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { positiveCounts, share } from "./cut";
import { centroid, clipRings, flip, lineThrough, segmentInBox } from "./geometry";
import { formatShare } from "./scoring";
import type { Line, Point, Ring, Round } from "./types";

export type Draft = [Point, Point];

const MIN_CUT_PX = 24; // shorter drags are taps: no line

type Props = {
  round: Round;
  draft?: Draft | null; // the line being drawn (cutting)
  onDraft?: (draft: Draft | null) => void; // absent = the board is read-only
  reveal?: { line: Line; perfect: Line } | null;
  className?: string;
};

function ringsPath(rings: Ring[]): string {
  return rings.map((r) => `M${r.map((p) => `${p[0]},${p[1]}`).join("L")}Z`).join("");
}

/** The outline's bounds plus a margin, widened to the board's shape (`aspect` =
 *  width / height on screen) so lines run to the edges of the board, not of a
 *  letterboxed square. */
function frame(rings: Ring[], aspect: number): { min: Point; max: Point } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rings)
    for (const [x, y] of r) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const pad = Math.max(x1 - x0, y1 - y0) * 0.06;
  let w = x1 - x0 + 2 * pad;
  let h = y1 - y0 + 2 * pad;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { min: [cx - w / 2, cy - h / 2], max: [cx + w / 2, cy + h / 2] };
}

export default function SliceBoard({ round, draft = null, onDraft, reveal = null, className = "" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<0 | 1 | null>(null);
  // The board's size on screen: its shape sets the viewBox, and board units per
  // pixel keep handles and text the same size on screen.
  const [size, setSize] = useState<[number, number]>([1, 1]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const r = svg.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize([r.width, r.height]);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);
  const { min, max } = frame(round.outline, size[0] / size[1]);
  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const upp = width / size[0];

  function toBoard(e: PointerEvent): Point {
    const ctm = svgRef.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm);
    return [Math.min(max[0], Math.max(min[0], p.x)), Math.min(max[1], Math.max(min[1], p.y))];
  }

  function down(e: PointerEvent<SVGSVGElement>) {
    if (!onDraft) return;
    e.preventDefault();
    const p = toBoard(e);
    const handle = (e.target as Element).closest("[data-handle]")?.getAttribute("data-handle");
    if (handle && draft) {
      dragging.current = handle === "0" ? 0 : 1;
    } else {
      dragging.current = 1;
      onDraft([p, p]);
    }
    svgRef.current!.setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent<SVGSVGElement>) {
    const d = draft;
    if (!onDraft || dragging.current === null || !d) return;
    const p = toBoard(e);
    onDraft(dragging.current === 0 ? [p, d[1]] : [d[0], p]);
  }

  function up() {
    const d = draft;
    dragging.current = null;
    if (!onDraft || !d) return;
    if (Math.hypot(d[1][0] - d[0][0], d[1][1] - d[0][1]) / upp < MIN_CUT_PX) onDraft(null);
  }

  const draftLine = draft ? lineThrough(draft[0], draft[1]) : null;
  const draftSpan = draftLine ? segmentInBox(draftLine, min, max) : null;
  const longEnough = draft ? Math.hypot(draft[1][0] - draft[0][0], draft[1][1] - draft[0][1]) / upp >= MIN_CUT_PX : false;

  return (
    <svg
      ref={svgRef}
      viewBox={`${min[0]} ${min[1]} ${width} ${height}`}
      className={`touch-none select-none ${onDraft ? "cursor-crosshair" : ""} ${className}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="img"
      aria-label={`Outline of ${round.country}`}
    >
      <path d={ringsPath(round.outline)} fillRule="evenodd" fill="var(--color-land-high)" stroke="var(--color-ink)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />

      {reveal && <Reveal round={round} reveal={reveal} min={min} max={max} upp={upp} />}

      {draft && draftSpan && longEnough && (
        <g pointerEvents="none">
          <line x1={draftSpan[0][0]} y1={draftSpan[0][1]} x2={draftSpan[1][0]} y2={draftSpan[1][1]} stroke="var(--color-coral)" strokeWidth={1.5} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.7} />
          <line x1={draft[0][0]} y1={draft[0][1]} x2={draft[1][0]} y2={draft[1][1]} stroke="var(--color-coral)" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </g>
      )}
      {draft && longEnough && onDraft &&
        draft.map((p, i) => (
          <g key={i} data-handle={i} className="cursor-grab">
            {/* A big invisible target (44px across) around a small visible knob. */}
            <circle cx={p[0]} cy={p[1]} r={22 * upp} fill="transparent" />
            <circle cx={p[0]} cy={p[1]} r={8 * upp} fill="#fff" stroke="var(--color-coral)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
    </svg>
  );
}

function Reveal({ round, reveal, min, max, upp }: { round: Round; reveal: { line: Line; perfect: Line }; min: Point; max: Point; upp: number }) {
  const { line, perfect } = reveal;
  const s = share(round, line);
  const counted = positiveCounts(s, round.target) ? line : flip(line);
  const yours = segmentInBox(line, min, max);
  const best = segmentInBox(perfect, min, max);
  const pieces = [
    { rings: clipRings(round.outline, line), share: s },
    { rings: clipRings(round.outline, flip(line)), share: 1 - s },
  ];
  const points = round.mode === "population" ? (round.points ?? []) : [];
  const heaviest = points.reduce((m, p) => Math.max(m, p[2]), 1);
  const dotMax = Math.max(max[0] - min[0], max[1] - min[1]) * 0.022;

  return (
    <g pointerEvents="none">
      <path d={ringsPath(clipRings(round.outline, counted))} fillRule="evenodd" fill="var(--color-coral-soft)" />
      {points.length > 0 && (
        <g className="slice-heat" fill="var(--color-coral)" opacity={0.3}>
          {points.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={Math.max(upp * 0.8, dotMax * Math.sqrt(p[2] / heaviest))} />
          ))}
        </g>
      )}
      <path d={ringsPath(round.outline)} fillRule="evenodd" fill="none" stroke="var(--color-ink)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {best && (
        <line x1={best[0][0]} y1={best[0][1]} x2={best[1][0]} y2={best[1][1]} stroke="var(--color-ink)" strokeWidth={2.5} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
      )}
      {yours && (
        <line x1={yours[0][0]} y1={yours[0][1]} x2={yours[1][0]} y2={yours[1][1]} stroke="var(--color-coral)" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      )}
      {pieces.map((piece, i) => {
        const c = centroid(piece.rings);
        if (!c) return null;
        return (
          <text
            key={i}
            x={c[0]}
            y={c[1]}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={16 * upp}
            fontWeight={700}
            fill="var(--color-ink)"
            stroke="#fff"
            strokeWidth={4 * upp}
            paintOrder="stroke"
            className="font-sans"
          >
            {formatShare(piece.share)}
          </text>
        );
      })}
    </g>
  );
}
