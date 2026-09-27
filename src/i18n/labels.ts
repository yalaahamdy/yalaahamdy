import type { Dictionary } from "./en";
import type { Locale } from "./config";

/** Localize a platform id (Windows → ويندوز) with graceful fallback to the raw key. */
export function platformLabel(t: Dictionary, platform: string): string {
  return (t.platforms as unknown as Record<string, string>)[platform] ?? platform;
}

/** Localize a category key (Utilities → أدوات) with graceful fallback. */
export function categoryLabel(t: Dictionary, category: string): string {
  return (t.categories as unknown as Record<string, string>)[category] ?? category;
}

/** Localize an asset label ("Installer" → مثبِّت); format names (APK…) stay as-is. */
export function assetLabel(t: Dictionary, label: string): string {
  return (t.assetLabels as unknown as Record<string, string>)[label] ?? label;
}

/** Prefer the curated Arabic description when the site is in Arabic. */
export function appDescription(app: { description: string; descriptionAr?: string }, locale: Locale): string {
  if (locale === "ar") return app.descriptionAr || app.description;
  return app.description;
}
