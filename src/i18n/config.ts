/** i18n core — locales, direction, and template helpers. */

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** The site is Arabic-first: it prerenders in Arabic and switches client-side. */
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_STORAGE_KEY = "yalaah-locale";

export type Direction = "rtl" | "ltr";

export function dirFor(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Read the visitor's preferred locale — persisted choice first, then browser
 * language. Safe to call in the browser only; returns DEFAULT_LOCALE on SSR.
 */
export function preferredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* storage unavailable — fall through to browser language */
  }
  const language = window.navigator.language?.toLowerCase() ?? "";
  return language.startsWith("ar") ? "ar" : "en";
}

/** Inline script that applies the locale to <html> before first paint. */
export const localeNoFlashScript = `(function(){try{var k=${JSON.stringify(LOCALE_STORAGE_KEY)};var s=localStorage.getItem(k);var l=s||(navigator.language&&navigator.language.toLowerCase().indexOf("ar")===0?"ar":"en");var d=document.documentElement;d.lang=l;d.dir=l==="ar"?"rtl":"ltr";}catch(e){}})();`;

/** Fill "{name}" placeholders in a dictionary template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
