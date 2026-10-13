"""Generate a deterministic blue carpet microtexture with no external assets."""
from pathlib import Path
import math
import random
import struct
import zlib

SIZE = 256
OUTPUT = Path(__file__).parent / "textures" / "floor-carpet-microtexture.png"


def chunk(kind: bytes, payload: bytes) -> bytes:
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def main() -> None:
    if OUTPUT.exists():
        raise FileExistsError(f"Refusing to replace existing source texture: {OUTPUT}")
    rng = random.Random(20261011)
    rows = bytearray()
    for y in range(SIZE):
        rows.append(0)  # PNG filter: none
        for x in range(SIZE):
            # Low-contrast strands and cross-fiber flecks soften the old plank pattern.
            grain = rng.randrange(-5, 6)
            wave = round(2.0 * math.sin((x * 2 + y) * math.tau / 17.0))
            strand = 3 if (x + 2 * y) % 31 in (0, 1) else -1 if (x + 2 * y) % 31 == 2 else 0
            blue = 67 + grain + wave + strand
            red = 24 + grain // 2 + strand // 2
            green = 40 + grain + wave // 2
            rows.extend((max(0, min(255, red)), max(0, min(255, green)), max(0, min(255, blue))))
    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("xb") as handle:
        handle.write(png)
    print(f"Wrote deterministic {SIZE}x{SIZE} RGB blue-carpet texture: {OUTPUT} ({len(png)} bytes)")


if __name__ == "__main__":
    main()
