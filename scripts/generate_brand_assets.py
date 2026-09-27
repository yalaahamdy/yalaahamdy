#!/usr/bin/env python3
"""Generate PWA icons + OG image for the site (one-time assets, committed to public/)."""
from PIL import Image, ImageDraw, ImageFont

OUT = "/home/z/my-project/public"
VIOLET_TOP = (139, 92, 246)
VIOLET_BOTTOM = (91, 33, 182)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def gradient(vertical_size: int, horizontal_size: int) -> Image.Image:
    image = Image.new("RGB", (horizontal_size, vertical_size))
    for y in range(vertical_size):
        ratio = y / max(1, vertical_size - 1)
        color = tuple(round(top + (bottom - top) * ratio) for top, bottom in zip(VIOLET_TOP, VIOLET_BOTTOM))
        for_seg = Image.new("RGB", (horizontal_size, 1), color)
        image.paste(for_seg, (0, y))
    return image


def rounded_icon(size: int, radius_ratio: float, letter_ratio: float = 0.52) -> Image.Image:
    base = gradient(size, size).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base, (0, 0), mask)

    font = ImageFont.truetype(FONT_BOLD, int(size * letter_ratio))
    letter = "Y"
    bbox = draw.textbbox((0, 0), letter, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1] - size * 0.01
    ImageDraw.Draw(icon).text((x, y), letter, font=font, fill="white")
    return icon


def maskable_icon(size: int) -> Image.Image:
    # Full-bleed square background; letter kept inside the 80% safe zone.
    base = gradient(size, size).convert("RGBA")
    font = ImageFont.truetype(FONT_BOLD, int(size * 0.42))
    letter = "Y"
    draw = ImageDraw.Draw(base)
    bbox = draw.textbbox((0, 0), letter, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]
    draw.text((x, y), letter, font=font, fill="white")
    return base


def og_image() -> Image.Image:
    width, height = 1200, 630
    image = gradient(height, width).convert("RGB")

    # subtle grid
    draw = ImageDraw.Draw(image, "RGBA")
    step = 48
    for x in range(0, width, step):
        draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 10))
    for y in range(0, height, step):
        draw.line([(0, y), (width, y)], fill=(255, 255, 255, 10))
    # vignette
    overlay = Image.new("L", (width, height), 0)
    ImageDraw.Draw(overlay).ellipse([-width * 0.3, -height * 0.6, width * 1.3, height * 1.5], fill=60)
    dark = Image.new("RGB", (width, height), (10, 8, 18))
    image = Image.composite(dark, image, overlay.point(lambda v: 255 - v))

    draw = ImageDraw.Draw(image)
    icon = rounded_icon(132, 0.24)
    image.paste(icon, (84, 96), icon)

    title_font = ImageFont.truetype(FONT_BOLD, 92)
    sub_font = ImageFont.truetype(FONT_BOLD, 34)
    small_font = ImageFont.truetype(FONT_BOLD, 24)

    draw.text((84, 280), "Yalaah Apps", font=title_font, fill="white")
    draw.text((84, 400), "Every app I build — in one official hub.", font=sub_font, fill=(226, 220, 245))
    draw.text((84, 478), "Live releases · Direct downloads · Straight from GitHub", font=small_font, fill=(190, 178, 225))

    # badge chip
    chip_text = "yalaahamdy.github.io"
    chip_font = ImageFont.truetype(FONT_BOLD, 26)
    bbox = draw.textbbox((0, 0), chip_text, font=chip_font)
    tw = bbox[2] - bbox[0]
    cx, cy = 84, 540
    draw.rounded_rectangle([cx, cy, cx + tw + 56, cy + 56], radius=28, fill=(255, 255, 255, 28), outline=(255, 255, 255, 70), width=2)
    draw.text((cx + 28, cy + 12), chip_text, font=chip_font, fill="white")
    return image


if __name__ == "__main__":
    rounded_icon(192, 0.22).save(f"{OUT}/icons/icon-192.png", optimize=True)
    rounded_icon(512, 0.22).save(f"{OUT}/icons/icon-512.png", optimize=True)
    maskable_icon(512).save(f"{OUT}/icons/icon-maskable-512.png", optimize=True)
    rounded_icon(180, 0.22).save(f"{OUT}/icons/apple-touch-icon.png", optimize=True)
    og_image().save(f"{OUT}/og-image.png", optimize=True)
    print("icons + og image generated")
