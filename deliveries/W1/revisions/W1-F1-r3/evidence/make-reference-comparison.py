"""
YOR WORLD - W1-F1-r3 Reference Comparison Image Assembler
Script: make-reference-comparison.py
Author: W1 Room Correction Worker (Gemini Pro)
Purpose: Generate side-by-side visual comparison between main-reference.png and W1-F1-r3 renders.
"""

import os
from PIL import Image, ImageDraw, ImageFont

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../.."))
    ref_path = os.path.join(root, "references/images/main-reference.png")
    renders_dir = os.path.join(root, "deliveries/W1/revisions/W1-F1-r3/renders")
    color_path = os.path.join(renders_dir, "reference-match.png")
    if not os.path.exists(color_path):
        color_path = os.path.join(renders_dir, "camera-home.png")
    gray_path = os.path.join(renders_dir, "reference-match-gray.png")
    if not os.path.exists(gray_path):
        gray_path = os.path.join(renders_dir, "camera-home-gray.png")

    out_comp1 = os.path.join(root, "deliveries/W1/revisions/W1-F1-r3/reference-comparison.png")
    out_comp2 = os.path.join(renders_dir, "reference-comparison.png")

    print(f"Loading reference image from {ref_path}...")
    img_ref = Image.open(ref_path).convert("RGB")
    print(f"Loading color render from {color_path}...")
    img_color = Image.open(color_path).convert("RGB")
    print(f"Loading gray render from {gray_path}...")
    img_gray = Image.open(gray_path).convert("RGB")

    # Target height for uniform panels
    target_h = 1080
    w_ref = int(img_ref.width * (target_h / img_ref.height))
    img_ref_resized = img_ref.resize((w_ref, target_h), Image.Resampling.LANCZOS)

    w_col = int(img_color.width * (target_h / img_color.height))
    img_col_resized = img_color.resize((w_col, target_h), Image.Resampling.LANCZOS)

    w_gry = int(img_gray.width * (target_h / img_gray.height))
    img_gry_resized = img_gray.resize((w_gry, target_h), Image.Resampling.LANCZOS)

    header_h = 60
    total_w = w_ref + w_col + w_gry + 40 # 20px gaps
    total_h = target_h + header_h + 20

    comp = Image.new("RGB", (total_w, total_h), (22, 22, 28))
    draw = ImageDraw.Draw(comp)

    # Place images
    comp.paste(img_ref_resized, (10, header_h))
    comp.paste(img_col_resized, (10 + w_ref + 10, header_h))
    comp.paste(img_gry_resized, (10 + w_ref + 10 + w_col + 10, header_h))

    # Add text labels
    draw.text((15, 20), "Primary Visual Authority (main-reference.png)", fill=(240, 240, 245))
    draw.text((25 + w_ref, 20), "W1-F1-r3 Color Blockout (Stylized Palette, Unclipped)", fill=(240, 240, 245))
    draw.text((35 + w_ref + w_col, 20), "W1-F1-r3 Clay Pass (Geometry & Clearance Proof)", fill=(240, 240, 245))

    comp.save(out_comp1, quality=95)
    comp.save(out_comp2, quality=95)
    print(f"Saved comparison composite to {out_comp1} and {out_comp2} ({total_w}x{total_h})")

if __name__ == "__main__":
    main()
