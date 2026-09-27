"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

/** Language switch — always labels itself in the language you'd switch TO. */
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  const nextLabel = locale === "ar" ? "English" : "العربية";
  const ariaLabel = locale === "ar" ? t.language.toEnglish : t.language.toArabic;

  return (
    <Button variant="ghost" size="sm" className="gap-1.5 px-2.5 font-semibold" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={ariaLabel} title={ariaLabel}>
      <Languages className="size-4" aria-hidden />
      <span className={locale === "ar" ? "font-sans text-[13px]" : "text-[13px]"}>{nextLabel}</span>
    </Button>
  );
}
