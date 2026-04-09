import { create } from "zustand";

export type ThemeName = "dark" | "light";

const STORAGE_KEY = "queriously.theme";

function initialTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
  if (saved === "dark" || saved === "light") return saved;
  // Respect the OS preference on first run.
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(`theme-${theme}`);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

type SettingsState = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const theme = initialTheme();
  applyTheme(theme);
  return {
    theme,
    setTheme(theme) {
      applyTheme(theme);
      set({ theme });
    },
    toggleTheme() {
      const next: ThemeName = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      set({ theme: next });
    },
  };
});
