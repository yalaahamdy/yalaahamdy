"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries } from "./dictionaries";
import { LOCALE_STORAGE_KEY, DEFAULT_LOCALE, dirFor, fill, isLocale, preferredLocale, type Locale } from "./config";
import type { Dictionary } from "./en";

export interface I18n {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  /** Translate a template with {placeholder} values. */
  tf: (template: string, values: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * Client-side locale provider. The prerendered HTML is Arabic (DEFAULT_LOCALE);
 * after hydration the visitor's persisted (or browser-detected) locale applies.
 * A no-flash script in <head> already set <html lang/dir> before paint.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const initial = preferredLocale();
    setLocaleState(initial);
    document.documentElement.lang = initial;
    document.documentElement.dir = dirFor(initial);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode — keep the choice for this session only */
    }
    document.documentElement.lang = next;
    document.documentElement.dir = dirFor(next);
  }, []);

  const value = useMemo<I18n>(() => {
    const t = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
    return {
      locale,
      dir: dirFor(locale),
      t,
      tf: (template, values) => fill(template, values),
      setLocale,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}

/** Validate an unknown value coming from storage/URL as a locale. */
export { isLocale };
export type { Locale, Dictionary };
