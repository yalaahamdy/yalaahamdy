/** Pure formatting helpers — no side effects, fully unit-testable.
 *  Date/relative-time formatting is locale-aware (Arabic uses Latin digits
 *  for a technical, consistent look; version tags stay Latin in both). */

import type { Locale } from "@/i18n/config";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  const digits = value >= 100 || exponent === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

export function formatCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "—";
  if (count < 1000) return String(Math.round(count));
  if (count < 1_000_000) {
    const thousands = count / 1000;
    return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const millions = count / 1_000_000;
  return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
}

const DAY_MS = 86_400_000;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60_000],
  ["hour", 3_600_000],
  ["day", DAY_MS],
];

/** "just now" / "منذ دقيقة" / "قبل يومين" — locale-aware, Latin digits. */
export function formatRelativeTime(
  iso: string | null | undefined,
  locale: Locale = "en",
  now = Date.now(),
): string {
  if (!iso) return "—";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "—";
  const diff = now - time;
  if (diff < 0) return formatDate(iso, locale, now);

  if (diff < 60_000) {
    if (locale === "ar") return "الآن";
    return "just now";
  }

  const formatter = relativeFormatter(locale);
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (diff < ms * (unit === "minute" ? 60 : unit === "hour" ? 24 : 31)) {
      const value = -Math.floor(diff / ms);
      return formatter.format(value, unit);
    }
  }
  return formatDate(iso, locale, now);
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function relativeFormatter(locale: Locale): Intl.RelativeTimeFormat {
  const tag = locale === "ar" ? "ar-u-nu-latn" : "en-US";
  let formatter = relativeFormatters.get(tag);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
    relativeFormatters.set(tag, formatter);
  }
  return formatter;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** Short absolute date: "Sep 27, 2026" / "٢٧ سبتمبر 2026" with Latin digits. */
export function formatDate(iso: string | null | undefined, locale: Locale = "en", now = Date.now()): string {
  if (!iso) return "—";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "—";
  const tag = locale === "ar" ? "ar-u-nu-latn" : "en-US";
  let formatter = dateFormatters.get(tag);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric" });
    dateFormatters.set(tag, formatter);
  }
  return formatter.format(new Date(time || now));
}

/** Strip markdown syntax for short plain-text excerpts (update feeds). */
export function markdownExcerpt(markdown: string | null | undefined, maxLength = 160): string {
  if (!markdown) return "";
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`|-]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
