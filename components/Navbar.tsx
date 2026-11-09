"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useI18n } from "@/lib/i18n";

export function Navbar({ currentUser, onLogout }: { currentUser?: any; onLogout?: () => void }) {
  const router = useRouter();
  const { locale, toggleLocale, t } = useI18n();
  const [user, setUser] = useState<any>(currentUser || null);

  useEffect(() => {
    if (currentUser !== undefined) {
      setUser(currentUser);
    } else {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) setUser(data.user);
        })
        .catch(() => {});
    }
  }, [currentUser]);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-textPrimary hover:text-accent transition-colors focus-ring rounded-md p-1 -ml-1"
            aria-label={t("nav.brandName")}
          >
            <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm shadow-subtle shrink-0">
              🧵
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base leading-tight tracking-tight">
                {t("nav.brandName")}
              </span>
              <span className="text-[10px] text-textMuted leading-tight hidden sm:inline">
                {t("nav.brandSubtitle")}
              </span>
            </div>
          </Link>

          {user?.role === "merchandiser" && (
            <nav
              className="hidden md:flex items-center gap-1 ml-4 text-xs sm:text-sm font-semibold text-textMuted"
              aria-label="Main Navigation"
            >
              <Link
                href="/"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors focus-ring"
              >
                {t("nav.orderBoard")}
              </Link>
              <Link
                href="/orders/new"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors focus-ring"
              >
                {t("nav.newOrder")}
              </Link>
              <Link
                href="/warnings"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors focus-ring"
              >
                {t("nav.delayWarnings")}
              </Link>
            </nav>
          )}

          {user?.role === "supervisor" && (
            <nav
              className="hidden md:flex items-center gap-1 ml-4 text-xs sm:text-sm font-semibold text-textMuted"
              aria-label="Main Navigation"
            >
              <Link
                href="/s"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors focus-ring"
              >
                {t("nav.supervisorPortal")}
              </Link>
            </nav>
          )}

          {user?.role === "buyer" && (
            <nav
              className="hidden md:flex items-center gap-1 ml-4 text-xs sm:text-sm font-semibold text-textMuted"
              aria-label="Main Navigation"
            >
              <Link
                href="/b"
                className="px-2.5 py-1.5 rounded-md hover:text-textPrimary hover:bg-surface-hover transition-colors focus-ring"
              >
                {t("nav.buyerPortal")}
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Light / Dark / System Theme Toggle */}
          <ThemeToggle />

          {/* Single Language Toggle EN | தமிழ் */}
          <button
            type="button"
            onClick={toggleLocale}
            className="text-xs font-bold px-2.5 py-1.5 h-9 rounded-lg border border-border bg-surface hover:bg-surface-hover text-textPrimary transition-colors flex items-center justify-center gap-1 focus-ring tap-target"
            title={t("nav.toggleLanguage")}
            aria-label={t("nav.toggleLanguage")}
          >
            <span className={locale === "en" ? "text-accent font-extrabold" : "text-textMuted"}>
              EN
            </span>
            <span className="text-textMuted text-[10px]">|</span>
            <span
              className={
                locale === "ta"
                  ? "text-accent font-extrabold font-tamil"
                  : "text-textMuted font-tamil"
              }
            >
              தமிழ்
            </span>
          </button>

          {/* User role & logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span className="hidden sm:inline-block text-[11px] bg-surface-raised border border-border text-accent font-semibold px-2 py-0.5 rounded capitalize">
                {t(`roles.${user.role}`)}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-textMuted hover:text-textPrimary font-semibold px-2.5 py-1.5 rounded hover:bg-surface-hover transition-colors focus-ring tap-target"
              >
                {t("nav.signOut")}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 h-9 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors flex items-center justify-center shadow-subtle focus-ring tap-target"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
