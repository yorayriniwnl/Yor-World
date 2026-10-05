"""Independent Pillow pixel-decoding observation for preserved APNG bytes."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import struct
import sys
import zlib

root = Path(sys.argv[1])
observations = []
for name in ["normal-rgb.png", "animated.png", "corrupt-second-frame.png", "actl-only.png",
             "orphan-fctl.png", "orphan-fdat.png", "truncated-fdat.png"]:
    data = (root / name).read_bytes()
    result = {"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "chunks": []}
    offset = 8
    while offset + 8 <= len(data):
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8].decode("ascii")
        end = offset + size + 12
        entry = {"type": kind, "offset": offset, "length": size, "complete": end <= len(data)}
        if entry["complete"]:
            entry["crcValid"] = zlib.crc32(data[offset + 4:end - 4]) == struct.unpack(">I", data[end - 4:end])[0]
        result["chunks"].append(entry)
        if not entry["complete"]:
            break
        offset = end
    try:
        with Image.open(root / name) as image:
            result["frames"] = image.n_frames
            hashes = []
            for frame in range(image.n_frames):
                image.seek(frame)
                image.load()
                hashes.append(hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest())
            result["decodedPixelHashes"] = hashes
            result["decodeResult"] = "PASS"
    except Exception as error:
        result["decodeResult"] = "FAIL"
        result["error"] = str(error)
    observations.append(result)
assert observations[0]["decodeResult"] == "PASS"
assert observations[1]["frames"] == 2 and observations[1]["decodeResult"] == "PASS"
assert observations[2]["decodeResult"] == "FAIL"
assert all(chunk["crcValid"] for chunk in observations[2]["chunks"])
print(json.dumps({"pillow": Image.__version__, "observations": observations}, indent=2))
