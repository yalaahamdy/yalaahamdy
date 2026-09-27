import type { AppEntry, AssetOverride } from "../config";
import type { GhAsset, GhRelease } from "../services/github";

export type PlatformId = "Android" | "Windows" | "macOS" | "Linux" | "Web" | "Other";

export const PLATFORM_ORDER: PlatformId[] = ["Android", "Windows", "macOS", "Linux", "Web", "Other"];

export type AssetKind = "installer" | "portable" | "package" | "archive" | "checksum" | "other";

export interface DetectedAsset {
  platform: PlatformId;
  kind: AssetKind;
  label: string;
}

export interface NormalizedAsset extends DetectedAsset {
  name: string;
  size: number;
  downloadCount: number;
  url: string;
}

export interface NormalizedRelease {
  tagName: string;
  name: string;
  notes: string | null;
  url: string;
  publishedAt: string | null;
  prerelease: boolean;
  assets: NormalizedAsset[];
  totalDownloads: number;
}

interface ExtRule {
  ext: string;
  platform: PlatformId;
  kind: AssetKind;
  label: string;
}

/** Ordered by specificity — `.tar.gz` must be tested before shorter suffixes. */
const EXT_RULES: readonly ExtRule[] = [
  { ext: ".tar.gz", platform: "Linux", kind: "archive", label: "tar.gz" },
  { ext: ".tgz", platform: "Linux", kind: "archive", label: "tar.gz" },
  { ext: ".apk", platform: "Android", kind: "installer", label: "APK" },
  { ext: ".aab", platform: "Android", kind: "other", label: "AAB bundle" },
  { ext: ".exe", platform: "Windows", kind: "installer", label: "Installer" },
  { ext: ".msi", platform: "Windows", kind: "installer", label: "Installer" },
  { ext: ".msix", platform: "Windows", kind: "installer", label: "MSIX" },
  { ext: ".msixbundle", platform: "Windows", kind: "installer", label: "MSIX bundle" },
  { ext: ".dmg", platform: "macOS", kind: "installer", label: "Disk image" },
  { ext: ".pkg", platform: "macOS", kind: "installer", label: "Installer" },
  { ext: ".deb", platform: "Linux", kind: "package", label: "DEB" },
  { ext: ".rpm", platform: "Linux", kind: "package", label: "RPM" },
  { ext: ".appimage", platform: "Linux", kind: "portable", label: "AppImage" },
  { ext: ".snap", platform: "Linux", kind: "package", label: "Snap" },
  { ext: ".flatpak", platform: "Linux", kind: "package", label: "Flatpak" },
  { ext: ".crx", platform: "Web", kind: "package", label: "Browser extension" },
  { ext: ".xpi", platform: "Web", kind: "package", label: "Browser extension" },
];

const PLATFORM_KEYWORDS: readonly { pattern: RegExp; platform: PlatformId }[] = [
  { pattern: /android/i, platform: "Android" },
  { pattern: /\b(win|win32|win64|windows)\b/i, platform: "Windows" },
  { pattern: /\b(mac|macos|osx|darwin|apple|universal)\b/i, platform: "macOS" },
  { pattern: /\b(linux|ubuntu|debian|fedora|arch|armhf|aarch64)\b/i, platform: "Linux" },
  { pattern: /\bweb\b/i, platform: "Web" },
];

const CHECKSUM_PATTERN = /(\.(sha256|sha512|sha1|md5|sig|asc|pem|sbom|txt|json|yml|yaml|csv)$)|(^checksums?\b)/i;
const SOURCE_PATTERN = /(^|[-._])(src|source)([-._]|$)/i;

function platformFromKeywords(name: string): PlatformId | null {
  for (const rule of PLATFORM_KEYWORDS) {
    if (rule.pattern.test(name)) return rule.platform;
  }
  return null;
}

