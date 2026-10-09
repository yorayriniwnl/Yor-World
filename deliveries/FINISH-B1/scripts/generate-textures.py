"""
Procedural Texture Generator for YOR WORLD FINISH-B1 (World / Art Maker)
Generates 100% synthetic, deterministic procedural textures without any third-party or licensed assets.
Seed: 42
"""

import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = Path(__file__).parent.resolve()
TEXTURES_DIR = SCRIPT_DIR.parent / "assets" / "textures"
TEXTURES_DIR.mkdir(parents=True, exist_ok=True)


def generate_blue_carpet():
    """Generates deep rich blue carpet/rug texture matching main-reference.png."""
    random.seed(42)
    w, h = 512, 512
    img = Image.new("RGB", (w, h), (26, 36, 74))
    draw = ImageDraw.Draw(img)

    # 1. Subtle broad gradient / mottling across carpet
    mottle = Image.new("RGB", (w, h), (0, 0, 0))
    m_draw = ImageDraw.Draw(mottle)
    for _ in range(80):
        bx = random.randint(0, w)
        by = random.randint(0, h)
        rad = random.randint(40, 120)
        shade = random.randint(20, 45)
        blue_val = int(shade * 1.6)
        m_draw.ellipse([bx - rad, by - rad, bx + rad, by + rad], fill=(shade // 2, shade // 2, blue_val))
    mottle = mottle.filter(ImageFilter.GaussianBlur(radius=25))
    img = Image.blend(img, mottle, 0.45)

    # 2. Fine carpet pile / stippled fiber weave
    pile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(pile)
    for _ in range(12000):
        px = random.randint(0, w - 1)
        py = random.randint(0, h - 1)
        is_highlight = random.random() < 0.35
        if is_highlight:
            c = (random.randint(45, 75), random.randint(65, 110), random.randint(120, 175), random.randint(60, 140))
        else:
            c = (random.randint(10, 20), random.randint(14, 28), random.randint(35, 55), random.randint(80, 160))
        p_draw.point((px, py), fill=c)
        if random.random() < 0.2:
            p_draw.line([(px, py), (px + random.choice([-1, 1]), py + random.choice([-1, 1]))], fill=c)

    img.paste(pile, (0, 0), pile)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))

    target_path = TEXTURES_DIR / "floor-carpet-blue.png"
    img.save(target_path, "PNG", optimize=True)
    print(f"Generated blue carpet texture: {target_path} ({target_path.stat().st_size} bytes)")


