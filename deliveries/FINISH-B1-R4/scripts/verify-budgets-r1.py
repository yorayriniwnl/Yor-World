"""Recompute local delivery, GPU-estimate and frame-time budgets for R1."""

import hashlib
import json
import struct
from pathlib import Path


OUT = Path(__file__).resolve().parents[1]
sha = lambda raw: hashlib.sha256(raw).hexdigest()
textures = {}
asset_rows = []
byte_limits = {"room.glb": 1_500_000, "resident.glb": 800_000, "fixture.glb": 524_288}


def record_texture(raw: bytes, source: str) -> None:
    entry = textures.setdefault(sha(raw), {
        "bytes": len(raw),
        "width": int.from_bytes(raw[16:20], "big"),
        "height": int.from_bytes(raw[20:24], "big"),
        "sources": [],
    })
    entry["sources"].append(source)


for asset in sorted((OUT / "assets").glob("*.glb")):
    raw = asset.read_bytes()
    json_length = struct.unpack_from("<I", raw, 12)[0]
    document = json.loads(raw[20:20 + json_length])
    binary = raw[28 + json_length:]
    limit = byte_limits.get(asset.name)
    asset_rows.append({
        "file": f"assets/{asset.name}",
        "bytes": len(raw),
        "sha256": sha(raw),
        "limitBytes": limit,
        "status": "PASS" if limit is None or len(raw) <= limit else "FAIL",
    })
    for image in document.get("images", []):
        if image.get("mimeType") != "image/png" or "bufferView" not in image:
            raise RuntimeError(f"unexpected embedded image shape in {asset.name}: {image}")
        view = document["bufferViews"][image["bufferView"]]
        start = view.get("byteOffset", 0)
        record_texture(binary[start:start + view["byteLength"]], f"{asset.name}:{image.get('name', 'unnamed')}")

for texture_path in sorted((OUT / "assets" / "textures").glob("*.png")):
    raw = texture_path.read_bytes()
    if raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"invalid PNG: {texture_path}")
    record_texture(raw, f"textures/{texture_path.name}")

essential_bytes = sum(row["bytes"] for row in asset_rows if Path(row["file"]).name in byte_limits)
all_transfer_bytes = sum(row["bytes"] for row in asset_rows) + sum(
    path.stat().st_size for path in (OUT / "assets" / "textures").glob("*.png")
)
unique_texture_bytes = sum(row["bytes"] for row in textures.values())
if unique_texture_bytes > 1_500_000 or essential_bytes > 3 * 1024**2 or all_transfer_bytes > 7 * 1024**2:
    raise RuntimeError("asset transfer/texture byte budget exceeded")
if any(row["status"] != "PASS" for row in asset_rows):
    raise RuntimeError("an individual GLB byte budget failed")

browser = json.loads((OUT / "evidence" / "browser-results-r1.json").read_text(encoding="utf-8"))
profiles = []
for row in browser["measurements"]:
    if row["variant"] != "R4-R1" or not row.get("limit"):
        continue
    mobile = row["key"] == "mobile-home"
    call_limit = 80 if mobile else 120
    triangle_limit = 140_000 if mobile else 300_000
    gpu_limit = (80 if mobile else 160) * 1024**2
    median_limit = 33.3 if mobile else 18.2
    p95_limit = 45 if mobile else 25
    census = row["resourceCensus"]
    gpu_estimate = census["geometryAttributeIndexEstimateBytes"] + sum(
        (texture["width"] * texture["height"] * 4 * 4 + 2) // 3 for texture in textures.values()
    )
    actual = {
        "calls": row["rendererInfo"]["calls"],
        "triangles": row["rendererInfo"]["triangles"],
        "allDeliveredUniqueTextureAssetGPUBytesEstimate": gpu_estimate,
        "localMedianMs": row["frameSamples"]["medianMs"],
        "localP95Ms": row["frameSamples"]["p95Ms"],
    }
    if not (
        actual["calls"] <= call_limit
        and actual["triangles"] <= triangle_limit
        and gpu_estimate <= gpu_limit
        and actual["localMedianMs"] <= median_limit
        and actual["localP95Ms"] <= p95_limit
    ):
        raise RuntimeError(f"local runtime budget exceeded for {row['key']}: {actual}")
    profiles.append({
        "profile": row["key"],
        "actual": actual,
        "limits": {
            "calls": call_limit,
            "triangles": triangle_limit,
            "assetGPUBytes": gpu_limit,
            "medianMs": median_limit,
            "p95Ms": p95_limit,
        },
        "status": "PASS LOCAL",
        "gpuScope": "Unique loaded attribute/index buffers plus conservative RGBA8 mipmapped estimate for all delivered embedded/late textures, deduplicated by raw image hash; excludes driver overhead/framebuffers.",
        "timingScope": row["frameSamples"]["method"],
    })

if len(profiles) != 2:
    raise RuntimeError(f"expected both R1 browser profiles, got {len(profiles)}")

receipt = {
    "status": "PASS LOCAL",
    "command": "python scripts/verify-budgets-r1.py",
    "assets": asset_rows,
    "essentialGLBBytes": essential_bytes,
    "allDeliveredTransferBytes": all_transfer_bytes,
    "essentialLimitsBytes": {"mobile": 3 * 1024**2, "desktop": 6 * 1024**2},
    "fullOptionalLimitsBytes": {"mobile": 7 * 1024**2, "desktop": 14 * 1024**2},
    "uniqueTextureBytes": unique_texture_bytes,
    "uniqueTextureLimitBytes": 1_500_000,
    "textures": textures,
    "profiles": profiles,
    "coldWarmNetworkEntryDeviceThermal": "NOT RUN",
    "productionDecodedResidencyAndG7": "NOT RUN",
    "note": "Local isolated asset/browser evidence does not qualify production timing, real-device GPU allocation, runtime optional overlap or network entry.",
}
out = OUT / "evidence" / "final-budgets-r1.json"
out.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": receipt["status"], "essentialGLBBytes": essential_bytes, "allDeliveredTransferBytes": all_transfer_bytes, "uniqueTextureBytes": unique_texture_bytes, "profiles": profiles, "evidence": str(out)}, indent=2))
