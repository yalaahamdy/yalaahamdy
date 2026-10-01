#!/usr/bin/env python3
"""Download and optimize LocalDock icon and screenshots from GitHub."""

import io
import json
import os
from pathlib import Path
import urllib.request
from PIL import Image

REPO = "Youssef-Alaa-Hamdy/LocalDock"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/main"
BASE_DIR = Path(__file__).resolve().parent.parent

ICON_OUT = BASE_DIR / "public" / "app-icons" / "localdock.webp"
SHOTS_DIR = BASE_DIR / "public" / "screenshots" / "localdock"

SCREENSHOTS = [
    ("arabic-dashboard", "docs/screenshots/arabic-dashboard.png", "لوحة التحكم الرئيسية باللغة العربية مع سجل النشاط والإجراءات السريعة"),
    ("dashboard-light", "docs/screenshots/dashboard-light.png", "لوحة التحكم بالوضع الفاتح مع مؤشرات الأداء الحية"),
    ("files-dark", "docs/screenshots/files-dark.png", "متصفح ومستكشف الملفات بالوضع الداكن وشبكة المصغرات الذكية"),
    ("preview-modal", "docs/screenshots/preview-modal.png", "نافذة معاينة الوسائط المتقدمة وتدقيق بصمة SHA-256 الرقمية"),
    ("transfers-live", "docs/screenshots/transfers-live.png", "متابعة عمليات النقل المباشرة والسرعة الفورية بين الأجهزة"),
    ("devices-qr", "docs/screenshots/devices-qr.png", "إدارة وربط الأجهزة المتصلة ومسح رمز الاستجابة السريعة QR"),
    ("files-upload-dock", "docs/screenshots/files-upload-dock.png", "نافذة رفع وسحب وإفلات الملفات متعددة الأجزاء Chunks"),
    ("mobile-drawer", "docs/screenshots/mobile-drawer.png", "القائمة الجانبية المتجاوبة لشاشات الهواتف والأجهزة اللوحية"),
]

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LocalDockAssetSync/1.0"}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def main():
    ICON_OUT.parent.mkdir(parents=True, exist_ok=True)
    SHOTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching LocalDock icon...")
    # Try high-res 1024x1024 icon first, fallback to icon.png
    try:
        icon_data = fetch(f"{RAW_BASE}/src-tauri/icons/ios/AppIcon-512@2x.png")
    except Exception:
        icon_data = fetch(f"{RAW_BASE}/src-tauri/icons/icon.png")

    img = Image.open(io.BytesIO(icon_data)).convert("RGBA")
    img.thumbnail((512, 512), Image.LANCZOS)
    img.save(ICON_OUT, "WEBP", quality=92, method=6)
    print(f"Saved icon to {ICON_OUT} ({img.size[0]}x{img.size[1]})")

    results = []
    for slug, remote_path, alt_ar in SCREENSHOTS:
        print(f"Fetching screenshot: {slug}...")
        url = f"{RAW_BASE}/{remote_path}"
        data = fetch(url)
        shot_img = Image.open(io.BytesIO(data))
        if shot_img.mode not in ("RGB", "RGBA"):
            shot_img = shot_img.convert("RGBA")

        # Save optimized WebP
        out_webp = SHOTS_DIR / f"{slug}.webp"
        shot_img.save(out_webp, "WEBP", quality=88, method=6)

        results.append({
            "src": f"/screenshots/localdock/{slug}.webp",
            "alt": alt_ar,
            "width": shot_img.size[0],
            "height": shot_img.size[1],
        })
        print(f"  -> Saved {out_webp.name} ({shot_img.size[0]}x{shot_img.size[1]}, {out_webp.stat().st_size // 1024} KB)")

    print("\nSummary of screenshots:")
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