def generate_monitor_wallpaper():
    """Generates cosmic nebula wallpaper with twin glowing controllers matching main-reference.png."""
    random.seed(42)
    w, h = 1024, 512
    img = Image.new("RGBA", (w, h), (12, 8, 30, 255))

    nebula = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    neb_draw = ImageDraw.Draw(nebula)
    blobs = [
        (w * 0.48, h * 0.48, 280, (235, 60, 215, 190)),
        (w * 0.52, h * 0.52, 260, (170, 45, 245, 170)),
        (w * 0.32, h * 0.60, 220, (85, 25, 210, 150)),
        (w * 0.68, h * 0.38, 230, (255, 95, 185, 180)),
        (w * 0.50, h * 0.36, 170, (130, 220, 255, 130)),
        (w * 0.18, h * 0.28, 150, (190, 55, 230, 100)),
        (w * 0.82, h * 0.72, 160, (75, 165, 255, 100)),
    ]
    for bx, by, r, col in blobs:
        for step in range(r, 0, -12):
            alpha = int(col[3] * (1.0 - (step / r) ** 0.7))
            c = (col[0], col[1], col[2], alpha)
            neb_draw.ellipse([bx - step, by - step, bx + step, by + step], fill=c)

    nebula = nebula.filter(ImageFilter.GaussianBlur(radius=28))
    img.alpha_composite(nebula)

    stars = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    star_draw = ImageDraw.Draw(stars)
    for _ in range(700):
        sx = random.randint(0, w - 1)
        sy = random.randint(0, h - 1)
        brightness = random.randint(140, 255)
        size = random.choice([1, 1, 1, 1, 2, 2, 3])
        tint = random.choice([(255, 255, 255), (240, 210, 255), (210, 240, 255), (255, 200, 240)])
        star_draw.ellipse([sx - size, sy - size, sx + size, sy + size], fill=(*tint, brightness))

    for _ in range(14):
        sx = random.randint(50, w - 50)
        sy = random.randint(30, h - 30)
        spike = random.randint(6, 16)
        star_draw.line([sx - spike, sy, sx + spike, sy], fill=(255, 255, 255, 210), width=1)
        star_draw.line([sx, sy - spike, sx, sy + spike], fill=(255, 255, 255, 210), width=1)
        star_draw.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(255, 255, 255, 255))
    img.alpha_composite(stars)

    ctrl_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def draw_stylized_controller(cx, cy, scale=1.0, angle_deg=0):
        c_img = Image.new("RGBA", (320, 240), (0, 0, 0, 0))
        d = ImageDraw.Draw(c_img)
        d.rounded_rectangle([30, 30, 290, 210], radius=50, fill=(240, 180, 255, 45))
        d.rounded_rectangle([40, 40, 280, 200], radius=45, fill=(255, 255, 255, 240))
        d.rounded_rectangle([70, 70, 250, 180], radius=35, fill=(220, 80, 230, 160))
        d.rounded_rectangle([80, 80, 240, 170], radius=30, fill=(40, 18, 60, 240))
        d.polygon([(40, 90), (10, 210), (70, 230), (100, 160)], fill=(248, 248, 255, 255))
        d.polygon([(280, 90), (310, 210), (250, 230), (220, 160)], fill=(248, 248, 255, 255))
        d.polygon([(25, 160), (15, 205), (65, 222), (55, 175)], fill=(180, 60, 210, 220))
        d.polygon([(295, 160), (305, 205), (255, 222), (265, 175)], fill=(180, 60, 210, 220))
        d.rounded_rectangle([110, 85, 210, 135], radius=10, fill=(255, 255, 255, 255), outline=(220, 100, 250, 255), width=2)
        d.line([125, 100, 195, 100], fill=(220, 100, 250, 255), width=2)
        d.rectangle([75, 115, 95, 135], fill=(255, 255, 255, 255))
        d.rectangle([80, 110, 90, 140], fill=(255, 255, 255, 255))
        d.ellipse([225, 110, 237, 122], fill=(255, 120, 220, 255))
        d.ellipse([240, 125, 252, 137], fill=(120, 220, 255, 255))
        d.ellipse([225, 140, 237, 152], fill=(255, 220, 100, 255))
        d.ellipse([210, 125, 222, 137], fill=(120, 255, 180, 255))
        d.ellipse([100, 150, 132, 182], fill=(255, 255, 255, 255), outline=(200, 80, 240, 255), width=2)
        d.ellipse([188, 150, 220, 182], fill=(255, 255, 255, 255), outline=(200, 80, 240, 255), width=2)
        d.ellipse([108, 158, 124, 174], fill=(80, 30, 110, 255))
        d.ellipse([196, 158, 212, 174], fill=(80, 30, 110, 255))

        if angle_deg != 0:
            c_img = c_img.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
        if scale != 1.0:
            nw = int(c_img.width * scale)
            nh = int(c_img.height * scale)
            c_img = c_img.resize((nw, nh), resample=Image.LANCZOS)
        ctrl_layer.alpha_composite(c_img, (int(cx - c_img.width / 2), int(cy - c_img.height / 2)))

    draw_stylized_controller(w * 0.40, h * 0.48, scale=0.88, angle_deg=10)
    draw_stylized_controller(w * 0.60, h * 0.48, scale=0.88, angle_deg=-12)
    img.alpha_composite(ctrl_layer)

    badge = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge)
    bx, by = int(w * 0.78), int(h * 0.82)
    hex_pts = []
    hr = 16
    for i in range(6):
        a = i * math.pi / 3
        hex_pts.append((bx + hr * math.cos(a), by + hr * math.sin(a)))
    bdraw.polygon(hex_pts, outline=(240, 160, 255, 220), width=2)
    bdraw.text((bx + 26, by - 10), "HEX GAMING", fill=(255, 255, 255, 220))
    bdraw.text((bx + 26, by + 4), "CUSTOM LAB 2026", fill=(180, 160, 220, 180))
    img.alpha_composite(badge)

    target_path = TEXTURES_DIR / "monitor-wallpaper.png"
    img.save(target_path, "PNG", optimize=True)
    print(f"Generated monitor wallpaper: {target_path} ({target_path.stat().st_size} bytes)")


