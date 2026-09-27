"use client";

import { UpdatesFeed } from "@/components/apps/updates-feed";
import { useI18n } from "@/i18n/provider";

export function UpdatesView() {
  const { t } = useI18n();
  return (
    <section className="container-page py-10 sm:py-14">
      <p className="section-eyebrow">{t.pages.updatesEyebrow}</p>
      <h1 className="section-title text-3xl sm:text-4xl">{t.pages.updatesTitle}</h1>
      <p className="section-desc">{t.pages.updatesDesc}</p>
      <div className="mt-8">
        <UpdatesFeed />
      </div>
    </section>
  );
}
