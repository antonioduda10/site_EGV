"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "egv-theme";
type Theme = "light" | "dark";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme: Theme = savedTheme ?? (preferredDark ? "dark" : "light");

    root.classList.toggle("dark", resolvedTheme === "dark");
    setTheme(resolvedTheme);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    root.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      className={compact
        ? "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        : "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      }
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
      {!compact && <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>}
    </button>
  );
}
