"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppEntry } from "@/lib/config";
import { BASE_PATH } from "@/lib/config";
import { discoverRepoIcon, resolveConfiguredIcon } from "@/lib/services/icons";
import { cn } from "@/lib/utils";

const GRADIENTS: readonly (readonly [string, string])[] = [
  ["#8b5cf6", "#6d28d9"],
  ["#d946ef", "#a21caf"],
  ["#14b8a6", "#0f766e"],
  ["#f59e0b", "#c2660b"],
  ["#f43f5e", "#be123c"],
  ["#22c55e", "#15803d"],
  ["#ec4899", "#be185d"],
  ["#a855f7", "#7e22ce"],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

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
  const mark = app.name.charAt(0).toUpperCase();
  const [from, to] = GRADIENTS[hashName(app.name) % GRADIENTS.length];

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

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 select-none items-center justify-center font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10", sizeClass, className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {mark}
    </span>
  );
}
