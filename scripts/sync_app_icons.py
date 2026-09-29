#!/usr/bin/env python3
"""Sync real app icons from the project repositories into site assets.

- Downloads each repo's real icon file (paths verified by discover_icons*.py)
- Optimizes raster icons to <=512px into public/app-icons/
- Rebuilds safeguard/SecureBrowser icons from their Adaptive-Icon vector XML
  (the launcher icon exists only as XML, so it is faithfully reconstructed
  from the app's own source files)
- Writes research/icon-map.json with provenance for every app

Re-run this script whenever an app icon changes in its repository.
"""

import io
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

from pathlib import Path
from PIL import Image

UA = {"User-Agent": "Mozilla/5.0 (research)"}
BASE_DIR = Path(__file__).resolve().parent.parent
OUT = str(BASE_DIR / "public" / "app-icons")
RESEARCH_DIR = BASE_DIR / "research"
NS = "{http://schemas.android.com/apk/res/android}"

# slug -> (repo, icon path in repo | "@adaptive")
SOURCES = {
    "clipvault": ("yalaahamdy/ClipVault", "icon.png"),
    "siraj": ("yalaahamdy/SIRAJ", "icon.png"),
    "safeguard": ("yalaahamdy/safeguard", "@adaptive"),
    "securebrowser": ("yalaahamdy/SecureBrowser", "@adaptive"),
    "app-usage-tracker": ("yalaahamdy/App-Usage-Tracker-Controller", "@adaptive"),
    "screenmonitor": ("yalaahamdy/ScreenMonitor", "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"),
    "eea": ("yalaahamdy/EEA", "icon/logo.png"),
    "laselki": ("yalaahamdy/Laselki", "@adaptive"),
    "siraj-website": ("yalaahamdy/SIRAJ-website", "public/brand/app_icon.png"),
}


def fetch(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status} for {url}")
        return r.read()


def raw(repo: str, path: str) -> bytes:
    return fetch(f"https://raw.githubusercontent.com/{repo}/HEAD/{path}")


def get_text(repo: str, path: str) -> str:
    try:
        return raw(repo, path).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001 — missing optional resource files are expected
        return ""


# ---------------------------------------------------------------- SVG build

def android_color(value: str) -> str:
    """Normalize #RRGGBB / #AARRGGBB to #RRGGBB."""
    value = value.strip()
    if value.startswith("#"):
        if len(value) == 9:  # #AARRGGBB
            value = "#" + value[3:]
        if len(value) == 5:  # #ARGB
            value = "#" + "".join(ch * 2 for ch in value[2:])
    return value


def group_transform(attrs: dict) -> str:
    scale_x = float(attrs.get("scaleX", "1"))
    scale_y = float(attrs.get("scaleY", "1"))
    pivot_x = float(attrs.get("pivotX", "0"))
    pivot_y = float(attrs.get("pivotY", "0"))
    tx = float(attrs.get("translateX", "0"))
    ty = float(attrs.get("translateY", "0"))
    parts: list[str] = []
    if (tx, ty) != (0.0, 0.0):
        parts.append(f"translate({tx},{ty})")
    if (scale_x, scale_y) != (1.0, 1.0):
        if (pivot_x, pivot_y) != (0.0, 0.0):
            parts.append(f"translate({pivot_x},{pivot_y})")
        parts.append(f"scale({scale_x},{scale_y})")
        if (pivot_x, pivot_y) != (0.0, 0.0):
            parts.append(f"translate({-pivot_x},{-pivot_y})")
    return " ".join(parts)


def vector_to_svg(xml_text: str) -> str:
    root = ET.fromstring(xml_text)
    vw = root.get(NS + "viewportWidth", root.get(NS + "width", "108"))
    vh = root.get(NS + "viewportHeight", root.get(NS + "height", "108"))
    body: list[str] = []

    def walk(node: ET.Element, inherited: str) -> None:
        transform = group_transform({k.replace(NS, ""): v for k, v in node.attrib.items()})
        g_attrs = f' transform="{transform}"' if transform else ""
        if g_attrs:
            body.append(f"<g{g_attrs}>")
        for child in node:
            tag = child.tag.replace(NS, "")
            if tag == "group":
                walk(child, inherited)
                continue
            if tag != "path":
                continue
            attrs = {k.replace(NS, ""): v for k, v in child.attrib.items()}
            fill = android_color(attrs.get("fillColor", inherited)) or "#000000"
            fill_rule = ' fill-rule="evenodd"' if attrs.get("fillType") == "evenOdd" else ""
            d = attrs["pathData"].replace(",", ", ").strip()
            body.append(f'<path d="{d}" fill="{fill}"{fill_rule}/>')
        if g_attrs:
            body.append("</g>")

    walk(root, "")
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}">' + "".join(body) + "</svg>"


