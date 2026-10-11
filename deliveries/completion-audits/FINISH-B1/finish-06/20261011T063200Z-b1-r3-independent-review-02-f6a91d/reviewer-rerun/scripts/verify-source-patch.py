#!/usr/bin/env python3
"""Check the packaged source.patch against the accepted base in isolated scratch."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
SCRATCH = ROOT / ".work" / "source-patch-check-r2"
PACKAGE = ROOT / ".work" / "source-root" / "deliveries" / "FINISH-B1-R3"
PATCH_PATH = PACKAGE / "source.patch"


def git_bytes(*args):
    return subprocess.run(
        ["git", "-C", str(REPO), *args], check=True, stdout=subprocess.PIPE
    ).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


patch_to_base = {
    "source/blender/scripts/build-environment.py": "deliveries/FINISH-B1/scripts/build-environment.py",
    "source/blender/scripts/build-resident-fixture.py": "deliveries/FINISH-B1/scripts/build-resident-fixture.py",
}
if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
patch_bytes = git_bytes("show", f"{CANDIDATE}:deliveries/FINISH-B1-R3/source.patch")
(SCRATCH / "source.patch").write_bytes(patch_bytes)
for relative, base_relative in patch_to_base.items():
    content = git_bytes("show", f"{BASE}:{base_relative}")
    target = SCRATCH / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)

check = subprocess.run(["git", "apply", "--check", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
if check.returncode != 0:
    raise SystemExit(json.dumps({"checkExit": check.returncode, "stderr": check.stderr}, indent=2))
apply = subprocess.run(["git", "apply", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
if apply.returncode != 0:
    raise SystemExit(json.dumps({"applyExit": apply.returncode, "stderr": apply.stderr}, indent=2))

rows = []
for relative, base_relative in patch_to_base.items():
    result = (SCRATCH / relative).read_bytes()
    packaged = (PACKAGE / relative).read_bytes()
    rows.append({
        "path": relative,
        "acceptedBasePath": base_relative,
        "baseSha256": sha(git_bytes("show", f"{BASE}:{base_relative}")),
        "patchedSha256": sha(result),
        "packagedSourceSha256": sha(packaged),
        "patchedMatchesPackagedSource": result == packaged,
    })
changed_names = subprocess.run(
    ["git", "apply", "--stat", "source.patch"], cwd=SCRATCH, text=True, capture_output=True, check=True
).stdout
summary = {
    "candidate": CANDIDATE,
    "acceptedBase": BASE,
    "checkExit": check.returncode,
    "applyExit": apply.returncode,
    "patchStat": changed_names.strip(),
    "files": rows,
    "allPatchedFilesMatchPackagedSource": all(row["patchedMatchesPackagedSource"] for row in rows),
    "scope": "source.patch applied only in reviewer-owned .work/source-patch-check; candidate bytes and app were not modified",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "source-patch-check.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
