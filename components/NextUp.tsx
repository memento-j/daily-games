"use client";

// What to do after sharing, on both games' results screens (developer's call, 2026-11-03,
// replacing a sideways carousel): the other game as one prominent card, then everything else
// as quieter rows stacked under it. Each game only says what's on offer; how it looks and
// what's counted live here, so the two screens can't drift apart.

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

export type NextUpItem = {
  /** Where it goes, for analytics: a game's name, "practice", "yesterday". */
  to: string;
  href: string;
  title: string;
  description?: string;
  icon: ReactNode;
  /** A plain link: a fresh page load, which starts a game's board cleanly. */
  fullLoad?: boolean;
};

const Arrow = ({ className }: { className: string }) => (
  <svg viewBox="0 0 20 20" className={`shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${className}`} aria-hidden="true">
    <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ItemLink({ item, className, onClick, children }: { item: NextUpItem; className: string; onClick: () => void; children: ReactNode }) {
  const Tag = item.fullLoad ? "a" : Link;
  return (
    <Tag href={item.href} onClick={onClick} className={className}>
      {children}
    </Tag>
  );
}

export default function NextUp({
  from,
  next,
  tone,
  rows = [],
}: {
  /** The game whose results these are. */
  from: "slice" | "downstream";
  /** The other game, while it's still to play today. */
  next?: NextUpItem | null;
  /** The next-game card's colours: in the look of the game it leads to. */
  tone?: string;
  /** The quieter choices under it. */
  rows?: NextUpItem[];
}) {
  if (!next && rows.length === 0) return null;
  const clicked = (to: string, position: number) => () => track("next_game_clicked", { from, to, position });
  const firstRow = next ? 2 : 1;
  return (
    <div className="flex flex-col gap-2">
      {next && (
        <ItemLink item={next} onClick={clicked(next.to, 1)} className={`group flex items-center gap-3 rounded-2xl p-3 ring-1 transition-shadow ${tone ?? ""}`}>
          <span className="shrink-0">{next.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{next.title}</span>
            {next.description && <span className="block text-xs text-ink-soft">{next.description}</span>}
          </span>
          <Arrow className="size-4 text-ink-soft" />
        </ItemLink>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
          {rows.map((row, i) => (
            <li key={row.to}>
              <ItemLink item={row} onClick={clicked(row.to, firstRow + i)} className="group flex min-h-11 items-center gap-2.5 px-3 py-2 transition-colors hover:bg-land">
                <span className="grid size-6 shrink-0 place-items-center">{row.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] leading-tight font-semibold">{row.title}</span>
                  {row.description && <span className="block truncate text-xs leading-snug text-ink-faint">{row.description}</span>}
                </span>
                <Arrow className="size-3.5 text-ink-faint" />
              </ItemLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
