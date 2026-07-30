export type ArenaTheme = "dark" | "light" | "system";

const THEME_KEY = "arena-camp-theme";
export const THEME_CHANGE_EVENT = "arena-camp-theme-change";

function resolvedTheme(theme: ArenaTheme): "dark" | "light" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyArenaTheme(theme: ArenaTheme) {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle("light", resolvedTheme(theme) === "light");
}

export function getArenaTheme(): ArenaTheme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "system" ? saved : "dark";
}

export function getResolvedArenaTheme(): "dark" | "light" {
  return resolvedTheme(getArenaTheme());
}

export function setArenaTheme(theme: ArenaTheme) {
  localStorage.setItem(THEME_KEY, theme);
  applyArenaTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function initializeArenaTheme() {
  if (typeof window === "undefined") return;
  const theme = getArenaTheme();
  applyArenaTheme(theme);
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (getArenaTheme() === "system") {
      applyArenaTheme("system");
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: "system" }));
    }
  });
}
