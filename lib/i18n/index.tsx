"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import enMessages from "@/messages/en.json";
import taMessages from "@/messages/ta.json";

export type Locale = "en" | "ta";
export const locales: Locale[] = ["en", "ta"];
export const defaultLocale: Locale = "en";

export type Messages = typeof enMessages;

const messageCatalog: Record<Locale, any> = {
  en: enMessages,
  ta: taMessages,
};

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  translateStage: (stage: string) => string;
  translateStatus: (status: string) => string;
  translateCategory: (category: string) => string;
  translateErrorCode: (code: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * Resolve nested dot-paths like "board.summary" or "common.save"
 */
function resolvePath(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/**
 * Format string with {param} replacement
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);

  // Initialize from cookie / localStorage / html[lang] on client
  useEffect(() => {
    try {
      const match = document.cookie.match(/locale=(en|ta)/);
      const savedLocal = localStorage.getItem("locale");
      const activeLocale =
        (match?.[1] as Locale) ||
        (savedLocal === "en" || savedLocal === "ta" ? savedLocal : null) ||
        (document.documentElement.lang === "ta" ? "ta" : "en");

      if (activeLocale && (activeLocale === "en" || activeLocale === "ta")) {
        setLocaleState(activeLocale);
        document.documentElement.lang = activeLocale;
      }
    } catch {
      // Safe fallback if cookies/localStorage inaccessible
    }
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      document.cookie = `locale=${nextLocale}; Path=/; SameSite=Lax; Max-Age=31536000`;
      localStorage.setItem("locale", nextLocale);
      document.documentElement.lang = nextLocale;
      // Dispatch custom event for any listeners
      window.dispatchEvent(new CustomEvent("app:localechange", { detail: nextLocale }));
    } catch {
      // safe catch
    }
  }, []);

  const toggleLocale = useCallback(() => {
    const next = locale === "en" ? "ta" : "en";
    setLocale(next);
  }, [locale, setLocale]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const activeCat = messageCatalog[locale];
      const fallbackCat = messageCatalog.en;

      let val = resolvePath(activeCat, path);
      if (val === undefined) {
        val = resolvePath(fallbackCat, path);
      }
      if (val === undefined) {
        return path;
      }
      return interpolate(val, params);
    },
    [locale]
  );

  const translateStage = useCallback(
    (stage: string): string => {
      if (!stage) return "";
      const normalized = stage.replace(/\s+/g, "");
      const direct = t(`stages.${normalized}`);
      if (direct && direct !== `stages.${normalized}`) return direct;
      const byStageName = t(`stages.${stage}`);
      if (byStageName && byStageName !== `stages.${stage}`) return byStageName;
      return stage;
    },
    [t]
  );

  const translateStatus = useCallback(
    (status: string): string => {
      if (!status) return "";
      const key = status.toLowerCase();
      const direct = t(`status.${key}`);
      if (direct && direct !== `status.${key}`) return direct;
      return status;
    },
    [t]
  );

  const translateCategory = useCallback(
    (category: string): string => {
      if (!category) return "";
      const key = category.toLowerCase();
      const direct = t(`categories.${key}`);
      if (direct && direct !== `categories.${key}`) return direct;
      return category.replace(/_/g, " ");
    },
    [t]
  );

  const translateErrorCode = useCallback(
    (code: string): string => {
      if (!code) return t("errors.unknownError");
      const key = code.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const direct = t(`errors.${key}`);
      if (direct && direct !== `errors.${key}`) return direct;
      return code;
    },
    [t]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      translateStage,
      translateStatus,
      translateCategory,
      translateErrorCode,
    }),
    [locale, setLocale, toggleLocale, t, translateStage, translateStatus, translateCategory, translateErrorCode]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Return fallback context if used outside provider (e.g. isolated test or error boundary)
    const fallbackT = (path: string, params?: Record<string, string | number>) => {
      const val = resolvePath(enMessages, path) || path;
      return interpolate(val, params);
    };
    return {
      locale: "en",
      setLocale: () => {},
      toggleLocale: () => {},
      t: fallbackT,
      translateStage: (s) => s,
      translateStatus: (s) => s,
      translateCategory: (c) => c,
      translateErrorCode: (e) => e,
    };
  }
  return ctx;
}

export const useTranslation = useI18n;
