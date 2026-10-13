"""Generate the authored slotted pegboard finish for art attempt 11.

This is a procedural, project-authored texture. It uses no copied reference
pixels. Pillow is only required to regenerate the checked-in PNG.
"""
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).parent
OUTPUT = ROOT / "textures" / "pegboard-pattern-attempt-11.png"
SCALE = 3
SIZE = 512


def main():
    rng = random.Random(20261011)
    canvas = Image.new("RGB", (SIZE * SCALE, SIZE * SCALE), (207, 216, 231))
    pixels = canvas.load()
    for y in range(canvas.height):
        row = y // (52 * SCALE)
        shade = (row % 2) * 3
        for x in range(canvas.width):
            column = x // (46 * SCALE)
            grain = rng.randint(-2, 2)
            pixels[x, y] = (207 + shade + grain, 216 + shade + grain,
                            231 + shade + grain)

    draw = ImageDraw.Draw(canvas)
    pitch_x, pitch_y = 46 * SCALE, 48 * SCALE
    slot_w, slot_h = 10 * SCALE, 24 * SCALE
    for row in range(10):
        for col in range(11):
            cx = 22 * SCALE + col * pitch_x
            cy = 18 * SCALE + row * pitch_y
            left, top = cx - slot_w // 2, cy - slot_h // 2
            right, bottom = cx + slot_w // 2, cy + slot_h // 2
            # Subtle cool rim and recessed dark slot with a softer inner edge.
            draw.rounded_rectangle((left - SCALE, top - SCALE, right + SCALE, bottom + SCALE),
                                   radius=slot_w // 2 + SCALE,
                                   fill=(185, 199, 221))
            draw.rounded_rectangle((left, top, right, bottom), radius=slot_w // 2,
                                   fill=(83, 91, 119))
            draw.line((left + SCALE, top + 3 * SCALE, left + SCALE, bottom - 3 * SCALE),
                     fill=(62, 69, 94), width=SCALE)

    # Fine satin grain and gentle edge falloff keep the board from reading as
    # a flat white card at the scene's normal viewing distance.
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=0.22 * SCALE))
    canvas = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    canvas.save(OUTPUT, format="PNG", optimize=True)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
