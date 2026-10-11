#!/usr/bin/env python3
"""Check whether the delivered patch reproduces the delivered final builders."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
PACKAGE_ROOT = "deliveries/FINISH-B1-R3"
NESTED_BASE = f"{PACKAGE_ROOT}/source/blender/source/blender/scripts"
FINAL = f"{PACKAGE_ROOT}/source/blender/scripts"
SCRATCH = ROOT / ".work" / "source-patch-packaged-base-check"
NAMES = ["build-environment.py", "build-resident-fixture.py"]


def git_bytes(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, stdout=subprocess.PIPE).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
(SCRATCH / "source.patch").write_bytes(git_bytes("show", f"{CANDIDATE}:{PACKAGE_ROOT}/source.patch"))
for name in NAMES:
    data = git_bytes("show", f"{CANDIDATE}:{NESTED_BASE}/{name}")
    path = SCRATCH / "source" / "blender" / "scripts" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)

check = subprocess.run(["git", "apply", "--check", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)
apply = None
if check.returncode == 0:
    apply = subprocess.run(["git", "apply", "source.patch"], cwd=SCRATCH, text=True, capture_output=True)

rows = []
for name in NAMES:
    base_bytes = git_bytes("show", f"{CANDIDATE}:{NESTED_BASE}/{name}")
    final_bytes = git_bytes("show", f"{CANDIDATE}:{FINAL}/{name}")
    applied = (SCRATCH / "source" / "blender" / "scripts" / name).read_bytes()
    rows.append({
        "path": f"source/blender/scripts/{name}",
        "packagedNestedBaseSha256": sha(base_bytes),
        "packagedFinalSha256": sha(final_bytes),
        "patchAppliedSha256": sha(applied),
        "patchAppliedMatchesFinal": applied == final_bytes,
    })

summary = {
    "candidateCommit": CANDIDATE,
    "patchCheckExit": check.returncode,
    "patchCheckStderr": check.stderr,
    "patchApplyExit": apply.returncode if apply else None,
    "patchApplyStderr": apply.stderr if apply else None,
    "files": rows,
    "deliveredPatchReproducesFinalBuildersFromNestedPackagedCopies": check.returncode == 0 and all(row["patchAppliedMatchesFinal"] for row in rows),
    "interpretation": "This only proves self-consistency against the nested source copies in the same candidate package; it does not independently bind those copies to the accepted R2 baseline.",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "packaged-source-patch-check.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
