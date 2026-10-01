#!/usr/bin/env python3
"""
Generate side-by-side identical-camera comparison composites between
Blender 5.2.2 LTS EEVEE-Next renders and Three.js r180 Browser WebGL captures.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
RENDERS_DIR = os.path.join(ROOT, "renders")
BROWSER_DIR = os.path.join(ROOT, "browser-parity")
REF_IMG = os.path.normpath(os.path.join(ROOT, "..", "..", "references", "images", "main-reference.png"))

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except IOError:
        return ImageFont.load_default()

def create_side_by_side(blender_path, browser_path, out_path, title, cam_desc):
    im_blender = Image.open(blender_path).convert("RGB")
    im_browser = Image.open(browser_path).convert("RGB")
    
    # Ensure same height
    target_h = max(im_blender.height, im_browser.height)
    if im_blender.height != target_h:
        w = int(im_blender.width * (target_h / im_blender.height))
        im_blender = im_blender.resize((w, target_h), Image.Resampling.LANCZOS)
    if im_browser.height != target_h:
        w = int(im_browser.width * (target_h / im_browser.height))
        im_browser = im_browser.resize((w, target_h), Image.Resampling.LANCZOS)
        
    pad = 20
    header_h = 90
    footer_h = 40
    total_w = im_blender.width + im_browser.width + (pad * 3)
    total_h = target_h + header_h + footer_h + (pad * 2)
    
    canvas = Image.new("RGB", (total_w, total_h), (15, 18, 26))
    draw = ImageDraw.Draw(canvas)
    
    font_title = get_font(28)
    font_sub = get_font(18)
    font_label = get_font(22)
    font_foot = get_font(14)
    
    # Header
    draw.text((pad, 16), f"YOR WORLD — IDENTICAL-CAMERA PARITY: {title.upper()}", fill=(56, 189, 248), font=font_title)
    draw.text((pad, 54), f"Camera Specification: {cam_desc}", fill=(148, 163, 184), font=font_sub)
    
    # Images placement
    y_img = header_h + pad
    x_blender = pad
    x_browser = pad * 2 + im_blender.width
    
    canvas.paste(im_blender, (x_blender, y_img))
    canvas.paste(im_browser, (x_browser, y_img))
    
    # Borders
    draw.rectangle([x_blender, y_img, x_blender + im_blender.width - 1, y_img + target_h - 1], outline=(51, 65, 85), width=2)
    draw.rectangle([x_browser, y_img, x_browser + im_browser.width - 1, y_img + target_h - 1], outline=(51, 65, 85), width=2)
    
    # Overlays
    badge_pad = 8
    badge_h = 32
    # Blender badge
    draw.rectangle([x_blender + 12, y_img + 12, x_blender + 360, y_img + 12 + badge_h], fill=(15, 23, 42))
    draw.rectangle([x_blender + 12, y_img + 12, x_blender + 360, y_img + 12 + badge_h], outline=(249, 115, 22), width=1)
    draw.text((x_blender + 20, y_img + 16), "BLENDER 5.2.2 LTS (EEVEE-NEXT)", fill=(249, 115, 22), font=font_label)
    
    # Browser badge
    draw.rectangle([x_browser + 12, y_img + 12, x_browser + 420, y_img + 12 + badge_h], fill=(15, 23, 42))
    draw.rectangle([x_browser + 12, y_img + 12, x_browser + 420, y_img + 12 + badge_h], outline=(56, 189, 248), width=1)
    draw.text((x_browser + 20, y_img + 16), "THREE.JS r180 BROWSER WEBGL RUNTIME", fill=(56, 189, 248), font=font_label)
    
    # Footer
    draw.text((pad, total_h - footer_h + 10), "G1 Invariants: Meters / Y-up | ACESFilmic Tone Mapping | Zero blowout on ivory desk (#EDEAE7) | Strict Khronos glTF 2.0 PBR", fill=(100, 116, 139), font=font_foot)
    
    canvas.save(out_path, "PNG", quality=95)
    print(f"Generated comparison: {out_path} ({total_w}x{total_h})")

def create_triptych(ref_path, blender_path, browser_path, out_path):
    im_ref = Image.open(ref_path).convert("RGB")
    im_blender = Image.open(blender_path).convert("RGB")
    im_browser = Image.open(browser_path).convert("RGB")
    
    target_h = 1000
    w_ref = int(im_ref.width * (target_h / im_ref.height))
    w_ble = int(im_blender.width * (target_h / im_blender.height))
    w_bro = int(im_browser.width * (target_h / im_browser.height))
    
    im_ref = im_ref.resize((w_ref, target_h), Image.Resampling.LANCZOS)
    im_blender = im_blender.resize((w_ble, target_h), Image.Resampling.LANCZOS)
    im_browser = im_browser.resize((w_bro, target_h), Image.Resampling.LANCZOS)
    
    pad = 20
    header_h = 90
    footer_h = 40
    total_w = w_ref + w_ble + w_bro + (pad * 4)
    total_h = target_h + header_h + footer_h + (pad * 2)
    
    canvas = Image.new("RGB", (total_w, total_h), (15, 18, 26))
    draw = ImageDraw.Draw(canvas)
    
    font_title = get_font(28)
    font_sub = get_font(18)
    font_label = get_font(20)
    font_foot = get_font(14)
    
    draw.text((pad, 16), "YOR WORLD — VISUAL AUTHORITY TRIPTYCH COMPARISON", fill=(56, 189, 248), font=font_title)
    draw.text((pad, 54), "Reference Authority vs Blender 5.2.2 EEVEE-Next vs Three.js r180 Browser Runtime (1504x1128 Reference Match Camera)", fill=(148, 163, 184), font=font_sub)
    
    y_img = header_h + pad
    x1 = pad
    x2 = x1 + w_ref + pad
    x3 = x2 + w_ble + pad
    
    canvas.paste(im_ref, (x1, y_img))
    canvas.paste(im_blender, (x2, y_img))
    canvas.paste(im_browser, (x3, y_img))
    
    badge_h = 30
    # Ref badge
    draw.rectangle([x1 + 12, y_img + 12, x1 + 320, y_img + 12 + badge_h], fill=(15, 23, 42))
    draw.rectangle([x1 + 12, y_img + 12, x1 + 320, y_img + 12 + badge_h], outline=(168, 85, 247), width=1)
    draw.text((x1 + 20, y_img + 16), "1. VISUAL REFERENCE AUTHORITY", fill=(168, 85, 247), font=font_label)
    
    # Blender badge
    draw.rectangle([x2 + 12, y_img + 12, x2 + 340, y_img + 12 + badge_h], fill=(15, 23, 42))
    draw.rectangle([x2 + 12, y_img + 12, x2 + 340, y_img + 12 + badge_h], outline=(249, 115, 22), width=1)
    draw.text((x2 + 20, y_img + 16), "2. BLENDER 5.2.2 EEVEE-NEXT", fill=(249, 115, 22), font=font_label)
    
    # Browser badge
    draw.rectangle([x3 + 12, y_img + 12, x3 + 380, y_img + 12 + badge_h], fill=(15, 23, 42))
    draw.rectangle([x3 + 12, y_img + 12, x3 + 380, y_img + 12 + badge_h], outline=(56, 189, 248), width=1)
    draw.text((x3 + 20, y_img + 16), "3. THREE.JS BROWSER WEBGL", fill=(56, 189, 248), font=font_label)
    
    draw.text((pad, total_h - footer_h + 10), "Demonstrates preservation of visual hierarchy: bright ivory workstation, cobalt/white chair, pink hex glow, cyan floor bounce, 3200K amber task downlight", fill=(100, 116, 139), font=font_foot)
    
    canvas.save(out_path, "PNG", quality=95)
    print(f"Generated triptych comparison: {out_path} ({total_w}x{total_h})")

def main():
    # 1. Reference Camera Comparison
    create_side_by_side(
        os.path.join(RENDERS_DIR, "01-reference-workstation.png"),
        os.path.join(BROWSER_DIR, "browser-reference-workstation.png"),
        os.path.join(ROOT, "comparison-camera-reference.png"),
        "Reference Match Framing",
        "Position (-1.95, 2.10, 1.55) | Target (0.22, 0.90, -1.15) | FOV 52.0° | Resolution 1504×1128"
    )
    
    # 2. Home Desktop Camera Comparison
    create_side_by_side(
        os.path.join(RENDERS_DIR, "02-home-desktop.png"),
        os.path.join(BROWSER_DIR, "browser-home-desktop.png"),
        os.path.join(ROOT, "comparison-camera-home-desktop.png"),
        "Home Desktop UI Perspective",
        "Position (-2.15, 1.70, 1.55) | Target (0.12, 1.25, -1.15) | FOV 60.0° | Resolution 1920×1080"
    )
    
    # 3. Monitor Detail Camera Comparison
    create_side_by_side(
        os.path.join(RENDERS_DIR, "04-monitor-detail.png"),
        os.path.join(BROWSER_DIR, "browser-monitor-detail.png"),
        os.path.join(ROOT, "comparison-camera-monitor-detail.png"),
        "Monitor & Task Area Detail",
        "Position (0.00, 1.18, -0.52) | Target (0.00, 1.10, -1.36) | FOV 46.0° | Resolution 1920×1080"
    )
    
    # 4. Authority Triptych
    if os.path.exists(REF_IMG):
        create_triptych(
            REF_IMG,
            os.path.join(RENDERS_DIR, "01-reference-workstation.png"),
            os.path.join(BROWSER_DIR, "browser-reference-workstation.png"),
            os.path.join(ROOT, "comparison-visual-authority-triptych.png")
        )

if __name__ == "__main__":
    main()
