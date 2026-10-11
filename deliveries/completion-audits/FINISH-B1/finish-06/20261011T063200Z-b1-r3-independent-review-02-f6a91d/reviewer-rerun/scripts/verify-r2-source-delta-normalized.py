#!/usr/bin/env python3
"""Diagnostic patch check with CRLF normalized only in reviewer scratch."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
R2 = REPO / "deliveries" / "FINISH-B1-R2"
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
SCRATCH = ROOT / ".work" / "r2-source-patch-normalized-check"
NAMES = ["build-environment.py", "build-resident-fixture.py"]


def git_bytes(path):
    return subprocess.run(
        ["git", "-C", str(REPO), "show", f"{CANDIDATE}:deliveries/FINISH-B1-R3/{path}"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalized(data):
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")


if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
patch = git_bytes("source.patch")
(SCRATCH / "source.patch").write_bytes(patch)
rows = []
for name in NAMES:
    r2 = (R2 / "source" / "blender" / "scripts" / name).read_bytes()
    r3 = git_bytes(f"source/blender/scripts/{name}")
    base = normalized(r2)
    path = SCRATCH / "source" / "blender" / "scripts" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base)
    rows.append({
        "path": name,
        "r2RawSha256": sha(r2),
        "r2NormalizedSha256": sha(base),
        "r2WasCrlf": b"\r\n" in r2,
        "r3RawSha256": sha(r3),
        "r3NormalizedSha256": sha(normalized(r3)),
    })
check = subprocess.run(["git", "apply", "--check", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
apply = None
if check.returncode == 0:
    apply = subprocess.run(["git", "apply", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
for row in rows:
    name = row["path"]
    result = (SCRATCH / "source" / "blender" / "scripts" / name).read_bytes()
    final = git_bytes(f"source/blender/scripts/{name}")
    row["patchResultSha256"] = sha(result)
    row["patchResultMatchesR3AfterEolNormalization"] = normalized(result) == normalized(final)
summary = {
    "candidateCommit": CANDIDATE,
    "r2RawPaths": [f"deliveries/FINISH-B1-R2/source/blender/scripts/{name}" for name in NAMES],
    "r2ManifestSha256": sha((R2 / "output-hashes.json").read_bytes()),
    "r3PatchCheckWithNormalizedScratchExit": check.returncode,
    "r3PatchCheckStderr": check.stderr,
    "r3PatchApplyExit": apply.returncode if apply else None,
    "r3PatchApplyStderr": apply.stderr if apply else None,
    "files": rows,
    "scope": "Only reviewer-owned scratch copies are normalized and patched; raw R2 source is unchanged. This diagnostic does not prove byte-identical application to CRLF input.",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "r2-source-delta-eol-diagnostic.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