def generate_desk_mat_pattern():
    """Generates clean monochrome topographic contour line pattern."""
    w, h = 1024, 512
    img = Image.new("RGB", (w, h), (246, 246, 250))
    draw = ImageDraw.Draw(img)

    num_lines = 48
    for i in range(num_lines):
        pts = []
        base_y = (i / num_lines) * (h + 160) - 80
        freq1 = 0.008 + (i % 5) * 0.002
        freq2 = 0.015 + (i % 3) * 0.003
        phase = i * 0.45
        for x in range(0, w + 10, 8):
            y = (base_y +
                 math.sin(x * freq1 + phase) * 36.0 +
                 math.cos(x * freq2 - phase * 0.7) * 22.0 +
                 math.sin(x * 0.003 + (i * 17) % 31 * 0.1) * 40.0)
            pts.append((x, y))

        width = 2 if i % 4 == 0 else 1
        gray = 25 if i % 4 == 0 else (70 if i % 2 == 0 else 140)
        draw.line(pts, fill=(gray, gray, gray), width=width)

    draw.rounded_rectangle([6, 6, w - 7, h - 7], radius=24, outline=(40, 40, 45), width=3)
    draw.rounded_rectangle([12, 12, w - 13, h - 13], radius=18, outline=(180, 180, 185), width=1)
    draw.text((w - 180, h - 38), "TOPOGRAPHY LABS // PRO", fill=(50, 50, 55))

    target_path = TEXTURES_DIR / "desk-mat-pattern.png"
    img.save(target_path, "PNG", optimize=True)
    print(f"Generated desk mat pattern: {target_path} ({target_path.stat().st_size} bytes)")


