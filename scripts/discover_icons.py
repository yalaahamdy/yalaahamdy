#!/usr/bin/env python3
"""Discover real app icons in each GitHub repository.

Probes common icon locations via raw.githubusercontent.com (works without
API tokens and is reachable from the sandbox). Results are written to
research/icons-summary.json so the site config can reference verified,
real files only — nothing is fabricated.
"""

import concurrent.futures as cf
import json
import urllib.request
import urllib.error

REPOS = [
    ("clipvault", "yalaahamdy/ClipVault"),
    ("siraj", "yalaahamdy/SIRAJ"),
    ("safeguard", "yalaahamdy/safeguard"),
    ("securebrowser", "yalaahamdy/SecureBrowser"),
    ("app-usage-tracker", "yalaahamdy/App-Usage-Tracker-Controller"),
    ("screenmonitor", "yalaahamdy/ScreenMonitor"),
    ("eea", "yalaahamdy/EEA"),
    ("laselki", "yalaahamdy/Laselki"),
    ("siraj-website", "yalaahamdy/SIRAJ-website"),
]

# Candidate paths: (path, kind) — kind used for scoring ("icon" beats "logo").
CANDIDATES = [
    # Tauri (ClipVault is Tauri-based)
    "src-tauri/icons/icon.png",
    "src-tauri/icons/128x128.png",
    "src-tauri/icons/128x128@2x.png",
    "src-tauri/icons/icon.ico",
    # Android launcher icons (highest densities first)
    "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp",
    "app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
    "app/src/main/res/mipmap-xxhdpi/ic_launcher.webp",
    "app/src/main/res/mipmap-xhdpi/ic_launcher.png",
    "app/src/main/res/mipmap-xhdpi/ic_launcher.webp",
    "app/src/main/res/mipmap-hdpi/ic_launcher.png",
    "app/src/main/res/mipmap-hdpi/ic_launcher.webp",
    "app/src/main/res/mipmap-mdpi/ic_launcher.png",
    "app/src/main/res/mipmap-mdpi/ic_launcher.webp",
    "app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png",
    "app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp",
    # Flutter-style nesting
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp",
    # Legacy root launcher icon
    "ic_launcher-web.png",
    # Generic roots
    "icon.png",
    "icon.svg",
    "logo.png",
    "logo.svg",
    "app-icon.png",
    "appicon.png",
    "favicon.png",
    "favicon.svg",
    # Common folders
    "assets/icon.png",
    "assets/logo.png",
    "assets/icon.svg",
    "assets/logo.svg",
    "assets/app_icon.png",
    "images/icon.png",
    "images/logo.png",
    "public/icon.png",
    "public/logo.png",
    "public/logo.svg",
    "public/favicon.svg",
    "public/favicon.png",
    "public/favicon-192.png",
    "public/android-chrome-192x192.png",
    "public/apple-touch-icon.png",
    ".github/assets/icon.png",
    ".github/assets/logo.png",
    ".github/icon.png",
    ".github/logo.png",
    "docs/icon.png",
    "docs/logo.png",
    "src/assets/icon.png",
    "src/assets/logo.png",
    "src/assets/logo.svg",
    # Electron
    "build/icon.png",
    "resources/icon.png",
]

EXT_SCORE = {".svg": 5, ".png": 4, ".webp": 3, ".jpg": 2, ".jpeg": 2, ".ico": 1}
DENSITY_SCORE = {"xxxhdpi": 5, "xxhdpi": 4, "xhdpi": 3, "hdpi": 2, "mdpi": 1}


def score(path: str, size: int) -> float:
    lower = path.lower()
    ext = ("." + lower.rsplit(".", 1)[-1]) if "." in lower.rsplit("/", 1)[-1] else ""
    s = EXT_SCORE.get(ext, 0) * 10
    s += 4 if "/icon" in lower or lower.startswith("icon") or lower.startswith("src-tauri/icons") else 0
    s += 2 if "logo" in lower else 0
    for dens, ds in DENSITY_SCORE.items():
        if dens in lower:
            s += ds
            break
    s += max(0, 3 - path.count("/"))  # prefer shallower
    s += min(size / 100_000, 2.0)  # prefer bigger files slightly
    return s


def probe(repo: str, path: str) -> tuple[str, int, str] | None:
    url = f"https://raw.githubusercontent.com/{repo}/HEAD/{path}"
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "icon-discovery/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                ctype = resp.headers.get("Content-Type", "")
                if ctype.startswith("image/") or ctype in ("application/octet-stream", "text/plain"):
                    return (path, int(resp.headers.get("Content-Length") or 0), ctype)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        pass
    return None


def main() -> None:
    jobs = [(slug, repo, path) for slug, repo in REPOS for path in CANDIDATES]
    results: dict[str, dict] = {}
    with cf.ThreadPoolExecutor(max_workers=14) as pool:
        future_map = {pool.submit(probe, repo, path): (slug, repo, path) for slug, repo, path in jobs}
        for future in cf.as_completed(future_map):
            slug, repo, path = future_map[future]
            hit = future.result()
            if hit:
                entry = results.setdefault(slug, {"repo": repo, "hits": []})
                entry["hits"].append({"path": hit[0], "size": hit[1], "type": hit[2]})

    summary: dict[str, dict] = {"checked_at": "2026-09-27", "repos": {}}
    for slug, repo in REPOS:
        entry = results.get(slug)
        if not entry:
            summary["repos"][slug] = {"repo": repo, "icon": None, "candidates_found": []}
            continue
        hits = entry["hits"]
        best = max(hits, key=lambda h: score(h["path"], h["size"]))
        summary["repos"][slug] = {
            "repo": repo,
            "icon": best["path"],
            "size": best["size"],
            "type": best["type"],
            "candidates_found": sorted(h["path"] for h in hits),
        }

    with open("/home/z/my-project/research/icons-summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    for slug, info in summary["repos"].items():
        print(f"{slug:20s} -> {info['icon']}  ({info.get('size', '-')}, {info.get('type', '-')})")


if __name__ == "__main__":
    main()
