"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "task-tracker-theme";
type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark = theme === "dark";
  root.classList.toggle("dark", dark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#020617" : "#f1f5f9");
}

function preferredTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next = preferredTheme();
      applyTheme(next);
      setTheme(next);
    };
    const syncSystem = () => {
      if (!localStorage.getItem(STORAGE_KEY)) sync();
    };

    sync();
    window.addEventListener("storage", sync);
    media.addEventListener("change", syncSystem);
    return () => {
      window.removeEventListener("storage", sync);
      media.removeEventListener("change", syncSystem);
    };
  }, []);

  function toggle() {
    const current = theme ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    const next: Theme = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      title={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500"
    >
      <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${dark ? "text-slate-500" : "text-amber-500"}`} aria-hidden>
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.35 4.35l1.4 1.4M14.25 14.25l1.4 1.4M15.65 4.35l-1.4 1.4M5.75 14.25l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span
        aria-hidden
        className={`relative h-5 w-9 rounded-full transition ${dark ? "bg-indigo-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform ${dark ? "translate-x-[18px]" : "translate-x-0.5"}`}
          style={{ backgroundColor: "white" }}
        />
      </span>
      <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${dark ? "text-indigo-300" : "text-slate-400"}`} aria-hidden>
        <path d="M16.3 12.7A7 7 0 017.3 3.7a7 7 0 109 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="min-w-14">{dark ? "โหมดมืด" : "โหมดสว่าง"}</span>
    </button>
  );
}
