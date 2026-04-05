import { useCallback, useEffect, useState } from "react";
import {
  applyResolvedTheme,
  readStoredPreference,
  resolvePreferenceToTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "../lib/themePreference";

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

  useEffect(() => {
    const resolved = resolvePreferenceToTheme(preference);
    applyResolvedTheme(resolved);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }

    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyResolvedTheme(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  return { preference, setPreference };
}
