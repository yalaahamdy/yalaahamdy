#!/usr/bin/env python3
"""Research yalaahamdy's real repositories via github.com HTML (API is rate-limited in sandbox)."""
import json
import re
import time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (site-research)", "Accept": "text/html"}
BASE = "https://github.com"
USER = "yalaahamdy"
OUT = "/home/z/my-project/research"


def fetch(url: str) -> str | None:
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read().decode("utf-8", "ignore")
    except Exception as e:  # noqa: BLE001
        print(f"  ! fetch failed {url}: {e}")
        return None


def repo_list() -> list[str]:
    names: list[str] = []
    for page in (1, 2):
        html = fetch(f"{BASE}/{USER}?tab=repositories&page={page}&type=source")
        if not html:
            continue
        found = re.findall(rf'itemprop="name codeRepository"[^>]*>\s*([A-Za-z0-9_.-]+)\s*</a>', html)
        for n in found:
            if n.lower() not in {x.lower() for x in names} and n.lower() != USER:
                names.append(n)
        time.sleep(0.4)
    return names


def repo_meta(name: str) -> dict:
    meta: dict = {"name": name}
    html = fetch(f"{BASE}/{USER}/{name}")
    if not html:
        meta["exists"] = False
        return meta
    meta["exists"] = True
    m = re.search(r'<meta property="og:description" content="([^"]*)"', html)
    meta["description"] = (m.group(1) if m else "").strip()
    m = re.search(r'Programming language.*?itemprop="programmingLanguage">([A-Za-z+#]+)<', html, re.S)
    meta["language"] = m.group(1) if m else None
    m = re.search(rf'href="/{USER}/{name}/blob/([A-Za-z0-9._-]+)/', html)
    meta["default_branch"] = m.group(1) if m else "main"
    time.sleep(0.4)

    rel = fetch(f"{BASE}/{USER}/{name}/releases")
    if rel and "There aren’t any releases here" not in rel:
        m = re.search(rf'href="/{USER}/{name}/releases/tag/([^"?]+)"', rel)
        tag = m.group(1) if m else None
        if tag:
            import html as htmllib

            tag = htmllib.unescape(tag)
            meta["latest_tag"] = tag
            m2 = re.search(r'<relative-time[^>]*datetime="([^"]+)"', rel)
            meta["latest_published"] = m2.group(1) if m2 else None
            assets_html = fetch(f"{BASE}/{USER}/{name}/releases/expanded_assets/{tag}")
            if assets_html:
                names_ = re.findall(r'<a[^>]*href="[^"]*/releases/download/[^"]*"[^>]*>([^<]+)</a>', assets_html)
                meta["assets"] = [n.strip() for n in names_]
            notes = re.search(r'<div class="markdown-body" data-test-selector="body-content"([^>]*)>(.*?)</div>', rel, re.S)
            if notes:
                text = re.sub(r"<[^>]+>", " ", notes.group(2))
                meta["latest_notes_excerpt"] = re.sub(r"\s+", " ", text).strip()[:300]
    return meta


def main() -> None:
    result: dict = {"user": USER, "checked_at": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "repos": []}
    names = repo_list()
    print(f"found repos: {names}")
    for n in names:
        print(f"== {n} ==")
        result["repos"].append(repo_meta(n))
        time.sleep(0.4)
    with open(f"{OUT}/repos-summary.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False, indent=2)[:5000])


if __name__ == "__main__":
    main()
