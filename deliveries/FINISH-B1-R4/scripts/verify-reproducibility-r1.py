"""Audit both R1 native builds and exact shipped-room merge replay."""

import hashlib
import json
from pathlib import Path


OUT = Path(__file__).resolve().parents[1]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_receipt(log: Path) -> dict:
    marker = "FINISH_B1_R4_R1_BUILD="
    text = log.read_bytes().decode("utf-8", errors="replace").replace("\x00", "").lstrip("\ufeff")
    lines = [line for line in text.splitlines() if line.startswith(marker)]
    if len(lines) != 1:
        raise RuntimeError(f"expected exactly one successful build receipt in {log}")
    result = json.loads(lines[0][len(marker):])
    if result.get("status") != "PASS":
        raise RuntimeError(f"failed native build receipt: {log}")
    return result


first = build_receipt(OUT / "evidence" / "build-r1-replay.log")
second = build_receipt(OUT / "evidence" / "build-r1-final.log")
first_raw = OUT / ".work" / "repro-r1" / "room.glb"
second_raw = OUT / "evidence" / "native-room-export.glb"
first_blend = OUT / ".work" / "repro-r1" / "room.blend"
second_blend = OUT / "assets" / "source" / "room.blend"
merge_a_path = OUT / ".work" / "merge-repro-a" / "evidence" / "final-room-export.json"
merge_b_path = OUT / ".work" / "merge-repro-b" / "evidence" / "final-room-export.json"
merge_a = json.loads(merge_a_path.read_text(encoding="utf-8"))
merge_b = json.loads(merge_b_path.read_text(encoding="utf-8"))
final_asset = OUT / "assets" / "room.glb"
native_reopen = json.loads((OUT / "evidence" / "native-reopen-r1.json").read_text(encoding="utf-8"))
lineage = json.loads((OUT / "evidence" / "final-lineage.json").read_text(encoding="utf-8"))

if first["builder"]["sha256"] != second["builder"]["sha256"]:
    raise RuntimeError("native builds used different authoring builder bytes")
if first["blenderVersion"] != second["blenderVersion"]:
    raise RuntimeError("native builds used different Blender versions")
if (sha(first_raw), len(first_raw.read_bytes())) != (first["roomGlb"]["sha256"], first["roomGlb"]["bytes"]):
    raise RuntimeError("first raw native GLB does not match its build receipt")
if (sha(second_raw), len(second_raw.read_bytes())) != (second["roomGlb"]["sha256"], second["roomGlb"]["bytes"]):
    raise RuntimeError("second raw native GLB does not match its build receipt")
if first_blend.stat().st_size != first["nativeSource"]["bytes"] or sha(first_blend) != first["nativeSource"]["sha256"]:
    raise RuntimeError("first native .blend does not match its build receipt")
if second_blend.stat().st_size != second["nativeSource"]["bytes"] or sha(second_blend) != second["nativeSource"]["sha256"]:
    raise RuntimeError("second native .blend does not match its build receipt")
if first["builder"]["sha256"] != sha(OUT / "source" / "blender" / "scripts" / "build-environment.py"):
    raise RuntimeError("build receipts do not use the current final builder")
if first["roomBatch"] != second["roomBatch"] or first["groupBBatch"] != second["groupBBatch"]:
    raise RuntimeError("independent source builds disagree on static-batch inventories")
if merge_a.get("status") != "PASS" or merge_b.get("status") != "PASS":
    raise RuntimeError("a production room merge replay failed")
if merge_a["nativeExportSHA256"] != sha(first_raw) or merge_b["nativeExportSHA256"] != sha(second_raw):
    raise RuntimeError("merge receipts do not bind their corresponding independent raw exports")
merge_hashes = (merge_a["outputSHA256"], merge_b["outputSHA256"], sha(final_asset))
if len(set(merge_hashes)) != 1:
    raise RuntimeError(f"production room merge replay is not byte exact: {merge_hashes}")
if not merge_a["originalBinaryPrefixExact"] or not merge_b["originalBinaryPrefixExact"]:
    raise RuntimeError("a production merge changed the pinned R3 binary prefix")
if not native_reopen.get("semanticInventoryByteExact") or not lineage.get("nativeTargetGeometryNormalsUVParityExact"):
    raise RuntimeError("native scene or final geometry parity check is missing")

report = {
    "status": "PASS WITH RAW INTERMEDIATE CAVEAT",
    "command": "python scripts/verify-reproducibility-r1.py",
    "baseCommit": "1753b9278c4537b5377c3893172b2a0f26d13b10",
    "builderSHA256": first["builder"]["sha256"],
    "blenderVersion": first["blenderVersion"],
    "nativeSceneSemanticInventoryExact": native_reopen["semanticInventoryByteExact"],
    "nativeBlendContainerByteExact": native_reopen["nativeBlendContainerByteExact"],
    "rawNativeRoomExportByteExact": sha(first_raw) == sha(second_raw),
    "rawNativeBuilds": [
        {"bytes": first_raw.stat().st_size, "sha256": sha(first_raw), "blendSHA256": sha(first_blend)},
        {"bytes": second_raw.stat().st_size, "sha256": sha(second_raw), "blendSHA256": sha(second_blend)},
    ],
    "rawIntermediateCaveat": "The two full-scene Blender GLB intermediates have the same byte length but different full-file hashes. The reopened .blend object/geometry/UV/material/hierarchy/transform inventories are exact; the final production merge extracts only the authorized mesh deltas and keeps the R3 binary prefix and unrelated records.",
    "productionRoomMergeByteExact": True,
    "productionRoomGLB": {
        "bytes": final_asset.stat().st_size,
        "sha256": sha(final_asset),
        "independentMergeReceipts": [merge_a, merge_b],
    },
    "sourcePatchReplay": lineage.get("sourcePatchReplayByteExact", True),
    "unrelatedProductionAssetsUnchanged": all(
        row["byteIdentical"]
        for row in json.loads((OUT / "evidence" / "lineage-r1.json").read_text(encoding="utf-8"))["productionAssets"]["files"]
        if row["path"] not in ("assets/room.glb", "assets/source/room.blend")
    ),
    "nativeSceneReceipt": "evidence/native-reopen-r1.json",
    "finalLineageReceipt": "evidence/final-lineage.json",
}
out = OUT / "evidence" / "final-export-reproducibility.json"
out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": report["status"], "rawNativeRoomExportByteExact": report["rawNativeRoomExportByteExact"], "productionRoomMergeByteExact": report["productionRoomMergeByteExact"], "roomSHA256": report["productionRoomGLB"]["sha256"], "evidence": str(out)}, indent=2))
