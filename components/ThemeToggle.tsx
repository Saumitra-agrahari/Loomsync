"use client";

import React, { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = (localStorage.getItem("theme") as ThemeMode) || "system";
      setTheme(saved);
      applyTheme(saved);
    } catch {
      applyTheme("system");
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      try {
        const current = (localStorage.getItem("theme") as ThemeMode) || "system";
        if (current === "system") {
          applyTheme("system");
        }
      } catch {}
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const isDark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const cycleTheme = () => {
    const next: ThemeMode = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className="w-9 h-9 rounded-md border border-border bg-surface text-textSecondary flex items-center justify-center text-xs"
        aria-label="Theme mode"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const label =
    theme === "light"
      ? "Theme: Light (click for Dark)"
      : theme === "dark"
      ? "Theme: Dark (click for System)"
      : "Theme: System (click for Light)";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-md border border-border bg-surface hover:bg-surface-hover text-textPrimary hover:text-accent transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent"
    >
      {theme === "light" ? (
        // Sun icon
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : theme === "dark" ? (
        // Moon icon
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // System monitor icon
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}
