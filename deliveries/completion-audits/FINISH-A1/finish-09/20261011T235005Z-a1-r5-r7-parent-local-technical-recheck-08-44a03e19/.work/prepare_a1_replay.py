from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
A1_ROOT = ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T235005Z-a1-r5-r7-parent-local-technical-recheck-08-44a03e19"
WORKTREE = A1_ROOT / ".work/a1-replay"
CANDIDATE = "76d679dcb98064152021830b98f16eb456b3ae19"
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
CONTRACT_COMMIT = "d913270712e9757478a9794f5d72a12cc18a9634"
PACKAGE = "deliveries/FINISH-A1/r5-07"
CONTRACT_PATH = "docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md"


def git(*args: str, cwd: Path = ROOT, check: bool = True) -> bytes:
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


def blob(commit: str, path: str) -> bytes:
    return git("cat-file", "blob", f"{commit}:{path}")


if WORKTREE.exists():
    current_head = git("rev-parse", "HEAD", cwd=WORKTREE).decode("utf-8").strip()
    if current_head != BASE:
        raise SystemExit("FINISH-43 A1 replay scratch is not at the pinned base; preserve it and reallocate.")
    subprocess.run(["git", "reset", "--hard", BASE], cwd=WORKTREE, check=True, capture_output=True)
else:
    subprocess.run(["git", "worktree", "add", "--detach", "--no-checkout", str(WORKTREE), BASE], cwd=ROOT, check=True, capture_output=True)
    subprocess.run(["git", "-C", str(WORKTREE), "sparse-checkout", "init", "--cone"], cwd=ROOT, check=True, capture_output=True)
    subprocess.run(["git", "-C", str(WORKTREE), "sparse-checkout", "set", "app"], cwd=ROOT, check=True, capture_output=True)
    subprocess.run(["git", "-C", str(WORKTREE), "checkout", "--detach", BASE], cwd=ROOT, check=True, capture_output=True)
patch = blob(CANDIDATE, f"{PACKAGE}/source.patch")
patch_path = A1_ROOT / ".work/a1-candidate.patch"
patch_path.write_bytes(patch)
patch.decode("utf-8", errors="strict")
if patch.startswith(b"\xef\xbb\xbf") or b"\0" in patch:
    raise SystemExit("Candidate patch has BOM or NUL.")

apply_check = subprocess.run(["git", "apply", "--check", "--whitespace=error", str(patch_path)], cwd=WORKTREE, capture_output=True)
if apply_check.returncode:
    raise SystemExit(apply_check.stderr.decode("utf-8", errors="replace"))
subprocess.run(["git", "apply", "--whitespace=error", str(patch_path)], cwd=WORKTREE, check=True, capture_output=True)

contract = blob(CONTRACT_COMMIT, CONTRACT_PATH).decode("utf-8", errors="strict")
a1_start = contract.index("### FINISH-A1:")
a2_start = contract.index("### FINISH-A2:", a1_start)
a1_section = contract[a1_start:a2_start]
allowlist = re.findall(r"^\| `([^`]+)` \| (?:existing|new) \|", a1_section, flags=re.MULTILINE)
if len(allowlist) != 26 or len(set(allowlist)) != len(allowlist):
    raise SystemExit(f"Pinned A1 allowlist parse expected 26 unique rows, found {len(allowlist)}")

declared_paths = blob(CANDIDATE, f"{PACKAGE}/changed-paths.txt").decode("utf-8", errors="strict").splitlines()
declared_paths = [path.strip() for path in declared_paths if path.strip()]
boundary_target = WORKTREE / "app/tests/unit/platform/finish43-parent-boundaries.test.ts"
if boundary_target.exists():
    boundary_target.unlink()
subprocess.run(["git", "add", "--", "app"], cwd=WORKTREE, check=True, capture_output=True)
actual_paths = git("diff", "--cached", "--name-only", BASE, "--", "app/", cwd=WORKTREE).decode("utf-8").splitlines()
relative_actual = [path.removeprefix("app/") for path in actual_paths]
allowlist_only = all(path in allowlist for path in relative_actual)
inventory_matches = sorted(declared_paths) == sorted(actual_paths)
source_mismatches = []
for path in actual_paths:
    package_bytes = blob(CANDIDATE, f"{PACKAGE}/source/{path}")
    replay_bytes = (WORKTREE / path).read_bytes()
    if package_bytes != replay_bytes:
        source_mismatches.append(path)

index_tree = git("write-tree", cwd=WORKTREE).decode("utf-8").strip()
app_tree = git("rev-parse", f"{index_tree}:app", cwd=WORKTREE).decode("utf-8").strip()
candidate_app_tree = json.loads(blob(CANDIDATE, f"{PACKAGE}/output-hashes.json").decode("utf-8"))["candidateAppTree"]
whitespace = subprocess.run(["git", "diff", "--cached", "--check"], cwd=WORKTREE, capture_output=True)

boundary_source = A1_ROOT / "evidence/a1-boundary-probes.test.ts"
boundary_target.write_bytes(boundary_source.read_bytes())

result = {
    "format": "YOR-WORLD-FINISH-43-A1-EXACT-BASE-REPLAY-v1",
    "candidateCommit": CANDIDATE,
    "baseCommit": BASE,
    "contractCommit": CONTRACT_COMMIT,
    "patch": {"bytes": len(patch), "sha256": hashlib.sha256(patch).hexdigest(), "strictUtf8": True,
               "noBom": not patch.startswith(b"\xef\xbb\xbf"), "noNul": b"\0" not in patch,
               "applyCheckExitCode": apply_check.returncode},
    "changedPathCount": len(actual_paths),
    "declaredPathCount": len(declared_paths),
    "changedPaths": relative_actual,
    "declaredPathsMatch": inventory_matches,
    "frozenAllowlistCount": len(allowlist),
    "changedPathsWithinFrozenAllowlist": allowlist_only,
    "packagedSourceCount": len(actual_paths),
    "packagedSourceMismatches": source_mismatches,
    "packageSourcesMatchReplay": not source_mismatches,
    "candidateAppTree": candidate_app_tree,
    "replayedAppTree": app_tree,
    "appTreeMatch": app_tree == candidate_app_tree,
    "cachedWhitespaceCheckExitCode": whitespace.returncode,
    "cachedWhitespaceStderr": whitespace.stderr.decode("utf-8", errors="replace"),
    "temporaryBoundaryTest": "app/tests/unit/platform/finish43-parent-boundaries.test.ts",
    "temporaryBoundaryTestOutsideCandidateCommit": True,
}
A1_ROOT.joinpath(".work/a1-replay-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not inventory_matches or not allowlist_only or source_mismatches or app_tree != candidate_app_tree or whitespace.returncode:
    raise SystemExit(1)
