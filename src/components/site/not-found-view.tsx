"use client";

import { ArrowRight, SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

export function NotFoundView() {
  const { t } = useI18n();
  return (
    <section className="container-page flex min-h-[60svh] flex-col items-center justify-center py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <SearchX className="size-7" aria-hidden />
      </span>
      <p className="mt-6 bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text font-mono text-7xl font-extrabold tracking-tight text-transparent">
        404
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{t.notFound.heading}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t.notFound.description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">
            {t.notFound.backHome}
            <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/apps/">{t.notFound.browseApps}</Link>
        </Button>
      </div>
    </section>
  );
}