function detectWithoutOverrides(name: string): DetectedAsset {
  const lower = name.toLowerCase();

  if (CHECKSUM_PATTERN.test(lower)) {
    return { platform: "Other", kind: "checksum", label: "Checksum" };
  }

  for (const rule of EXT_RULES) {
    if (lower.endsWith(rule.ext)) {
      return { platform: rule.platform, kind: rule.kind, label: rule.label };
    }
  }

  if (lower.endsWith(".zip") || lower.endsWith(".7z") || lower.endsWith(".rar")) {
    if (SOURCE_PATTERN.test(lower)) {
      return { platform: "Other", kind: "other", label: "Source code" };
    }
    const platform = platformFromKeywords(lower);
    const portable = /portable|standalone/.test(lower);
    return {
      platform: platform ?? "Other",
      kind: portable ? "portable" : "archive",
      label: portable ? "Portable" : "Archive",
    };
  }

  if (SOURCE_PATTERN.test(lower)) {
    return { platform: "Other", kind: "other", label: "Source code" };
  }

  return { platform: "Other", kind: "other", label: "Other file" };
}

/**
 * Classify a release asset by file name. Detection is intentionally
 * conservative — ambiguous files land in "Other" instead of being guessed.
 * `assetOverrides` from data/apps.json always wins when the regex matches.
 */
export function detectAsset(name: string, overrides?: AssetOverride[]): DetectedAsset {
  if (overrides) {
    for (const override of overrides) {
      try {
        if (new RegExp(override.match, "i").test(name)) {
          const fallback = detectWithoutOverrides(name);
          const platform = PLATFORM_ORDER.includes(override.platform as PlatformId)
            ? (override.platform as PlatformId)
            : "Other";
          return { platform, kind: fallback.kind, label: override.label ?? fallback.label };
        }
      } catch {
        // Invalid user-supplied regex — skip this override rather than crash.
      }
    }
  }
  return detectWithoutOverrides(name);
}

export function normalizeAsset(asset: GhAsset, overrides?: AssetOverride[]): NormalizedAsset {
  return {
    name: asset.name,
    size: typeof asset.size === "number" ? asset.size : 0,
    downloadCount: typeof asset.download_count === "number" ? asset.download_count : 0,
    url: asset.browser_download_url,
    ...detectAsset(asset.name, overrides),
  };
}

export function normalizeRelease(release: GhRelease, app?: Pick<AppEntry, "assetOverrides">): NormalizedRelease {
  const assets = (release.assets ?? []).map((asset) => normalizeAsset(asset, app?.assetOverrides));
  return {
    tagName: release.tag_name,
    name: release.name || release.tag_name,
    notes: release.body && release.body.trim().length > 0 ? release.body : null,
    url: release.html_url,
    publishedAt: release.published_at,
    prerelease: Boolean(release.prerelease),
    assets,
    totalDownloads: assets.reduce((sum, asset) => sum + asset.downloadCount, 0),
  };
}

export function isDownloadable(asset: NormalizedAsset): boolean {
  return asset.kind !== "checksum" && asset.kind !== "other";
}

export interface AssetGroup {
  platform: PlatformId;
  assets: NormalizedAsset[];
}

/** Group downloadable assets by platform in display order; checksums separate. */
export function groupAssets(assets: NormalizedAsset[]): { groups: AssetGroup[]; checksums: NormalizedAsset[] } {
  const groups = new Map<PlatformId, NormalizedAsset[]>();
  const checksums: NormalizedAsset[] = [];
  for (const asset of assets) {
    if (!isDownloadable(asset)) {
      if (asset.kind === "checksum") checksums.push(asset);
      continue;
    }
    const bucket = groups.get(asset.platform) ?? [];
    bucket.push(asset);
    groups.set(asset.platform, bucket);
  }
  const ordered = PLATFORM_ORDER.filter((platform) => groups.has(platform)).map((platform) => ({
    platform,
    assets: groups.get(platform) as NormalizedAsset[],
  }));
  return { groups: ordered, checksums };
}

/**
 * Pick the single best asset for a compact "Download" button:
 * prefer installers/packages for the app's declared platforms, then any
 * installable asset, then any downloadable asset.
 */
export function pickPrimaryAsset(assets: NormalizedAsset[], preferredPlatforms: readonly string[]): NormalizedAsset | null {
  const downloadable = assets.filter(isDownloadable);
  if (downloadable.length === 0) return null;
  const installable = downloadable.filter((a) => a.kind === "installer" || a.kind === "package" || a.kind === "portable");
  for (const platform of preferredPlatforms) {
    const match = installable.find((a) => a.platform === platform);
    if (match) return match;
  }
  if (installable.length > 0) return installable[0] ?? null;
  return downloadable[0] ?? null;
}
