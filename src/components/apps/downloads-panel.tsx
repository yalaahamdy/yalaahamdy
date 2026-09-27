"use client";

import { ArrowDownToLine, FileArchive, PackageOpen, ShieldCheck } from "lucide-react";
import { platformIcon } from "@/components/apps/platform-icon";
import { Button } from "@/components/ui/button";
import { formatBytes, formatCount } from "@/lib/utils/format";
import { groupAssets, type NormalizedRelease } from "@/lib/utils/assets";
import { useI18n } from "@/i18n/provider";
import { assetLabel, platformLabel } from "@/i18n/labels";

/**
 * Downloads grouped by detected platform. When a release ships no build
 * artifacts at all, an honest "source release" state is shown instead of
 * fake download buttons.
 */
export function DownloadsPanel({ release }: { release: NormalizedRelease }) {
  const { t, tf } = useI18n();
  const { groups, checksums } = groupAssets(release.assets);

  if (groups.length === 0) {
    return (
      <div className="card-surface flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <PackageOpen className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t.downloads.sourceReleaseTitle}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.downloads.sourceReleaseDesc}</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <a href={release.url} target="_blank" rel="noopener noreferrer">
            {t.downloads.viewRelease}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const Icon = platformIcon(group.platform);
        const filesLabel = group.assets.length === 1 ? t.detail.filesOne : tf(t.detail.files, { count: group.assets.length });
        return (
          <section key={group.platform} aria-label={tf(t.detail.downloadsFor, { platform: platformLabel(t, group.platform) })}>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="size-4 text-primary" aria-hidden />
              {platformLabel(t, group.platform)}
              <span className="font-normal text-muted-foreground">· {filesLabel}</span>
            </h3>
            <ul className="mt-2.5 space-y-2">
              {group.assets.map((asset) => (
                <li key={asset.url}>
                  <a
                    href={asset.url}
                    className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40 hover:shadow-sm"
                    title={`${tf(t.card.download, { label: assetLabel(t, asset.label) })} — ${asset.name}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowDownToLine className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0" dir="auto">
                        <span className="block text-sm font-semibold">{assetLabel(t, asset.label)}</span>
                        <span dir="ltr" className="block truncate text-start text-xs text-muted-foreground">
                          {asset.name}
                        </span>
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatBytes(asset.size)}
                      {asset.downloadCount > 0 ? ` · ${tf(t.downloads.downloadsCount, { count: formatCount(asset.downloadCount) })}` : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {checksums.length > 0 && (
        <details className="card-surface px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {tf(t.downloads.checksums, { count: checksums.length })}
          </summary>
          <ul className="mt-3 space-y-1.5">
            {checksums.map((asset) => (
              <li key={asset.url}>
                <a href={asset.url} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  <FileArchive className="size-3.5" aria-hidden />
                  <span dir="ltr">{asset.name}</span>
                  <span className="text-xs opacity-70">· {formatBytes(asset.size)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            {t.downloads.verifyNote}
          </p>
        </details>
      )}
    </div>
  );
}
