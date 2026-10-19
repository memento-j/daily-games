"use client";

// The theme on screen (light or dark), live: follows the toggle and the device.

import { useSyncExternalStore } from "react";
import { getThemeChoice, resolveTheme, subscribeTheme, systemDark, type Theme } from "./theme";

/** "light" during the build; in the browser, the theme THEME_SCRIPT already applied. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribeTheme,
    () => resolveTheme(getThemeChoice(), systemDark()),
    () => "light",
  );
}
