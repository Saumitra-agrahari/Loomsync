"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, toggleLocale, translateErrorCode } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || t("errors.invalidCredentials"));
        setLoading(false);
        return;
      }

      const role = data.user.role;
      if (role === "supervisor") {
        router.push("/s");
      } else if (role === "buyer") {
        router.push("/b");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError(t("errors.networkError"));
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo@12345");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 text-textPrimary relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={toggleLocale}
          className="text-xs font-bold px-2.5 py-1.5 h-9 rounded-lg border border-border bg-surface hover:bg-surface-hover text-textPrimary transition-colors flex items-center justify-center gap-1 focus-ring tap-target"
          title={t("nav.toggleLanguage")}
          aria-label={t("nav.toggleLanguage")}
        >
          <span className={locale === "en" ? "text-accent font-extrabold" : "text-textMuted"}>EN</span>
          <span className="text-textMuted text-[10px]">|</span>
          <span className={locale === "ta" ? "text-accent font-extrabold font-tamil" : "text-textMuted font-tamil"}>
            தமிழ்
          </span>
        </button>
      </div>

      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-xl mx-auto shadow-subtle">
            🧵
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-textPrimary">
            {t("login.title")}
          </h1>
          <p className="text-xs sm:text-sm text-textMuted">
            {t("login.subtitle")}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-status-red-bg border border-status-red/30 text-status-red rounded-lg text-xs font-semibold"
          >
            {translateErrorCode(error)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
            >
              {t("login.emailLabel")}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("login.emailPlaceholder")}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
            >
              {t("login.passwordLabel")}
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t("login.passwordPlaceholder")}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 focus-ring tap-target text-sm shadow-xs"
          >
            {loading ? t("login.signingIn") : t("login.signInButton")}
          </button>
        </form>

        {/* Quick Demo Logins for Judges / Evaluators */}
        <div className="pt-4 border-t border-border space-y-3">
          <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider text-center">
            {t("login.demoAccountsTitle")}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill("merch@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">{t("login.roleMerch")}</div>
              <div className="text-textMuted text-[10px] truncate">merch@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("sup1@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">{t("login.roleSup1")}</div>
              <div className="text-textMuted text-[10px] truncate">sup1@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("buyerb@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">{t("login.roleBuyerB")}</div>
              <div className="text-textMuted text-[10px] truncate">buyerb@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("buyerc@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">{t("login.roleBuyerC")}</div>
              <div className="text-textMuted text-[10px] truncate">buyerc@demo.example</div>
            </button>
          </div>
          <p className="text-[11px] text-textMuted text-center">
            {t("login.demoPasswordNote", { pwd: "Demo@12345" })}
          </p>
        </div>
      </div>
    </div>
  );
}
