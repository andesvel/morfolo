import type { ThemePreference } from "../stores/settings.ts";

export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Browser chrome color per theme; mirrors --color-bone. */
const THEME_COLOR: Readonly<Record<Theme, string>> = { light: "#E6E7E4", dark: "#121316" };

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference): void {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

/** Re-applies AUTO when the OS switches between light and dark. */
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
