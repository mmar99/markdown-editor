import { useState, useEffect, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: "light" | "dark") {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const storeOptions = { defaults: {}, autoSave: true } as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">(getSystemTheme());

  // Load saved preference on mount
  useEffect(() => {
    load("settings.json", storeOptions).then(async (store) => {
      const saved = await store.get<Theme>("theme");
      if (saved) {
        setThemeState(saved);
        const r = saved === "system" ? getSystemTheme() : saved;
        setResolved(r);
        applyTheme(r);
      } else {
        applyTheme(getSystemTheme());
      }
    });
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const sys = getSystemTheme();
        setResolved(sys);
        applyTheme(sys);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    const r = newTheme === "system" ? getSystemTheme() : newTheme;
    setResolved(r);
    applyTheme(r);

    try {
      const store = await load("settings.json", storeOptions);
      await store.set("theme", newTheme);
    } catch {
      // Silently fail
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolved === "light" ? "dark" : "light";
    setTheme(next);
  }, [resolved, setTheme]);

  return { theme, resolved, setTheme, toggleTheme };
}
