"""Create the stable FINISH-25-R1 output hash inventory."""

import hashlib
import json
from pathlib import Path


OUT = Path(__file__).resolve().parents[1]
EXACT_PATHS = {
    ".gitattributes",
    ".gitignore",
    "source.patch",
    "source/blender/scripts/build-environment.py",
    "report.md",
    "issue-matrix.json",
    "material-only-stage-report.md",
    "checkpoints/material-only/checkpoint-hashes.json",
    "evidence/input-hashes.json",
    "evidence/lineage-r1.json",
    "evidence/final-lineage.json",
    "evidence/final-material-inspection.json",
    "evidence/native-parity-r1.json",
    "evidence/native-reopen-r1.json",
    "evidence/browser-results-r1.json",
    "evidence/capture-reverification-r1.json",
    "evidence/gltf-validation-r1.json",
    "evidence/blender-imports-r1.json",
    "evidence/final-budgets-r1.json",
    "evidence/final-export-reproducibility.json",
    "evidence/final-room-export.json",
    "evidence/source-patch-replay.json",
    "evidence/native-room-export.glb",
    "evidence/build-r1-replay.log",
    "evidence/build-r1-final.log",
    "scripts/build-r1-room.py",
    "scripts/export-final-room.py",
    "scripts/prepare.py",
    "scripts/verify-r1-lineage.py",
    "scripts/verify-r1-native.py",
    "scripts/verify-native-reopen-r1.py",
    "scripts/verify-final-lineage.py",
    "scripts/verify-browser-r1.mjs",
    "scripts/verify-captures-r1.py",
    "scripts/validate-glb-r1.mjs",
    "scripts/verify-blender-imports-r1.py",
    "scripts/verify-budgets-r1.py",
    "scripts/verify-reproducibility-r1.py",
    "scripts/create-output-hashes-r1.py",
    "scripts/finalize-package.py",
    "scripts/verify-package.py",
}

paths = set(EXACT_PATHS)
for root in (OUT / "assets", OUT / "inputs" / "r3", OUT / "captures"):
    if root.exists():
        paths.update(
            path.relative_to(OUT).as_posix()
            for path in root.rglob("*")
            if path.is_file() and "__pycache__" not in path.parts
        )

rows = []
for relative in sorted(paths):
    path = OUT / relative
    if not path.is_file():
        raise RuntimeError(f"required output is missing: {relative}")
    if ".work" in path.parts or "__pycache__" in path.parts:
        raise RuntimeError(f"scratch path must not enter the output inventory: {relative}")
    raw = path.read_bytes()
    rows.append({"path": relative, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})

receipt = {
    "schemaVersion": 1,
    "status": "PASS",
    "scope": "R1 source, production assets, supplied R3 inputs, preserved prior captures, 24 matched R1 captures, checkpoint manifest, and named final evidence. Excludes this self-referential manifest, temporary .work scratch, and Python caches.",
    "fileCount": len(rows),
    "totalBytes": sum(row["bytes"] for row in rows),
    "files": rows,
}
out = OUT / "evidence" / "output-hashes-r1.json"
out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": receipt["status"], "fileCount": receipt["fileCount"], "totalBytes": receipt["totalBytes"], "manifest": str(out)}))
