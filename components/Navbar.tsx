"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-accent text-base sm:text-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span>Tiruppur Order Tracker</span>
          </Link>

          {currentUser?.role === "merchandiser" && (
            <nav className="hidden md:flex items-center gap-3 ml-4 text-sm text-textSecondary">
              <Link href="/" className="hover:text-textPrimary py-1 font-medium">
                Board
              </Link>
              <Link href="/orders/new" className="hover:text-textPrimary py-1 font-medium">
                New Order
              </Link>
              <Link href="/warnings" className="hover:text-textPrimary py-1 font-medium">
                Delay Warnings
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="text-xs font-semibold px-2.5 py-1 rounded border border-border bg-surface hover:bg-surfaceHover transition-colors tap-target flex items-center justify-center"
            title="Switch language / மொழி மாற்றம்"
          >
            {locale === "en" ? "தமிழ்" : "English"}
          </button>

          {/* User role & logout */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs bg-accent-subtle text-accent font-semibold px-2 py-0.5 rounded capitalize">
                {currentUser.role}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-textSecondary hover:text-textPrimary font-medium px-2 py-1 rounded hover:bg-surface transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