def draw_7seg_time(time_str, subtext=""):
    """Helper to render glowing cyan 7-segment digital clock display."""
    w, h = 512, 256
    img = Image.new("RGBA", (w, h), (8, 14, 28, 255))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([8, 8, w - 9, h - 9], radius=20, outline=(30, 45, 65, 255), width=4)
    draw.rounded_rectangle([16, 16, w - 17, h - 17], radius=14, outline=(18, 28, 42, 255), width=2)

    seg_digits = {
        '0': [1, 1, 1, 1, 1, 1, 0],
        '1': [0, 1, 1, 0, 0, 0, 0],
        '2': [1, 1, 0, 1, 1, 0, 1],
        '3': [1, 1, 1, 1, 0, 0, 1],
        '4': [0, 1, 1, 0, 0, 1, 1],
        '5': [1, 0, 1, 1, 0, 1, 1],
        '6': [1, 0, 1, 1, 1, 1, 1],
        '7': [1, 1, 1, 0, 0, 0, 0],
        '8': [1, 1, 1, 1, 1, 1, 1],
        '9': [1, 1, 1, 1, 0, 1, 1],
        ' ': [0, 0, 0, 0, 0, 0, 0],
    }

    def draw_digit(x0, y0, dw, dh, digit_char):
        segs = seg_digits.get(digit_char, [0]*7)
        t = 12
        hw = dw // 2
        hh = dh // 2
        cyan_lit = (0, 245, 255, 255)
        cyan_dim = (12, 38, 55, 255)

        draw.polygon([(x0 + t, y0), (x0 + dw - t, y0), (x0 + dw - 2*t, y0 + t), (x0 + 2*t, y0 + t)],
                     fill=cyan_lit if segs[0] else cyan_dim)
        draw.polygon([(x0 + dw, y0 + t), (x0 + dw, y0 + hh - t//2), (x0 + dw - t, y0 + hh - t), (x0 + dw - t, y0 + 2*t)],
                     fill=cyan_lit if segs[1] else cyan_dim)
        draw.polygon([(x0 + dw, y0 + hh + t//2), (x0 + dw, y0 + dh - t), (x0 + dw - t, y0 + dh - 2*t), (x0 + dw - t, y0 + hh + t)],
                     fill=cyan_lit if segs[2] else cyan_dim)
        draw.polygon([(x0 + t, y0 + dh), (x0 + dw - t, y0 + dh), (x0 + dw - 2*t, y0 + dh - t), (x0 + 2*t, y0 + dh - t)],
                     fill=cyan_lit if segs[3] else cyan_dim)
        draw.polygon([(x0, y0 + hh + t//2), (x0, y0 + dh - t), (x0 + t, y0 + dh - 2*t), (x0 + t, y0 + hh + t)],
                     fill=cyan_lit if segs[4] else cyan_dim)
        draw.polygon([(x0, y0 + t), (x0, y0 + hh - t//2), (x0 + t, y0 + hh - t), (x0 + t, y0 + 2*t)],
                     fill=cyan_lit if segs[5] else cyan_dim)
        draw.polygon([(x0 + t, y0 + hh), (x0 + 2*t, y0 + hh - t//2), (x0 + dw - 2*t, y0 + hh - t//2),
                      (x0 + dw - t, y0 + hh), (x0 + dw - 2*t, y0 + hh + t//2), (x0 + 2*t, y0 + hh + t//2)],
                     fill=cyan_lit if segs[6] else cyan_dim)

    y_top = 46
    d_width = 64
    d_height = 130

    d1, d2, _, d3, d4 = time_str
    draw_digit(45, y_top, d_width, d_height, d1)
    draw_digit(135, y_top, d_width, d_height, d2)

    draw.rectangle([226, y_top + 34, 242, y_top + 50], fill=(0, 245, 255, 255))
    draw.rectangle([226, y_top + 80, 242, y_top + 96], fill=(0, 245, 255, 255))

    draw_digit(265, y_top, d_width, d_height, d3)
    draw_digit(355, y_top, d_width, d_height, d4)

    if subtext:
        draw.text((435, y_top + 30), subtext, fill=(0, 230, 255, 240))
        draw.text((435, y_top + 80), "IST", fill=(0, 180, 220, 200))

    glow = img.filter(ImageFilter.GaussianBlur(radius=7))
    return Image.alpha_composite(glow, img)


def generate_clock_textures():
    """Generates standard, 12h, and 24h desk clock textures."""
    clk_24 = draw_7seg_time("17:49", subtext="24H")
    p24 = TEXTURES_DIR / "clock-display-24h.png"
    clk_24.save(p24, "PNG", optimize=True)

    clk_12 = draw_7seg_time("05:49", subtext="PM")
    p12 = TEXTURES_DIR / "clock-display-12h.png"
    clk_12.save(p12, "PNG", optimize=True)

    clk_def = draw_7seg_time("17:49", subtext="IST")
    pdef = TEXTURES_DIR / "clock-display.png"
    clk_def.save(pdef, "PNG", optimize=True)

    print(f"Generated clock textures: 24h, 12h, default ({pdef.stat().st_size} bytes)")


def generate_pegboard_pattern():
    """Generates white pegboard texture with circular perforations."""
    w, h = 512, 512
    img = Image.new("RGBA", (w, h), (245, 245, 248, 255))
    draw = ImageDraw.Draw(img)

    grid_spacing = 32
    hole_radius = 6
    for y in range(grid_spacing // 2, h, grid_spacing):
        for x in range(grid_spacing // 2, w, grid_spacing):
            draw.ellipse([x - hole_radius - 1, y - hole_radius - 1, x + hole_radius + 1, y + hole_radius + 1],
                         fill=(205, 205, 215, 255))
            draw.ellipse([x - hole_radius, y - hole_radius, x + hole_radius, y + hole_radius],
                         fill=(45, 45, 55, 255))
            draw.arc([x - hole_radius, y - hole_radius, x + hole_radius, y + hole_radius],
                     start=0, end=180, fill=(255, 255, 255, 200), width=1)

    target_path = TEXTURES_DIR / "pegboard-pattern.png"
    img.save(target_path, "PNG", optimize=True)
    print(f"Generated pegboard pattern: {target_path} ({target_path.stat().st_size} bytes)")


def generate_acoustic_panel():
    """Generates 3D diamond/pyramid acoustic tile pattern for monitor backboard."""
    w, h = 512, 512
    img = Image.new("RGB", (w, h), (232, 230, 240))
    draw = ImageDraw.Draw(img)

    tile_size = 64
    for ty in range(0, h, tile_size):
        for tx in range(0, w, tile_size):
            cx = tx + tile_size // 2
            cy = ty + tile_size // 2
            draw.polygon([(tx, ty), (tx + tile_size, ty), (cx, cy)], fill=(248, 248, 255))
            draw.polygon([(tx + tile_size, ty), (tx + tile_size, ty + tile_size), (cx, cy)], fill=(228, 225, 238))
            draw.polygon([(tx + tile_size, ty + tile_size), (tx, ty + tile_size), (cx, cy)], fill=(198, 195, 208))
            draw.polygon([(tx + tile_size, ty), (tx, ty), (cx, cy)], fill=(218, 215, 228))

    target_path = TEXTURES_DIR / "acoustic-panel.png"
    img.save(target_path, "PNG", optimize=True)
    print(f"Generated acoustic panel pattern: {target_path} ({target_path.stat().st_size} bytes)")


def generate_wall_painting():
    """Generates abstract modern canvas art in cobalt blue, rose violet, cyan and gold accents."""
    random.seed(1337)
    w, h = 512, 512
    img = Image.new("RGBA", (w, h), (18, 22, 40, 255))
    draw = ImageDraw.Draw(img)

    points_poly1 = [(0, 0), (w, 0), (w, int(h * 0.45)), (0, int(h * 0.75))]
    draw.polygon(points_poly1, fill=(45, 30, 85, 255))

    points_poly2 = [(0, int(h * 0.40)), (w, int(h * 0.15)), (w, int(h * 0.85)), (0, h)]
    draw.polygon(points_poly2, fill=(25, 75, 140, 255))

    draw.ellipse([w * 0.25, h * 0.20, w * 0.75, h * 0.70], outline=(240, 90, 200, 220), width=4)
    draw.ellipse([w * 0.35, h * 0.30, w * 0.65, h * 0.60], outline=(0, 230, 255, 220), width=3)

    draw.line([(w * 0.10, h * 0.85), (w * 0.90, h * 0.15)], fill=(245, 190, 80, 255), width=6)
    draw.line([(w * 0.15, h * 0.90), (w * 0.85, h * 0.20)], fill=(255, 220, 130, 180), width=2)

    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    vdraw.rectangle([0, 0, w, h], outline=(10, 10, 20, 160), width=16)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=8))
    img.alpha_composite(vignette)

    target_path = TEXTURES_DIR / "wall-painting.png"
    img.save(target_path, "PNG", optimize=True)
    print(f"Generated wall painting: {target_path} ({target_path.stat().st_size} bytes)")


if __name__ == "__main__":
    generate_blue_carpet()
    generate_monitor_wallpaper()
    generate_desk_mat_pattern()
    generate_clock_textures()
    generate_pegboard_pattern()
    generate_acoustic_panel()
    generate_wall_painting()
    print("All FINISH-B1 procedural textures generated successfully!")
