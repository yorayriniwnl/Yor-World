"""Copy immutable independent counterexamples; derive APNG chunk regressions."""
from pathlib import Path
import hashlib
import json
import struct
import sys
import zlib
from PIL import Image

source = Path(sys.argv[1])
target = Path(sys.argv[2])
target.mkdir(parents=True, exist_ok=True)
files = []


def save(name, data, provenance):
    (target / name).write_bytes(data)
    files.append({"name": name, "bytes": len(data),
                  "sha256": hashlib.sha256(data).hexdigest(), "provenance": provenance})


def chunk(kind, data):
    typed = kind.encode("ascii") + data
    return struct.pack(">I", len(data)) + typed + struct.pack(">I", zlib.crc32(typed))


for name in ["animated.png", "corrupt-second-frame.png", "animated.webp", "pixels-ok.png"]:
    save(name, (source / name).read_bytes(), {
        "kind": "byte-preserved copy of independent verification fixture",
        "source": "deliveries/G6/rc3-platform-independent-verification/reviewers/media/fixtures/" + name,
    })

image = Image.new("RGB", (17, 11))
image.putdata([(x * 13 % 256, y * 17 % 256, (x + y) * 19 % 256)
               for y in range(11) for x in range(17)])
image.save(target / "normal-rgb.png")
normal = (target / "normal-rgb.png").read_bytes()
save("normal-rgb.png", normal, {"kind": "new genuine RGB PNG", "generator": "Pillow " + Image.__version__})

animation = (source / "animated.png").read_bytes()
offset = 8
chunks = {}
while offset < len(animation):
    size = struct.unpack(">I", animation[offset:offset + 4])[0]
    kind = animation[offset + 4:offset + 8].decode("ascii")
    chunks.setdefault(kind, animation[offset + 8:offset + 8 + size])
    offset += size + 12

save("actl-only.png", normal[:33] + chunk("acTL", chunks["acTL"]) + normal[33:],
     {"kind": "valid-CRC acTL declaration inserted after IHDR; no frame chunks", "base": "normal-rgb.png", "chunkSource": "animated.png"})
for kind, name in [("fcTL", "orphan-fctl.png"), ("fdAT", "orphan-fdat.png")]:
    save(name, normal[:-12] + chunk(kind, chunks[kind]) + normal[-12:],
         {"kind": "valid-CRC orphan " + kind + " inserted after IDAT and before IEND; no acTL", "base": "normal-rgb.png", "chunkSource": "animated.png"})
save("truncated-fdat.png", normal[:-12] + struct.pack(">I", 75) + b"fdAT" + b"\x00\x00\x00",
     {"kind": "orphan fdAT with truncated declared data and no CRC/IEND", "base": "normal-rgb.png"})

(target / "manifest.json").write_text(json.dumps({
    "scope": "SCP-04 V1 still-image-only media correction",
    "independentSourceRoot": "deliveries/G6/rc3-platform-independent-verification/reviewers/media/fixtures/",
    "independentApngOracle": "deliveries/G6/rc3-platform-independent-verification/reviewers/media/apng-details.json",
    "generator": "workers/media/evidence/prepare-fixtures.py; Pillow " + Image.__version__,
    "files": sorted(files, key=lambda item: item["name"]),
}, indent=2) + "\n", encoding="utf8")
print(json.dumps({"copied": 4, "generated": 5, "total": len(files), "pillow": Image.__version__}))
