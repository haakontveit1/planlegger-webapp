"use client";
import { useEffect } from "react";

export interface Theme {
  name: string;
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export const PRESETS: Theme[] = [
  {
    name: "Dark Indigo",
    bg: "#0A0A10",
    surface: "#13131C",
    surfaceElevated: "#1C1C28",
    border: "#2E2E42",
    textPrimary: "#FFFFFF",
    textSecondary: "#C4C4E0",
    textMuted: "#8888B0",
  },
  {
    name: "Midnight Blue",
    bg: "#070D1A",
    surface: "#0F1828",
    surfaceElevated: "#182236",
    border: "#1E3050",
    textPrimary: "#E8F0FF",
    textSecondary: "#A8BEDD",
    textMuted: "#5A7499",
  },
  {
    name: "Charcoal",
    bg: "#111111",
    surface: "#1C1C1C",
    surfaceElevated: "#252525",
    border: "#333333",
    textPrimary: "#F5F5F5",
    textSecondary: "#BBBBBB",
    textMuted: "#777777",
  },
  {
    name: "Dark Forest",
    bg: "#080E0A",
    surface: "#111A13",
    surfaceElevated: "#1A2A1C",
    border: "#243326",
    textPrimary: "#E8F5EA",
    textSecondary: "#9EC9A2",
    textMuted: "#557A59",
  },
];

export const THEME_KEY = "planlegger-theme";

export function applyTheme(theme: Theme) {
  const r = document.documentElement;
  r.style.setProperty("--color-bg", theme.bg);
  r.style.setProperty("--color-surface", theme.surface);
  r.style.setProperty("--color-surface-elevated", theme.surfaceElevated);
  r.style.setProperty("--color-border", theme.border);
  r.style.setProperty("--color-text-primary", theme.textPrimary);
  r.style.setProperty("--color-text-secondary", theme.textSecondary);
  r.style.setProperty("--color-text-muted", theme.textMuted);
}

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) return JSON.parse(raw) as Theme;
  } catch {}
  return PRESETS[0];
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {}
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);
  return <>{children}</>;
}
