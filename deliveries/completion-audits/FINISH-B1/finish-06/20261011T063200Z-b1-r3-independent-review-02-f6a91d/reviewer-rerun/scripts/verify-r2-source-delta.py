#!/usr/bin/env python3
"""Bind the R3 source.patch to the received R2 builder files and final R3 scripts."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
R2 = REPO / "deliveries" / "FINISH-B1-R2"
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
PATCH = None
SCRATCH = ROOT / ".work" / "r2-source-patch-check-r2"
NAMES = ["build-environment.py", "build-resident-fixture.py"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def candidate_bytes(path):
    return subprocess.run(
        ["git", "-C", str(REPO), "show", f"{CANDIDATE}:deliveries/FINISH-B1-R3/{path}"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout


if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
patch_bytes = candidate_bytes("source.patch")
(SCRATCH / "source.patch").write_bytes(patch_bytes)
r2_hashes = json.loads((R2 / "output-hashes.json").read_text(encoding="utf-8"))
rows = []
for name in NAMES:
    r2_path = R2 / "source" / "blender" / "scripts" / name
    before = r2_path.read_bytes()
    after = candidate_bytes(f"source/blender/scripts/{name}")
    r2_entry = r2_hashes.get(f"source/blender/scripts/{name}")
    target = SCRATCH / "source" / "blender" / "scripts" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(before)
    rows.append({
        "path": f"source/blender/scripts/{name}",
        "r2Bytes": len(before),
        "r2LineEndingCounts": {"CRLF": before.count(b"\r\n"), "LFIncludingCRLF": before.count(b"\n")},
        "r2Sha256": sha(before),
        "r2ManifestEntry": r2_entry,
        "r2ManifestMatchesRaw": bool(r2_entry and r2_entry.get("bytes") == len(before) and r2_entry.get("sha256") == sha(before)),
        "r3Bytes": len(after),
        "r3LineEndingCounts": {"CRLF": after.count(b"\r\n"), "LFIncludingCRLF": after.count(b"\n")},
        "r3Sha256": sha(after),
    })
check = subprocess.run(["git", "apply", "--check", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
apply = None
if check.returncode == 0:
    apply = subprocess.run(["git", "apply", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
for row, name in zip(rows, NAMES):
    target = SCRATCH / "source" / "blender" / "scripts" / name
    if target.exists():
        result = target.read_bytes()
        final = candidate_bytes(f"source/blender/scripts/{name}")
        row["appliedSha256"] = sha(result)
        row["patchResultMatchesR3Final"] = result == final
summary = {
    "candidateCommit": CANDIDATE,
    "r2SourceRoot": "deliveries/FINISH-B1-R2/source/blender/scripts/",
    "r2OutputManifest": "deliveries/FINISH-B1-R2/output-hashes.json",
    "r2OutputManifestSha256": sha((R2 / "output-hashes.json").read_bytes()),
    "r3SourcePatch": "deliveries/FINISH-B1-R3/source.patch",
    "r3SourceRoot": "deliveries/FINISH-B1-R3/source/blender/scripts/",
    "sourcePatchCheckExit": check.returncode,
    "sourcePatchBytes": len(patch_bytes),
    "sourcePatchLineEndingCounts": {"CRLF": patch_bytes.count(b"\r\n"), "LFIncludingCRLF": patch_bytes.count(b"\n")},
    "sourcePatchCheckStderr": check.stderr,
    "sourcePatchApplyExit": apply.returncode if apply else None,
    "sourcePatchApplyStderr": apply.stderr if apply else None,
    "files": rows,
    "sourcePatchCleanlyAppliesToHashBoundR2Files": check.returncode == 0,
    "allPatchResultsMatchR3Final": bool(apply and apply.returncode == 0 and all(row.get("patchResultMatchesR3Final") for row in rows)),
    "scope": "R2 files are read-only inputs; patch application is confined to reviewer-owned scratch under this audit root.",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "r2-source-delta-verification.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
