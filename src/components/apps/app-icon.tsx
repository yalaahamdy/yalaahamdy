"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/site/brand-mark";
import type { AppEntry } from "@/lib/config";
import { BASE_PATH } from "@/lib/config";
import { discoverRepoIcon, resolveConfiguredIcon } from "@/lib/services/icons";
import { cn } from "@/lib/utils";

const SIZES = {
  md: "h-12 w-12 rounded-xl text-lg",
  lg: "h-14 w-14 rounded-xl text-xl",
  xl: "h-20 w-20 rounded-2xl text-3xl",
} as const;

/**
 * The app's real icon, shown professionally with a three-step chain:
 *   configured icon → repository-discovered icon → deterministic letter-mark.
 * Icons ship as optimized site assets (public/app-icons/) synced from the
 * repositories; discovery covers apps that have no configured icon yet.
 */
export function AppIcon({ app, size = "md", className }: { app: AppEntry; size?: keyof typeof SIZES; className?: string }) {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set());
  const [discovered, setDiscovered] = useState<string | null>(null);
  const sizeClass = SIZES[size];

  const configured = useMemo(() => {
    const url = resolveConfiguredIcon(app);
    if (url && url.startsWith("/")) return `${BASE_PATH}${url}`;
    return url;
  }, [app]);

  // No configured icon → try to discover one inside the repository (cached 24h).
  useEffect(() => {
    if (configured) return;
    let cancelled = false;
    discoverRepoIcon(app.repository).then((url) => {
      if (!cancelled) setDiscovered(url);
    });
    return () => {
      cancelled = true;
    };
  }, [app.repository, configured]);

  const candidates = useMemo(() => {
    const urls: string[] = [];
    if (configured) urls.push(configured);
    if (discovered && discovered !== configured) urls.push(discovered);
    return urls;
  }, [configured, discovered]);

  const src = candidates.find((url) => !failedUrls.has(url)) ?? null;

  if (src) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() =>
          setFailedUrls((prev) => {
            if (prev.has(src)) return prev;
            const next = new Set(prev);
            next.add(src);
            return next;
          })
        }
        className={cn(sizeClass, "shrink-0 bg-card object-contain p-0.5 ring-1 ring-border", className)}
      />
    );
  }

  return <BrandMark className={cn(sizeClass, "shrink-0 shadow-sm", className)} />;
}
