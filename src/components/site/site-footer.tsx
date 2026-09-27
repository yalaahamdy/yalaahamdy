"use client";

import { Github } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";
import { site } from "@/lib/config";
import { useI18n } from "@/i18n/provider";

const GITHUB_LINKS = [
  { href: site.githubProfile, key: "githubProfile" },
  { href: "https://github.com/yalaahamdy/yalaahamdy", key: "siteSource" },
  { href: "https://github.com/yalaahamdy?tab=repositories", key: "allRepositories" },
] as const;

export function SiteFooter() {
  const { t, tf } = useI18n();
  const year = new Date().getFullYear();

  const EXPLORE_LINKS = [
    { href: "/", label: t.footer.home },
    { href: "/apps/", label: t.footer.allApps },
    { href: "/updates/", label: t.footer.latestUpdates },
  ] as const;

  return (
    <footer className="mt-20 border-t bg-card/40">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="text-[15.5px] font-bold tracking-tight">{t.brand.name}</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t.brand.tagline}. {t.footer.taglineNote}
          </p>
        </div>

        <nav aria-label={t.footer.exploreAria}>
          <h2 className="text-sm font-semibold">{t.footer.explore}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rounded transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t.footer.githubAria}>
          <h2 className="text-sm font-semibold">{t.footer.github}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {GITHUB_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-foreground">
                  {t.footer[link.key]}
                  <Github className="size-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-[12.5px] text-muted-foreground sm:flex-row">
          <p>{tf(t.footer.rights, { year, name: t.brand.name })}</p>
          <p className="inline-flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-success" aria-hidden />
            {t.footer.liveData} · v{site.version}
          </p>
        </div>
      </div>
    </footer>
  );
}
