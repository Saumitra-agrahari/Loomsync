"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar({ currentUser, onLogout }: { currentUser?: any; onLogout?: () => void }) {
  const router = useRouter();
  const [locale, setLocale] = useState<"en" | "ta">("en");

  useEffect(() => {
    const match = document.cookie.match(/locale=(en|ta)/);
    if (match) {
      setLocale(match[1] as "en" | "ta");
    }
  }, []);

  const toggleLanguage = () => {
    const next = locale === "en" ? "ta" : "en";
    setLocale(next);
    document.cookie = `locale=${next}; Path=/; SameSite=Lax; Max-Age=31536000`;
    router.refresh();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (onLogout) onLogout();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-textPrimary hover:text-accent transition-colors focus-visible:ring-2 focus-visible:ring-accent rounded-md p-1 -ml-1"
            aria-label="Tiruppur Order Tracker Home"
          >
            {/* Tasteful knitwear yarn/loom icon badge */}
            <span className="w-8 h-8 rounded-lg bg-accent text-accent-fg flex items-center justify-center font-bold text-sm shadow-subtle shrink-0">
              🧵
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base leading-tight tracking-tight">
                Tiruppur Order Tracker
              </span>
              <span className="text-[10px] text-textSecondary leading-tight hidden sm:inline">
                பின்னலாடை உற்பத்தி கண்காணிப்பு
              </span>
            </div>
          </Link>

          {currentUser?.role === "merchandiser" && (
            <nav className="hidden md:flex items-center gap-1 ml-4 text-xs sm:text-sm font-medium text-textSecondary" aria-label="Main Navigation">
              <Link
                href="/"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors"
              >
                {locale === "ta" ? "ஆர்டர்கள் பலகை" : "Order Board"}
              </Link>
              <Link
                href="/orders/new"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors"
              >
                {locale === "ta" ? "+ புதிய ஆர்டர்" : "+ New Order"}
              </Link>
              <Link
                href="/warnings"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors"
              >
                {locale === "ta" ? "தாமத எச்சரிக்கைகள்" : "Delay Warnings"}
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Light / Dark / System Theme Toggle */}
          <ThemeToggle />

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="text-xs font-semibold px-2.5 py-1.5 h-9 rounded-md border border-border bg-surface hover:bg-surface-hover text-textPrimary transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent"
            title="Switch language / மொழி மாற்றம்"
            aria-label="Switch language / மொழி மாற்றம்"
          >
            {locale === "en" ? "தமிழ்" : "English"}
          </button>

          {/* User role & logout */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-border">
              <span className="hidden sm:inline-block text-[11px] bg-accent-subtle text-accent font-semibold px-2 py-0.5 rounded capitalize">
                {currentUser.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-textSecondary hover:text-textPrimary font-medium px-2.5 py-1.5 rounded hover:bg-surface-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent"
              >
                {locale === "ta" ? "வெளியேறு" : "Sign out"}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 h-9 bg-accent hover:bg-accent-hover text-accent-fg rounded-md transition-colors flex items-center justify-center shadow-subtle focus-visible:ring-2 focus-visible:ring-accent"
            >
              {locale === "ta" ? "உள்நுழை" : "Sign in"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
