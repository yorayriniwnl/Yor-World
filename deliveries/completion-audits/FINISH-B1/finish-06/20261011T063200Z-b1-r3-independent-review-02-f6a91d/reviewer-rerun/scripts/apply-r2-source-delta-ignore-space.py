#!/usr/bin/env python3
"""Apply source.patch with CRLF-tolerant Git matching in reviewer-only scratch."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
R2 = REPO / "deliveries" / "FINISH-B1-R2"
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
SCRATCH = ROOT / ".work" / "r2-source-patch-apply-ignore-space"
NAMES = ["build-environment.py", "build-resident-fixture.py"]


def candidate_bytes(path):
    return subprocess.run(["git", "-C", str(REPO), "show", f"{CANDIDATE}:deliveries/FINISH-B1-R3/{path}"], check=True, stdout=subprocess.PIPE).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalize(data):
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")


if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
(SCRATCH / "source.patch").write_bytes(candidate_bytes("source.patch"))
for name in NAMES:
    path = SCRATCH / "source" / "blender" / "scripts" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((R2 / "source" / "blender" / "scripts" / name).read_bytes())
applied = subprocess.run(["git", "apply", "--ignore-space-change", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
rows = []
for name in NAMES:
    output = (SCRATCH / "source" / "blender" / "scripts" / name).read_bytes()
    final = candidate_bytes(f"source/blender/scripts/{name}")
    rows.append({
        "path": name,
        "appliedBytes": len(output),
        "appliedSha256": sha(output),
        "finalBytes": len(final),
        "finalSha256": sha(final),
        "rawBytesMatch": output == final,
        "normalizedBytesMatch": normalize(output) == normalize(final),
        "appliedLineEndings": {"CRLF": output.count(b"\r\n"), "LFIncludingCRLF": output.count(b"\n")},
        "finalLineEndings": {"CRLF": final.count(b"\r\n"), "LFIncludingCRLF": final.count(b"\n")},
    })
summary = {
    "candidateCommit": CANDIDATE,
    "command": "git apply --ignore-space-change source.patch",
    "applyExit": applied.returncode,
    "stderr": applied.stderr,
    "files": rows,
    "allNormalizedFilesMatchFinal": applied.returncode == 0 and all(row["normalizedBytesMatch"] for row in rows),
    "scope": "Only reviewer-owned scratch copies were patched. Raw R2 source and R3 candidate remain unchanged.",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "r2-source-delta-ignore-space-apply.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
