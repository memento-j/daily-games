// Light and dark mode, site-wide. The player's choice is "system" (follow the
// device, the default), "light" or "dark", stored as the site setting "theme". The
// page shows the resolved theme as <html data-theme="light|dark">, which switches the
// colour tokens in app/globals.css; the 3D board and the map read it through useTheme
// (lib/useTheme.ts: a client hook, kept apart so the server-side layout can import
// THEME_SCRIPT from here without pulling in React hooks).
//
// A tiny inline script in app/layout.tsx (THEME_SCRIPT) sets data-theme before the
// first paint, so a dark-mode visitor never sees a flash of the light page.

import { getSetting, setSetting, subscribe } from "./storage";

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const SETTING = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The theme to show for a choice, given whether the device prefers dark. */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): Theme {
  if (choice === "system") return systemDark ? "dark" : "light";
  return choice;
}

/** The toggle flips what's on screen. Landing on the device's own theme goes back to
 *  "system", so the page follows the device again (e.g. when it switches at sunset). */
export function toggledChoice(current: Theme, systemDark: boolean): ThemeChoice {
  const next: Theme = current === "dark" ? "light" : "dark";
  return next === (systemDark ? "dark" : "light") ? "system" : next;
}

export function systemDark(): boolean {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

export function getThemeChoice(): ThemeChoice {
  return getSetting<ThemeChoice>("site", SETTING, "system");
}

/** Apply the stored choice to the page (data-theme and the browser's own controls). */
export function applyTheme(): Theme {
  const theme = resolveTheme(getThemeChoice(), systemDark());
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  return theme;
}

/** Flip light and dark (see toggledChoice), remembered on this device. */
export function toggleTheme(): void {
  setSetting("site", SETTING, toggledChoice(applyTheme(), systemDark()));
  applyTheme();
}

/** Calls `onChange` when the device's theme or the stored choice changes. */
export function subscribeTheme(onChange: () => void): () => void {
  const mq = matchMedia(DARK_QUERY);
  const update = () => {
    applyTheme();
    onChange();
  };
  mq.addEventListener("change", update);
  const unsubscribe = subscribe(update); // the toggle, here or in another tab
  return () => {
    mq.removeEventListener("change", update);
    unsubscribe();
  };
}

/** Runs in <head> before the page paints: the same rule as applyTheme, in plain JS. */
export const THEME_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem("dg:v1:site:setting:${SETTING}")||'"system"');var d=c==="dark"||(c!=="light"&&matchMedia("${DARK_QUERY}").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
