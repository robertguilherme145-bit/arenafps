export type ArenaTheme = "dark" | "light" | "system";

const THEME_KEY = "arena-camp-theme";
export function applyArenaTheme(_theme: ArenaTheme = "dark") {
  if (typeof window === "undefined") return;
  document.documentElement.classList.remove("light");
}

export function getArenaTheme(): ArenaTheme {
  return "dark";
}

export function getResolvedArenaTheme(): "dark" | "light" {
  return "dark";
}

export function setArenaTheme(_theme: ArenaTheme) {
  localStorage.setItem(THEME_KEY, "dark");
  applyArenaTheme("dark");
}

export function initializeArenaTheme() {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, "dark");
  applyArenaTheme("dark");
}
