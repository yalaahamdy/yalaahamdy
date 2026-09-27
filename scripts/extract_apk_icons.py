#!/usr/bin/env python3
"""Extract the real launcher icon from release APKs for repos whose launcher
icon is an Android adaptive (XML) icon that cannot be linked directly.

APKs come from the projects' own GitHub Releases (their official channel).
Extracted PNG/WEBP icons are saved into the site assets: public/app-icons/.
"""

import io
import json
import re
import urllib.request
import zipfile

UA = {"User-Agent": "Mozilla/5.0 (research)"}
OUT = "/home/z/my-project/public/app-icons"


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def get(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            if r.status == 200:
                return r.read().decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return None
    return None


def release_apk_urls(repo: str) -> list[str]:
    # discover tags from the releases atom feed (no API quota involved)
    xml = get(f"https://github.com/{repo}/releases.atom") or ""
    tags = re.findall(r"/releases/tag/([^<\"]+)", xml)
    urls: list[str] = []
    seen = set()
    for tag in tags[:6]:
        page = get(f"https://github.com/{repo}/releases/expanded_assets/{tag}")
        if not page:
            continue
        for m in re.finditer(r'href="([^"]+\.(?:apk|apks))"', page, re.I):
            path = m.group(1)
            url = "https://github.com" + path if path.startswith("/") else path
            if url not in seen:
                seen.add(url)
                urls.append(url)
    return urls


ICON_RES = re.compile(r"res/[^/]*(?:mipmap|drawable)[^/]*/[^/]*(?:ic_launcher|app_icon|icon)[^/]*\.(?:png|webp)$", re.I)
DENSITY = re.compile(r"-((?:xxx|xx|x)?hdpi|mdpi)")


def density_key(name: str) -> int:
    m = DENSITY.search(name)
    order = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]
    return order.index(m.group(1)) if m and m.group(1) in order else -1


def extract_icon(apk_bytes: bytes, slug: str) -> str | None:
    with zipfile.ZipFile(io.BytesIO(apk_bytes)) as zf:
        candidates = [n for n in zf.namelist() if ICON_RES.search(n) and "background" not in n.lower()]
        if not candidates:
            return None
        # skip monochrome/foreground variants when a full icon exists
        best = max(candidates, key=lambda n: (density_key(n), 0 if "round" in n.lower() else 1))
        data = zf.read(best)
        with open(f"{OUT}/{slug}.webp" if best.endswith(".webp") else f"{OUT}/{slug}.png", "wb") as f:
            f.write(data)
        return f"{best} ({len(data)} bytes)"


def main() -> None:
    import os

    os.makedirs(OUT, exist_ok=True)
    report = {}
    for slug, repo in (("safeguard", "yalaahamdy/safeguard"), ("securebrowser", "yalaahamdy/SecureBrowser")):
        try:
            urls = release_apk_urls(repo)
            print(slug, "APK candidates:", urls[:3])
            done = None
            for url in urls[:2]:
                apk = fetch_bytes(url)
                done = extract_icon(apk, slug)
                if done:
                    break
            report[slug] = {"apk": urls[:2], "extracted": done}
        except Exception as exc:  # noqa: BLE001
            report[slug] = {"error": str(exc)}
        print(slug, "->", report[slug])
    with open("/home/z/my-project/research/apk-icons.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


if __name__ == "__main__":
    main()
