"use client";

// Light / dark switch: a moon in light mode, a sun in dark mode. It flips what's on
// screen and remembers it on this device; flipping back to the device's own theme
// returns to following the device (lib/theme.ts).

import { toggleTheme } from "@/lib/theme";
import { useTheme } from "@/lib/useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`grid size-9 shrink-0 place-items-center rounded-full bg-card text-ink-soft shadow-card transition-colors hover:text-coral-deep ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
        {dark ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="10" cy="10" r="3.6" fill="currentColor" stroke="none" />
            <path d="M10 2.2v1.9M10 15.9v1.9M2.2 10h1.9M15.9 10h1.9M4.5 4.5l1.3 1.3M14.2 14.2l1.3 1.3M4.5 15.5l1.3-1.3M14.2 5.8l1.3-1.3" />
          </g>
        ) : (
          <path d="M15.8 12.4A6.4 6.4 0 0 1 7.6 4.2a6.4 6.4 0 1 0 8.2 8.2Z" fill="currentColor" />
        )}
      </svg>
    </button>
  );
}
