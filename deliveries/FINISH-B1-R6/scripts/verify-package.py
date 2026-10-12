"""Verify the exact R6 package file set, hashes, and final check receipts."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
EXCLUDED = {"output-hashes.json", "evidence/package-verification.json"}

def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

manifest_path = OUT / "output-hashes.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
if manifest["candidate"] != "FINISH-B1-R6" or manifest["baseCommit"] != "a5ebcc88170703751a5f504f67aed637d2f7d8e9":
    raise SystemExit("candidate or base binding mismatch")
if set(manifest["selfExcluded"]) != EXCLUDED:
    raise SystemExit("self-exclusion set mismatch")
listed = {row["path"]: row for row in manifest["files"]}
actual = {
    p.relative_to(OUT).as_posix(): p
    for p in OUT.rglob("*")
    if p.is_file() and p.relative_to(OUT).as_posix() not in EXCLUDED
}
if set(actual) != set(listed):
    raise SystemExit(f"package set mismatch; missing={sorted(set(listed)-set(actual))}; extra={sorted(set(actual)-set(listed))}")
for rel, path in actual.items():
    raw = path.read_bytes()
    row = listed[rel]
    if len(raw) != row["bytes"] or sha(raw) != row["sha256"]:
        raise SystemExit(f"package hash mismatch: {rel}")

commands = json.loads((OUT / "evidence/final-check-commands.json").read_text(encoding="utf-8"))
if commands["status"] != "PASS" or any(row["exitCode"] != 0 for row in commands["commands"]):
    raise SystemExit("one or more final validation commands did not pass")
validator = json.loads((OUT / "evidence/gltf-validation.json").read_text(encoding="utf-8"))
if validator["errors"] != 0 or validator["warnings"] != 0 or len(validator["files"]) != 5:
    raise SystemExit("glTF validation receipt is not clean for all five GLBs")
browser = json.loads((OUT / "evidence/browser-results.json").read_text(encoding="utf-8"))
if browser["exitCode"] != 0 or len([x for x in browser["captures"] if x["variant"] == "R6"]) != 7:
    raise SystemExit("exact-profile browser evidence is incomplete or failed")
matrix = json.loads((OUT / "evidence/requirement-matrix.json").read_text(encoding="utf-8"))
if matrix["status"] != "OPEN_VISUAL_GAPS" or matrix["visualAcceptance"] != "NOT RUN; owner and independent reviewer must judge comparison page evidence.":
    raise SystemExit("maker visual matrix must preserve open review status")
asset_manifest = json.loads((OUT / "candidate-asset-manifest.json").read_text(encoding="utf-8"))
for row in asset_manifest["runtimeAssets"]:
    raw = (OUT / row["path"]).read_bytes()
    if len(raw) != row["bytes"] or sha(raw) != row["sha256"]:
        raise SystemExit(f"candidate asset manifest mismatch: {row['path']}")

receipt = {
    "status": "PASS",
    "command": "python deliveries/FINISH-B1-R6/scripts/verify-package.py",
    "filesVerified": len(actual),
    "bytesVerified": sum(row["bytes"] for row in listed.values()),
    "manifestSHA256": sha(manifest_path.read_bytes()),
    "packageSetExact": True,
    "excludedFiles": sorted(EXCLUDED),
    "finalCommandsPassed": True,
    "gltfErrors": 0,
    "gltfWarnings": 0,
    "browserR6Captures": 7,
    "visualAcceptance": "NOT RUN",
    "openVisualGaps": ["mobile-home right-wall controller pegboard is outside the frozen profile crop"],
}
(OUT / "evidence/package-verification.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, indent=2))
