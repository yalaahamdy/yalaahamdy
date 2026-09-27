#!/usr/bin/env python3
"""Scrape repo root file listings from github.com HTML (api.github.com is
rate-limited from the sandbox) and hunt for icon-like files, then probe
deeper guesses for the remaining repos."""

import json
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (research)"}

REPOS = ["yalaahamdy/safeguard", "yalaahamdy/SecureBrowser", "yalaahamdy/EEA"]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", "replace")


def root_items(repo: str) -> list[str]:
    html = fetch(f"https://github.com/{repo}")
    names: set[str] = set()
    # embedded JSON payloads contain "name":"..." entries for repo contents
    for m in re.finditer(r'"name":"([^"\\]+)","path":"([^"\\]+)"', html):
        names.add(m.group(2))
    # also plain repo file links
    for m in re.finditer(r'href="/' + repo + r'/(?:blob|tree)/[^"]+"', html):
        pass
    return sorted(names)


def main() -> None:
    out = {}
    for repo in REPOS:
        try:
            items = root_items(repo)
        except Exception as exc:  # noqa: BLE001
            items = []
            out[repo] = {"error": str(exc)}
            continue
        images = [i for i in items if re.search(r"\.(png|svg|webp|jpe?g|ico)$", i, re.I)]
        out[repo] = {"root_entries": len(items), "images": images, "dirs": [i for i in items if "." not in i.rsplit("/", 1)[-1]][:40]}
        print(repo, "->", json.dumps(out[repo], ensure_ascii=False)[:600])
    with open("/home/z/my-project/research/missing-repo-structure.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
