"""
Create side-by-side comparison images between references/images/main-reference.png
and FINISH-B1 production captures in deliveries/FINISH-B1/captures/comparisons/
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DELIVERY_DIR = os.path.join(ROOT_DIR, "deliveries", "FINISH-B1")
CAPTURES_DIR = os.path.join(DELIVERY_DIR, "captures")
COMPARISONS_DIR = os.path.join(CAPTURES_DIR, "comparisons")
REF_IMAGE_PATH = os.path.join(ROOT_DIR, "references", "images", "main-reference.png")

os.makedirs(COMPARISONS_DIR, exist_ok=True)

def create_side_by_side(img1_path, img2_path, out_path, title1="REFERENCE", title2="FINISH-B1 PRODUCTION"):
    if not os.path.exists(img1_path) or not os.path.exists(img2_path):
        print(f"Skipping {out_path}: missing input ({img1_path} or {img2_path})")
        return

    im1 = Image.open(img1_path).convert("RGB")
    im2 = Image.open(img2_path).convert("RGB")

    # Target height 1080
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

    # Paste images
    canvas.paste(im1_resized, (0, header_h))
    canvas.paste(im2_resized, (w1 + 20, header_h))

    # Divider
    draw.rectangle([w1, header_h, w1 + 20, total_h], fill=(30, 41, 59))

    # Draw header text
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
    print("GENERATING SIDE-BY-SIDE REFERENCE COMPARISONS")
    print("=" * 80)

    # 1. Desktop Home Raw Frame vs Main Reference
    desktop_raw = os.path.join(CAPTURES_DIR, "desktop-home", "raw-frame.png")
    out1 = os.path.join(COMPARISONS_DIR, "desktop-home-vs-reference.png")
    create_side_by_side(REF_IMAGE_PATH, desktop_raw, out1,
                        "VISUAL AUTHORITY (main-reference.png)",
                        "FINISH-B1 DESKTOP HOME (Blender EEVEE Raw Frame)")

    # 2. Desktop Home Browser Canvas vs Main Reference
    desktop_canvas = os.path.join(CAPTURES_DIR, "desktop-home", "browser-canvas.png")
    out2 = os.path.join(COMPARISONS_DIR, "browser-canvas-vs-reference.png")
    create_side_by_side(REF_IMAGE_PATH, desktop_canvas, out2,
                        "VISUAL AUTHORITY (main-reference.png)",
                        "FINISH-B1 BROWSER RUNTIME (Three.js WebGL Canvas)")

    # 3. Monitor Detail vs Main Reference
    monitor_raw = os.path.join(CAPTURES_DIR, "monitor-detail", "raw-frame.png")
    out3 = os.path.join(COMPARISONS_DIR, "monitor-detail-vs-reference.png")
    create_side_by_side(REF_IMAGE_PATH, monitor_raw, out3,
                        "VISUAL AUTHORITY (main-reference.png)",
                        "FINISH-B1 MONITOR DETAIL WORKSTATION (EEVEE Raw Frame)")

    # 4. Entry Vantage vs Main Reference
    entry_raw = os.path.join(CAPTURES_DIR, "entry", "raw-frame.png")
    out4 = os.path.join(COMPARISONS_DIR, "entry-vantage-vs-reference.png")
    create_side_by_side(REF_IMAGE_PATH, entry_raw, out4,
                        "VISUAL AUTHORITY (main-reference.png)",
                        "FINISH-B1 ENTRY DOORWAY VANTAGE (EEVEE Raw Frame)")

    # 5. Reverse Doorway vs Main Reference
    reverse_raw = os.path.join(CAPTURES_DIR, "reverse-doorway", "raw-frame.png")
    out5 = os.path.join(COMPARISONS_DIR, "reverse-doorway-vs-reference.png")
    create_side_by_side(REF_IMAGE_PATH, reverse_raw, out5,
                        "VISUAL AUTHORITY (main-reference.png)",
                        "FINISH-B1 REVERSE DOORWAY VANTAGE (EEVEE Raw Frame)")

    print("Comparisons generation complete!")

if __name__ == "__main__":
    main()
