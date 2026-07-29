export type ArenaTheme = "dark" | "light" | "system";

const THEME_KEY = "arena-camp-theme";

function resolvedTheme(theme: ArenaTheme): "dark" | "light" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyArenaTheme(theme: ArenaTheme) {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle("light", resolvedTheme(theme) === "light");
}

export function setArenaTheme(theme: ArenaTheme) {
  localStorage.setItem(THEME_KEY, theme);
  applyArenaTheme(theme);
}

export function initializeArenaTheme() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(THEME_KEY) as ArenaTheme | null;
  const theme = saved === "light" || saved === "system" ? saved : "dark";
  applyArenaTheme(theme);
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if ((localStorage.getItem(THEME_KEY) ?? "dark") === "system") applyArenaTheme("system");
  });
}
