"""
YOR WORLD - Interactive Assets Texture Generator
Generates crisp, optimized procedural textures for interactive physical objects:
- Painting canvas artwork & hidden Yor signature mark
- Desk clock displays (12-hour AM/PM vs 24-hour IST format)
- Contact phone OLED screens (dark idle vs waking contact prompt)
- Monitor launcher interface screens (ambient wallpaper vs active launcher)
- Project props: Zenith circuit board, AI Real lens, PC RGB flow, Speaker cone
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path(__file__).parent.parent / "runtime" / "textures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def create_painting_artwork():
    """Create abstract modern art canvas matching studio palette."""
    w, h = 512, 512
    img = Image.new("RGBA", (w, h), (18, 16, 28, 255))
    draw = ImageDraw.Draw(img)
    
    # Modern gradient stripes and geometric blocks
    for y in range(h):
        r = int(18 + (y / h) * 45)
        g = int(16 + (y / h) * 20)
        b = int(28 + (y / h) * 65)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # Geometric neon lilac / cyan motifs
    draw.polygon([(80, 420), (256, 120), (432, 420)], fill=(80, 50, 110, 180), outline=(226, 136, 230, 240), width=3)
    draw.ellipse([(190, 180), (322, 312)], fill=(40, 140, 180, 140), outline=(116, 216, 243, 255), width=2)
    draw.rectangle([(140, 360), (372, 390)], fill=(241, 165, 243, 200))
    draw.line([(50, 256), (462, 256)], fill=(255, 255, 255, 120), width=1)
    draw.text((210, 440), "STUDIO COMPOSITION 01", fill=(200, 200, 220, 220))
    
    img.save(OUTPUT_DIR / "painting-artwork.png")
    print("Saved painting-artwork.png")

def create_hidden_yor_mark():
    """Create hidden Yor mark revealed behind wall painting."""
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Metal plate backing
    draw.rounded_rectangle([(20, 20), (236, 236)], radius=12, fill=(28, 28, 34, 255), outline=(185, 154, 245, 255), width=3)
    # Yor geometric logo mark
    draw.polygon([(128, 48), (200, 170), (56, 170)], outline=(116, 216, 243, 255), width=4)
    draw.line([(128, 48), (128, 170)], fill=(241, 165, 243, 255), width=3)
    draw.line([(88, 130), (168, 130)], fill=(241, 165, 243, 255), width=3)
    
    # Text caption
    draw.text((64, 185), "YOR WORLD // V1", fill=(255, 255, 255, 240))
    draw.text((58, 205), "SECRET RESIDENT MARK", fill=(116, 216, 243, 220))
    
    img.save(OUTPUT_DIR / "hidden-yor-mark.png")
    print("Saved hidden-yor-mark.png")

def create_clock_textures():
    """Create 12-hour and 24-hour digital clock display faces."""
    for mode, time_str, sub in [("24h", "14:30", "IST (UTC+5:30)"), ("12h", "02:30 PM", "IST (UTC+5:30)")]:
        w, h = 256, 128
        img = Image.new("RGBA", (w, h), (10, 12, 16, 255))
        draw = ImageDraw.Draw(img)
        
        # Subtle display bezel grid
        draw.rectangle([(4, 4), (w-5, h-5)], outline=(30, 45, 60, 255), width=2)
        
        # Digits (cyan LED glow)
        draw.text((28, 30), time_str, fill=(116, 216, 243, 255))
        draw.text((45, 80), sub, fill=(185, 154, 245, 220))
        
        img.save(OUTPUT_DIR / f"clock-display-{mode}.png")
        print(f"Saved clock-display-{mode}.png")

def create_phone_textures():
    """Create idle (dark OLED) and active (incoming contact prompt) phone screens."""
    w, h = 256, 512
    # Idle
    idle_img = Image.new("RGBA", (w, h), (8, 9, 12, 255))
    draw_idle = ImageDraw.Draw(idle_img)
    # Minimal status bar
    draw_idle.line([(30, 24), (226, 24)], fill=(40, 45, 55, 255), width=1)
    draw_idle.text((32, 12), "14:30", fill=(100, 110, 130, 255))
    draw_idle.text((180, 12), "100%", fill=(100, 110, 130, 255))
    idle_img.save(OUTPUT_DIR / "phone-screen-idle.png")
    print("Saved phone-screen-idle.png")
    
    # Active
    act_img = Image.new("RGBA", (w, h), (14, 16, 24, 255))
    draw_act = ImageDraw.Draw(act_img)
    draw_act.rounded_rectangle([(16, 100), (240, 400)], radius=16, fill=(24, 28, 42, 255), outline=(116, 216, 243, 255), width=2)
    draw_act.ellipse([(98, 140), (158, 200)], fill=(49, 109, 213, 255), outline=(241, 165, 243, 255), width=2)
    draw_act.text((116, 160), "✉", fill=(255, 255, 255, 255))
    draw_act.text((60, 230), "CONNECT WITH YOR", fill=(255, 255, 255, 255))
    draw_act.text((45, 260), "Tap to open Contact Form", fill=(185, 154, 245, 240))
    draw_act.rounded_rectangle([(40, 310), (216, 360)], radius=10, fill=(73, 109, 213, 255))
    draw_act.text((80, 325), "OPEN FORM", fill=(255, 255, 255, 255))
    act_img.save(OUTPUT_DIR / "phone-screen-active.png")
    print("Saved phone-screen-active.png")

def create_monitor_textures():
    """Create ambient wallpaper and active YOR launcher screen textures."""
    w, h = 1024, 512
    # Ambient wallpaper (deep space / synthwave grid)
    amb = Image.new("RGBA", (w, h), (10, 8, 20, 255))
    draw_amb = ImageDraw.Draw(amb)
    for y in range(h):
        r = int(10 + (y/h)*30)
        g = int(8 + (y/h)*20)
        b = int(20 + (y/h)*60)
        draw_amb.line([(0, y), (w, y)], fill=(r, g, b, 255))
    # Wireframe mountains & grid
    for x in range(0, w, 64):
        draw_amb.line([(x, 320), (x, h)], fill=(116, 216, 243, 60), width=1)
    for y in range(320, h, 24):
        draw_amb.line([(0, y), (w, y)], fill=(241, 165, 243, 80), width=1)
    draw_amb.text((420, 200), "YOR WORLD // AMBIENT WORKSTATION", fill=(200, 200, 240, 200))
    amb.save(OUTPUT_DIR / "monitor-screen-ambient.png")
    print("Saved monitor-screen-ambient.png")
    
    # Active launcher
    act = Image.new("RGBA", (w, h), (12, 14, 26, 255))
    draw_act = ImageDraw.Draw(act)
    draw_act.rectangle([(40, 40), (w-41, h-41)], outline=(116, 216, 243, 255), width=2)
    draw_act.text((60, 60), "⚡ YOR LAUNCHER // ACTIVE V1 CATALOG", fill=(241, 165, 243, 255))
    # 5 Project nodes
    projects = ["CandidateX", "Helios", "Zenith", "AI Real", "Yor Talks"]
    for i, p in enumerate(projects):
        bx = 70 + i * 180
        draw_act.rounded_rectangle([(bx, 150), (bx + 160, 350)], radius=8, fill=(25, 30, 50, 255), outline=(116, 216, 243, 200), width=1)
        draw_act.text((bx + 20, 180), f"PROJECT 0{i+1}", fill=(185, 154, 245, 255))
        draw_act.text((bx + 20, 220), p, fill=(255, 255, 255, 255))
        draw_act.text((bx + 20, 300), "Verified", fill=(116, 216, 243, 255))
    act.save(OUTPUT_DIR / "monitor-screen-active.png")
    print("Saved monitor-screen-active.png")

def create_project_prop_textures():
    """Create distinct visual patterns for Zenith, AI Camera, PC, and Speakers."""
    # Zenith clean energy PCB
    w, h = 256, 256
    zen = Image.new("RGBA", (w, h), (15, 30, 20, 255))
    d_zen = ImageDraw.Draw(zen)
    d_zen.rectangle([(10, 10), (w-11, h-11)], outline=(80, 180, 120, 255), width=2)
    # Solar trace
    d_zen.line([(30, 30), (120, 30), (120, 120), (220, 120)], fill=(255, 200, 60, 255), width=3)
    # Battery storage trace
    d_zen.line([(120, 120), (120, 220), (220, 220)], fill=(80, 220, 140, 255), width=3)
    d_zen.text((40, 50), "SOLAR", fill=(255, 200, 60, 255))
    d_zen.text((130, 140), "STORAGE", fill=(80, 220, 140, 255))
    d_zen.text((130, 190), "GRID", fill=(100, 200, 255, 255))
    zen.save(OUTPUT_DIR / "zenith-circuit.png")
    print("Saved zenith-circuit.png")
    
    # AI Camera lens reflection
    lens = Image.new("RGBA", (256, 256), (10, 10, 15, 255))
    d_lens = ImageDraw.Draw(lens)
    for r in range(120, 20, -10):
        d_lens.ellipse([(128-r, 128-r), (128+r, 128+r)], outline=(40 + r, 80 + r, 160 + int(r*0.6), 255), width=2)
    d_lens.ellipse([(90, 80), (130, 120)], fill=(200, 240, 255, 120))
    lens.save(OUTPUT_DIR / "ai-camera-lens.png")
    print("Saved ai-camera-lens.png")

if __name__ == "__main__":
    create_painting_artwork()
    create_hidden_yor_mark()
    create_clock_textures()
    create_phone_textures()
    create_monitor_textures()
    create_project_prop_textures()
    print("All interactive procedural textures generated successfully.")
