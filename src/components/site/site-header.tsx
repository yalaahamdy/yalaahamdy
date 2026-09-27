"use client";

import { Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/site/brand-mark";
import { LanguageToggle } from "@/components/site/language-toggle";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/config";
import { useI18n } from "@/i18n/provider";

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const NAV_ITEMS = [
    { href: "/", label: t.nav.home, isActive: (path: string) => path === "/" },
    { href: "/apps/", label: t.nav.apps, isActive: (path: string) => path.startsWith("/apps") },
    { href: "/updates/", label: t.nav.updates, isActive: (path: string) => path.startsWith("/updates") },
  ] as const;

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label={t.nav.homeAria}>
          <BrandMark className="h-8 w-8" />
          <span className="text-[15.5px] font-bold tracking-tight">{t.brand.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t.nav.primaryAria}>
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link key={item.href} href={item.href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={site.githubProfile} target="_blank" rel="noopener noreferrer" aria-label={t.nav.githubAria} title="GitHub">
              <Github aria-hidden />
            </a>
          </Button>
          <LanguageToggle />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t bg-background/95 backdrop-blur-md md:hidden" aria-label={t.nav.mobileAria}>
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link key={item.href} href={item.href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
            <a
              href={site.githubProfile}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link inline-flex items-center gap-2"
            >
              {t.nav.github}
              <Github className="size-3.5" aria-hidden />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
