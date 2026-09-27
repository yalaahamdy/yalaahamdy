"use client";

import { ArrowRight, Download, Github, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppCardGrid } from "@/components/apps/app-card-grid";
import { HomeStats } from "@/components/apps/home-stats";
import { ReleasesProvider } from "@/components/apps/releases-context";
import { UpdatesPreview } from "@/components/apps/updates-preview";
import { Button } from "@/components/ui/button";
import { allApps, getFeaturedApps } from "@/lib/apps";
import { useI18n } from "@/i18n/provider";

const FEATURE_ICONS = { direct: Download, current: RefreshCw, official: ShieldCheck } as const;

export function HomeView() {
  const { t, tf } = useI18n();
  const featured = getFeaturedApps();
  const preview = allApps.slice(0, 6);
  const hasMorePreview = allApps.length > preview.length;

  const features = [
    { icon: FEATURE_ICONS.direct, title: t.features.direct.title, description: t.features.direct.description },
    { icon: FEATURE_ICONS.current, title: t.features.current.title, description: t.features.current.description },
    { icon: FEATURE_ICONS.official, title: t.features.official.title, description: t.features.official.description },
  ];

  return (
    <ReleasesProvider apps={allApps}>
      <section className="hero-glow relative overflow-hidden">
        <div className="hero-grid" aria-hidden="true" />
        <div className="container-page relative py-20 text-center sm:py-28">
          <span className="chip border-primary/20 bg-primary/5 text-primary dark:bg-primary/10">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {t.hero.badge}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            {t.hero.titleStart && `${t.hero.titleStart} `}
            <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-primary bg-clip-text text-transparent">{t.hero.titleAccent}</span>
            {t.hero.titleEnd && ` ${t.hero.titleEnd}`}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{t.brand.description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/apps/">
                {t.hero.exploreApps}
                <ArrowRight className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <a href="https://github.com/yalaahamdy" target="_blank" rel="noopener noreferrer">
                {t.hero.viewOnGithub}
                <Github aria-hidden />
              </a>
            </Button>
          </div>
          <HomeStats />
        </div>
      </section>

      <section aria-label={t.features.headingAria} className="container-page mt-2">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card-surface p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-[15px] font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="featured-heading">
          <p className="section-eyebrow">{t.sections.featuredEyebrow}</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="featured-heading" className="section-title">
              {t.sections.featuredTitle}
            </h2>
          </div>
          <div className="mt-5 flex flex-col gap-4">
            <AppCardGrid apps={featured} columns={2} featuredLayout />
          </div>
        </section>
      )}

      <section className="container-page mt-16" aria-labelledby="all-apps-heading">
        <p className="section-eyebrow">{t.sections.libraryEyebrow}</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="all-apps-heading" className="section-title">
            {t.sections.libraryTitle}
          </h2>
          {hasMorePreview && (
            <Link href="/apps/" className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-primary hover:underline">
              {tf(t.sections.viewAllApps, { count: allApps.length })}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          )}
        </div>
        <div className="mt-5">
          <AppCardGrid apps={preview} columns={3} />
        </div>
      </section>

      <section className="container-page mt-16" aria-labelledby="updates-heading">
        <p className="section-eyebrow">{t.sections.changelogEyebrow}</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="updates-heading" className="section-title">
            {t.sections.changelogTitle}
          </h2>
          <Link href="/updates/" className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-primary hover:underline">
            {t.sections.viewAllUpdates}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
        <div className="mt-5">
          <UpdatesPreview />
        </div>
      </section>
    </ReleasesProvider>
  );
}