def build_adaptive_svg(repo: str) -> str:
    """Compose background + foreground adaptive layers into one square SVG."""
    fg_xml = get_text(repo, "app/src/main/res/drawable/ic_launcher_foreground.xml")
    fg_inner = vector_to_svg(fg_xml)

    # background: prefer drawable vector, then a color resource
    bg_xml = get_text(repo, "app/src/main/res/drawable/ic_launcher_background.xml")
    if bg_xml and "<vector" in bg_xml:
        bg_match = re.search(r"<svg[^>]*>(.*)</svg>", vector_to_svg(bg_xml), re.S)
        bg_layer = bg_match.group(1) if bg_match else ""
    else:
        color = ""
        for res_file in ("values/colors.xml", "values/ic_launcher_background.xml"):
            text = get_text(repo, f"app/src/main/res/{res_file}")
            m = re.search(r'name="ic_launcher_background"[^>]*>([^<]+)<', text) or re.search(
                r'name="ic_launcher_background"\s+[^>]*value="([^"]+)"', text
            )
            if text and m:
                color = android_color(m.group(1))
                break
        if not color:
            m = re.search(r'name="launcherBackground"[^>]*>([^<]+)<', get_text(repo, "app/src/main/res/values/colors.xml"))
            color = android_color(m.group(1)) if m else "#1D4ED8"
        bg_layer = f'<rect width="108" height="108" fill="{color}"/>'

    inner = fg_inner.split(">", 1)[1].rsplit("</svg>", 1)[0]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">'
        f'{bg_layer}{inner}</svg>'
    )


# ---------------------------------------------------------------- raster

def optimize_raster(data: bytes, name: str) -> tuple[bytes, str, tuple[int, int]]:
    """All raster icons are shipped as WebP — smallest payload, universal support."""
    img = Image.open(io.BytesIO(data))
    img.load()
    if img.mode not in ("RGBA", "RGB"):
        img = img.convert("RGBA")
    img.thumbnail((512, 512), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=90, method=6)
    return buf.getvalue(), "webp", img.size


def main() -> None:
    import os

    os.makedirs(OUT, exist_ok=True)
    report = {}
    for slug, (repo, source) in SOURCES.items():
        try:
            if source == "@adaptive":
                svg = build_adaptive_svg(repo)
                out_path = f"{OUT}/{slug}.svg"
                with open(out_path, "w", encoding="utf-8") as f:
                    f.write(svg)
                report[slug] = {"file": f"app-icons/{slug}.svg", "origin": "adaptive-icon XML reconstruction", "repo": repo, "bytes": len(svg)}
            else:
                data = raw(repo, source)
                if source.lower().endswith(".svg"):
                    out_path = f"{OUT}/{slug}.svg"
                    with open(out_path, "wb") as f:
                        f.write(data)
                    report[slug] = {"file": f"app-icons/{slug}.svg", "origin": source, "repo": repo, "bytes": len(data)}
                else:
                    optimized, fmt, size = optimize_raster(data, source)
                    out_path = f"{OUT}/{slug}.{fmt}"
                    with open(out_path, "wb") as f:
                        f.write(optimized)
                    report[slug] = {"file": f"app-icons/{slug}.{fmt}", "origin": source, "repo": repo, "bytes": len(optimized), "pixels": f"{size[0]}x{size[1]}"}
            print(f"{slug:18s} -> {report[slug]['file']:32s} {report[slug]['bytes']:>8,} bytes  ({report[slug].get('pixels', 'vector')})")
        except Exception as exc:  # noqa: BLE001
            report[slug] = {"error": str(exc), "repo": repo, "origin": source}
            print(f"{slug:18s} -> ERROR: {exc}")

    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    with open(RESEARCH_DIR / "icon-map.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print("\nProvenance written to research/icon-map.json")


if __name__ == "__main__":
    main()
