"""Generates genuine small image fixtures for SCP-04 regressions using Pillow encoders.

Run: python generate-image-fixtures.py <output-dir>
Every output is produced by a real encoder (libpng / libjpeg / libwebp via Pillow),
then re-opened and fully decoded by Pillow (Image.load) as an independent oracle.
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, features, __version__ as pil_version

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)


def gradient(width, height, mode="RGB"):
    img = Image.new("RGBA", (width, height))
    px = img.load()
    for y in range(height):
        for x in range(width):
            px[x, y] = ((x * 255) // max(1, width - 1), (y * 255) // max(1, height - 1), 128, 160 + (x % 4) * 20)
    return img.convert(mode)


fixtures = []


def save(name, img, fmt, **kwargs):
    path = out / name
    img.save(path, fmt, **kwargs)
    with Image.open(path) as check:
        check.load()  # full decode oracle
        size = check.size
        fmt_seen = check.format
    data = path.read_bytes()
    fixtures.append({
        "file": name,
        "format": fmt_seen,
        "width": size[0],
        "height": size[1],
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "encoderArgs": {k: v for k, v in kwargs.items()},
        "pillowFullDecode": "PASS",
    })


save("valid-rgba-16x12.png", gradient(16, 12, "RGBA"), "PNG", optimize=False)
save("valid-rgb-16x12.jpg", gradient(16, 12, "RGB"), "JPEG", quality=85)
save("valid-progressive-24x18.jpg", gradient(24, 18, "RGB"), "JPEG", quality=80, progressive=True)
save("valid-lossy-16x12.webp", gradient(16, 12, "RGB"), "WEBP", quality=80, method=4)
save("valid-lossless-16x12.webp", gradient(16, 12, "RGBA"), "WEBP", lossless=True)
save("valid-alpha-lossy-16x12.webp", gradient(16, 12, "RGBA"), "WEBP", quality=80, method=4)
# Dimension-boundary fixtures: genuine, highly compressible single-colour images.
save("valid-boundary-8192x2.png", Image.new("L", (8192, 2), 200), "PNG", optimize=True)
save("invalid-width-8193x1.png", Image.new("L", (8193, 1), 200), "PNG", optimize=True)
save("invalid-pixels-4097x4097.png", Image.new("1", (4097, 4097), 1), "PNG", optimize=True)

manifest = {
    "generator": "generate-image-fixtures.py",
    "pillow": pil_version,
    "codecs": {
        "libjpeg_turbo": features.version("libjpeg_turbo"),
        "zlib": features.version("zlib"),
        "webp": features.version("webp"),
    },
    "fixtures": fixtures,
}
(out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2))
