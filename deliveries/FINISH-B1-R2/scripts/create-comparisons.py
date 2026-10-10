"""
Generate Side-by-Side Reference Comparisons and White-Clipping Analysis
Author: Gemini #2 (World / Art Maker)
Authority: Milestone FINISH-B1-R2 (Resolving B1-R3 Overexposure Defect)
"""

import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DELIVERY_DIR = os.path.dirname(SCRIPT_DIR)
ROOT_DIR = os.path.dirname(os.path.dirname(DELIVERY_DIR))
CAPTURES_DIR = os.path.join(DELIVERY_DIR, "captures")
COMPARISONS_DIR = os.path.join(CAPTURES_DIR, "comparisons")
LOGS_DIR = os.path.join(DELIVERY_DIR, "validator-logs")
REF_IMAGE_PATH = os.path.join(ROOT_DIR, "references", "images", "main-reference.png")

os.makedirs(COMPARISONS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

def measure_exposure(img_path):
    if not os.path.exists(img_path):
        return None
    im = Image.open(img_path).convert("RGB")
    arr = np.array(im, dtype=np.float32)
    # Clipped pixels: R >= 245 and G >= 245 and B >= 245
    clipped = (arr[:, :, 0] >= 245) & (arr[:, :, 1] >= 245) & (arr[:, :, 2] >= 245)
    clip_pct = float(np.mean(clipped) * 100.0)
    mean_rgb = [float(np.mean(arr[:, :, i])) for i in range(3)]
    luminance = float(np.mean(0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]))

    return {
        "file": os.path.basename(img_path),
        "dimensions": [im.width, im.height],
        "whiteClippingPercent": round(clip_pct, 2),
        "meanRGB": [round(c, 1) for c in mean_rgb],
        "meanLuminance": round(luminance, 1),
        "status": "PASS" if clip_pct < 5.0 else "FAIL"
    }

def create_side_by_side(img1_path, img2_path, out_path, title1="VISUAL AUTHORITY (main-reference.png)", title2="FINISH-B1-R2 CALIBRATED RUNTIME"):
    if not os.path.exists(img1_path) or not os.path.exists(img2_path):
        print(f"Skipping {out_path}: missing input")
        return

    im1 = Image.open(img1_path).convert("RGB")
    im2 = Image.open(img2_path).convert("RGB")

    target_h = 1080
    w1 = int(im1.width * (target_h / im1.height))
    im1_resized = im1.resize((w1, target_h), Image.Resampling.LANCZOS)

    w2 = int(im2.width * (target_h / im2.height))
    im2_resized = im2.resize((w2, target_h), Image.Resampling.LANCZOS)

    header_h = 60
    total_w = w1 + w2 + 20
    total_h = target_h + header_h

    canvas = Image.new("RGB", (total_w, total_h), (12, 16, 23))
    draw = ImageDraw.Draw(canvas)

    canvas.paste(im1_resized, (0, header_h))
    canvas.paste(im2_resized, (w1 + 20, header_h))

    # Divider bar
    draw.rectangle([w1, header_h, w1 + 20, total_h], fill=(30, 41, 59))

    # Text headers
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = ImageFont.load_default()

    draw.text((20, 18), title1, fill=(244, 63, 94), font=font)
    draw.text((w1 + 40, 18), title2, fill=(0, 229, 255), font=font)

    canvas.save(out_path, quality=95)
    print(f"Saved comparison: {out_path} ({total_w}x{total_h})")

def main():
    print("=" * 80)
    print("ANALYZING EXPOSURE & GENERATING SIDE-BY-SIDE COMPARISONS (FINISH-B1-R2)")
    print("=" * 80)

    # 1. Analyze exposure metrics for all captures
    exposure_receipts = {}
    captures_to_check = [
        os.path.join(CAPTURES_DIR, "desktop-home", "raw-frame.png"),
        os.path.join(CAPTURES_DIR, "desktop-home", "browser-canvas.png"),
        os.path.join(CAPTURES_DIR, "mobile-home", "raw-frame.png"),
        os.path.join(CAPTURES_DIR, "mobile-home", "browser-canvas.png"),
        os.path.join(CAPTURES_DIR, "entry", "raw-frame.png"),
        os.path.join(CAPTURES_DIR, "entry", "browser-canvas.png"),
        os.path.join(CAPTURES_DIR, "monitor-detail", "raw-frame.png"),
        os.path.join(CAPTURES_DIR, "monitor-detail", "browser-canvas.png"),
        os.path.join(CAPTURES_DIR, "reverse-doorway", "raw-frame.png"),
        os.path.join(CAPTURES_DIR, "reverse-doorway", "browser-canvas.png"),
    ]

    for cpath in captures_to_check:
        rel = os.path.relpath(cpath, DELIVERY_DIR).replace("\\", "/")
        m = measure_exposure(cpath)
        if m:
            exposure_receipts[rel] = m
            print(f"{rel}: white clipping = {m['whiteClippingPercent']}% (mean luminance: {m['meanLuminance']}) -> {m['status']}")

    with open(os.path.join(LOGS_DIR, "exposure-evidence.json"), "w", encoding="utf-8") as f:
        json.dump(exposure_receipts, f, indent=2)

    # 2. Generate side-by-side comparison images
    create_side_by_side(
        REF_IMAGE_PATH,
        os.path.join(CAPTURES_DIR, "desktop-home", "browser-canvas.png"),
        os.path.join(COMPARISONS_DIR, "browser-canvas-vs-reference.png"),
        "VISUAL AUTHORITY (main-reference.png)",
        "FINISH-B1-R2 BROWSER RUNTIME (Three.js WebGL Canvas - Calibrated Exposure)"
    )

    create_side_by_side(
        REF_IMAGE_PATH,
        os.path.join(CAPTURES_DIR, "desktop-home", "raw-frame.png"),
        os.path.join(COMPARISONS_DIR, "desktop-home-vs-reference.png"),
        "VISUAL AUTHORITY (main-reference.png)",
        "FINISH-B1-R2 DESKTOP HOME (Blender EEVEE Raw Frame)"
    )

    create_side_by_side(
        REF_IMAGE_PATH,
        os.path.join(CAPTURES_DIR, "monitor-detail", "browser-canvas.png"),
        os.path.join(COMPARISONS_DIR, "monitor-detail-vs-reference.png"),
        "VISUAL AUTHORITY (main-reference.png)",
        "FINISH-B1-R2 MONITOR DETAIL WORKSTATION (Three.js WebGL Canvas)"
    )

    create_side_by_side(
        REF_IMAGE_PATH,
        os.path.join(CAPTURES_DIR, "entry", "browser-canvas.png"),
        os.path.join(COMPARISONS_DIR, "entry-vantage-vs-reference.png"),
        "VISUAL AUTHORITY (main-reference.png)",
        "FINISH-B1-R2 ENTRY DOORWAY VANTAGE (Three.js WebGL Canvas)"
    )

    create_side_by_side(
        REF_IMAGE_PATH,
        os.path.join(CAPTURES_DIR, "reverse-doorway", "browser-canvas.png"),
        os.path.join(COMPARISONS_DIR, "reverse-doorway-vs-reference.png"),
        "VISUAL AUTHORITY (main-reference.png)",
        "FINISH-B1-R2 REVERSE DOORWAY VANTAGE (Three.js WebGL Canvas)"
    )

    print("Comparison generation and exposure analysis complete!")

if __name__ == "__main__":
    main()
