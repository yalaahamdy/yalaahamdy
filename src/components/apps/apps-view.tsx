"use client";

import { AppsExplorer } from "@/components/apps/apps-explorer";
import { useI18n } from "@/i18n/provider";

export function AppsView() {
  const { t } = useI18n();
  return (
    <section className="container-page py-10 sm:py-14">
      <p className="section-eyebrow">{t.pages.appsEyebrow}</p>
      <h1 className="section-title text-3xl sm:text-4xl">{t.pages.appsTitle}</h1>
      <p className="section-desc">{t.pages.appsDesc}</p>
      <div className="mt-8">
        <AppsExplorer />
      </div>
    </section>
  );
}
