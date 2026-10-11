#!/usr/bin/env python3
"""Compare packaged builder sources and source.patch to the named accepted base."""
import difflib
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
PACKAGE_ROOT = "deliveries/FINISH-B1-R3"
BASE_ROOT = "deliveries/FINISH-B1/scripts"
PATCH_SOURCE_ROOT = "source/blender/scripts"
BUILDERS = ["build-environment.py", "build-resident-fixture.py"]
SCRATCH = ROOT / ".work" / "source-patch-accepted-base-check-r2"


def git_bytes(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, stdout=subprocess.PIPE).stdout


def digest(data):
    return hashlib.sha256(data).hexdigest()


def normalize_text(data):
    return data.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")


if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
patch_bytes = git_bytes("show", f"{CANDIDATE}:{PACKAGE_ROOT}/source.patch")
(SCRATCH / "source.patch").write_bytes(patch_bytes)

results = []
for name in BUILDERS:
    base_path = f"{BASE_ROOT}/{name}"
    packaged_path = f"{PACKAGE_ROOT}/{PATCH_SOURCE_ROOT}/{name}"
    base_bytes = git_bytes("show", f"{BASE}:{base_path}")
    packaged_bytes = git_bytes("show", f"{CANDIDATE}:{packaged_path}")
    target = SCRATCH / PATCH_SOURCE_ROOT / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(base_bytes)
    diff = list(difflib.unified_diff(
        normalize_text(base_bytes).splitlines(keepends=True),
        normalize_text(packaged_bytes).splitlines(keepends=True),
        fromfile=f"{BASE}:{base_path}",
        tofile=f"{CANDIDATE}:{packaged_path}",
    ))
    added = sum(line.startswith("+") and not line.startswith("+++") for line in diff)
    removed = sum(line.startswith("-") and not line.startswith("---") for line in diff)
    results.append({
        "pathInPatch": f"{PATCH_SOURCE_ROOT}/{name}",
        "acceptedBasePath": base_path,
        "candidatePackagedPath": packaged_path,
        "acceptedBaseBytes": len(base_bytes),
        "acceptedBaseSha256": digest(base_bytes),
        "candidateBytes": len(packaged_bytes),
        "candidateSha256": digest(packaged_bytes),
        "acceptedBaseLineEndings": {"CRLF": base_bytes.count(b"\r\n"), "LFIncludingCRLF": base_bytes.count(b"\n")},
        "candidateLineEndings": {"CRLF": packaged_bytes.count(b"\r\n"), "LFIncludingCRLF": packaged_bytes.count(b"\n")},
        "directUnifiedDiffAddedLines": added,
        "directUnifiedDiffRemovedLines": removed,
        "directDiffHunkCount": sum(line.startswith("@@") for line in diff),
        "directDiffPath": f"reviewer-rerun/validator-logs/accepted-base-to-candidate-{name}.patch",
    })
    (ROOT / "reviewer-rerun" / "validator-logs" / f"accepted-base-to-candidate-{name}.patch").write_text(
        "".join(diff), encoding="utf-8"
    )

check = subprocess.run(
    ["git", "apply", "--check", "source.patch"],
    cwd=SCRATCH,
    text=True,
    capture_output=True,
)
check_log = "".join([
    f"command: git apply --check source.patch (cwd={SCRATCH})\n",
    f"exit={check.returncode}\n",
    check.stdout,
    check.stderr,
])
(ROOT / "reviewer-rerun" / "source-patch-accepted-base-check.log").write_text(check_log, encoding="utf-8")

source_patch_header_paths = []
for line in patch_bytes.decode("utf-8").splitlines():
    if line.startswith("--- a/"):
        source_patch_header_paths.append(line[6:])

summary = {
    "candidateCommit": CANDIDATE,
    "candidateTree": git_bytes("rev-parse", f"{CANDIDATE}^{{tree}}").decode().strip(),
    "acceptedBaseCommit": BASE,
    "sourcePatchPaths": source_patch_header_paths,
    "sourcePatchFileCount": len(source_patch_header_paths),
    "sourcePatchApplyCheckExit": check.returncode,
    "sourcePatchApplyCheckStdout": check.stdout,
    "sourcePatchApplyCheckStderr": check.stderr,
    "directBuilderComparisons": results,
    "sourcePatchAppliesCleanlyToNamedAcceptedBase": check.returncode == 0,
    "scope": "All comparisons are read-only except scratch copies under this audit root; candidate source and canonical app are unchanged.",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "source-provenance-comparison.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
