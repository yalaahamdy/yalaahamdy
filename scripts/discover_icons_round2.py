#!/usr/bin/env python3
"""Round 2: targeted, concurrent probing for the 3 repos still missing icons."""

import concurrent.futures as cf
import json
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (research)"}


def head(url: str) -> tuple[str, str] | None:
    try:
        req = urllib.request.Request(url, method="HEAD", headers=UA)
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status == 200:
                return (r.headers.get("Content-Type") or "?", r.headers.get("Content-Length") or "?")
    except Exception:  # noqa: BLE001
        return None
    return None


def get(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=12) as r:
            if r.status == 200:
                return r.read().decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return None
    return None


def main() -> None:
    # ---- EEA: parse index.html for icon references, plus folder guesses ----
    eea_hits: list[str] = []
    html = get("https://raw.githubusercontent.com/yalaahamdy/EEA/HEAD/index.html")
    refs: list[str] = []
    if html:
        for m in re.finditer(r'(?:href|src)="([^"]+\.(?:png|svg|webp|ico|jpg))"', html, re.I):
            refs.append(m.group(1))
        # manifest icons
        for m in re.finditer(r'"src"\s*:\s*"([^"]+)"', html):
            refs.append(m.group(1))
    eea_guesses = [f"icon/{n}.{e}" for n in ("icon", "logo", "app", "favicon", "eea") for e in ("png", "svg", "webp", "ico")]
    eea_paths = sorted(set(r.lstrip("./") for r in refs if not r.startswith(("http", "data:")))) + eea_guesses
    with cf.ThreadPoolExecutor(max_workers=16) as pool:
        futs = {pool.submit(head, f"https://raw.githubusercontent.com/yalaahamdy/EEA/HEAD/{p}"): p for p in eea_paths}
        for fut in cf.as_completed(futs):
            if fut.result():
                eea_hits.append(futs[fut])
    print("EEA index refs:", refs[:10])
    print("EEA hits:", sorted(set(eea_hits)))

    # ---- Android repos: targeted mipmap/drawable probe ----
    android_hits: dict[str, list[str]] = {}
    paths: list[tuple[str, str]] = []
    for b in ("safeguard", "SecureBrowser"):
        for res in ("mipmap-xxxhdpi", "mipmap-xxhdpi", "mipmap-xhdpi", "mipmap-hdpi", "mipmap-mdpi",
                    "drawable-xxxhdpi", "drawable-xxhdpi", "drawable-xhdpi", "drawable"):
            for name in ("ic_launcher", "ic_launcher_round", "app_icon", "logo", "icon"):
                for ext in ("png", "webp"):
                    paths.append((b, f"app/src/main/res/{res}/{name}.{ext}"))
    with cf.ThreadPoolExecutor(max_workers=24) as pool:
        futs = {pool.submit(head, f"https://raw.githubusercontent.com/yalaahamdy/{b}/HEAD/{p}"): (b, p) for b, p in paths}
        for fut in cf.as_completed(futs):
            if fut.result():
                b, p = futs[fut]
                android_hits.setdefault(b, []).append(p)
    for b, hits in android_hits.items():
        print(b, "hits:", sorted(hits))

    out = {"eea": sorted(set(eea_hits)), "android": {k: sorted(v) for k, v in android_hits.items()}}
    with open("/home/z/my-project/research/round2-icons.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)


if __name__ == "__main__":
    main()
