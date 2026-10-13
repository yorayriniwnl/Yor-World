#!/usr/bin/env python3
"""Read-only identity, inventory, and hash checks for the pinned B1-R3 audit."""
from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[5]
OUT = pathlib.Path(__file__).resolve().parent
CAND = ROOT / "deliveries" / "FINISH-B1-R3"
COMMIT = "1753b9278c4537b5377c3893172b2a0f26d13b10"
PARENT = "54c2448bbabb8bfb8bd7fd55ff4a25b3a4343feb"
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, stderr=subprocess.STDOUT).strip()


def digest(path: pathlib.Path) -> dict:
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def rel(path: pathlib.Path) -> str:
    return path.relative_to(ROOT).as_posix()


manifest_path = CAND / "output-hashes.json"
manifest_bytes = digest(manifest_path)
manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
declared = manifest.get("files", manifest)
if not isinstance(declared, dict):
    raise SystemExit("output-hashes.json does not contain a path-keyed object")

rows = []
for name, expected in sorted(declared.items()):
    path = CAND / pathlib.PurePosixPath(name)
    actual = digest(path) if path.is_file() else None
    ok = bool(actual and actual["sha256"] == expected.get("sha256") and actual["bytes"] == expected.get("bytes"))
    rows.append({"path": name, "expected": expected, "actual": actual, "status": "PASS" if ok else "FAIL"})

actual_files = {p.relative_to(CAND).as_posix() for p in CAND.rglob("*") if p.is_file()}
manifest_files = set(declared)
extra_files = sorted(actual_files - manifest_files - {"output-hashes.json"})
documented_manifest_exclusions = {"validator-logs/manifest-verification.json"}
unexpected_extra_files = sorted(set(extra_files) - documented_manifest_exclusions)
missing_documented_exclusions = sorted(documented_manifest_exclusions - set(extra_files))
missing_files = sorted(manifest_files - actual_files)
tracked = set(git("ls-tree", "-r", "--name-only", COMMIT, "--", "deliveries/FINISH-B1-R3").splitlines())
tracked = {p.removeprefix("deliveries/FINISH-B1-R3/") for p in tracked}
tracked_unmanifested = sorted(tracked - manifest_files - {"output-hashes.json"})
manifest_untracked = sorted(manifest_files - tracked)

diff_rows = git("diff-tree", "--no-commit-id", "--name-status", "-r", PARENT, COMMIT).splitlines()
diff_paths = [row.split("\t", 1)[-1] for row in diff_rows]
diff_scope_ok = all(p.startswith("deliveries/FINISH-B1-R3/") for p in diff_paths)

current_head = git("rev-parse", "HEAD")
branch = git("branch", "--show-current")
remote_ref = f"origin/{branch}"
remote_head = git("rev-parse", remote_ref) if branch else None
ancestor_code = subprocess.run(["git", "merge-base", "--is-ancestor", COMMIT, "HEAD"], cwd=ROOT).returncode

identity = {
    "candidateCommit": COMMIT,
    "candidateParentDeliveryCommit": PARENT,
    "acceptedBaseCommit": BASE,
    "acceptedBaseAppTree": APP_TREE,
    "candidateDeliveryTree": git("rev-parse", f"{COMMIT}:deliveries/FINISH-B1-R3"),
    "candidateAppTree": git("rev-parse", f"{COMMIT}:app"),
    "currentHead": current_head,
    "currentBranch": branch,
    "currentOriginHead": remote_head,
    "candidateAncestorOfCurrentHead": ancestor_code == 0,
    "currentAppTree": git("rev-parse", "HEAD:app"),
    "currentAppTreeMatchesAcceptedBase": git("rev-parse", "HEAD:app") == APP_TREE,
    "parentToCandidateChanges": diff_rows,
    "parentToCandidateChangesB1Only": diff_scope_ok,
    "candidateTrackedFileCount": len(tracked),
    "candidateManifestSha256": manifest_bytes["sha256"],
    "candidateManifestBytes": manifest_bytes["bytes"],
    "candidateManifestEntryCount": len(declared),
    "outputManifestPassed": sum(row["status"] == "PASS" for row in rows),
    "outputManifestFailed": sum(row["status"] == "FAIL" for row in rows),
    "missingManifestFiles": missing_files,
    "unmanifestedFilesystemFilesExceptManifest": extra_files,
    "documentedManifestExclusions": [
        {"path": name, **digest(CAND / name)} for name in sorted(documented_manifest_exclusions) if (CAND / name).is_file()
    ],
    "unexpectedUnmanifestedFilesystemFiles": unexpected_extra_files,
    "missingDocumentedManifestExclusions": missing_documented_exclusions,
    "trackedUnmanifestedFilesExceptManifest": tracked_unmanifested,
    "manifestPathsNotTrackedAtCandidateCommit": manifest_untracked,
}
(OUT / "candidate-identity.json").write_text(json.dumps(identity, indent=2) + "\n", encoding="utf-8")
(OUT / "output-hash-receipt.json").write_text(json.dumps({"manifest": "deliveries/FINISH-B1-R3/output-hashes.json", **manifest_bytes, "entryCount": len(rows), "passed": sum(r["status"] == "PASS" for r in rows), "failed": sum(r["status"] == "FAIL" for r in rows), "documentedSelfExcludedReceipt": {"path": "validator-logs/manifest-verification.json", **digest(CAND / "validator-logs/manifest-verification.json")}, "rows": rows}, indent=2) + "\n", encoding="utf-8")

inputs = [
    "docs/planning/reconciliation-packets/2026-10-11-finish-18-b1-r3-independent-audit.md",
    "docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md",
    "docs/planning/reconciliation-packets/2026-10-10-finish-04.md",
    "docs/planning/production-prompts/corrections-2026-10-10/02-GEMINI2-B1-R3.md",
    "references/images/main-reference.png",
    "app/src/features/world/CharacterDirector.ts",
    "app/src/features/world/EntranceCoordinator.ts",
    "app/src/features/world/WorldInteractionBinding.ts",
    "deliveries/FINISH-B1-R2/source/blender/scripts/build-environment.py",
    "deliveries/FINISH-B1-R2/source/blender/scripts/build-resident-fixture.py",
    "deliveries/FINISH-B1-R3/report.md",
    "deliveries/FINISH-B1-R3/output-hashes.json",
    "deliveries/FINISH-B1-R3/source.patch",
    "deliveries/FINISH-B1-R3/source/blender/scripts/build-environment.py",
    "deliveries/FINISH-B1-R3/source/blender/scripts/build-resident-fixture.py",
    "deliveries/FINISH-B1-R3/captures/index.json",
    "deliveries/FINISH-B1-R3/captures/native/index.json",
    "deliveries/FINISH-B1-R3/validator-logs/path-guard-and-baseline-restoration.json",
    "deliveries/FINISH-B1-R3/validator-logs/browser-deformation-results.json",
    "deliveries/FINISH-B1-R3/validator-logs/draw-call-attribution.json",
    "deliveries/FINISH-B1-R3/validator-logs/draw-budget-assertion-final.log",
]
input_hashes = []
for name in inputs:
    p = ROOT / name
    input_hashes.append({"path": name, **(digest(p) if p.is_file() else {"missing": True})})
(OUT / "input-hashes.json").write_text(json.dumps({"candidateCommit": COMMIT, "inputs": input_hashes}, indent=2) + "\n", encoding="utf-8")

if len(rows) != 204 or any(r["status"] != "PASS" for r in rows) or missing_files or unexpected_extra_files or missing_documented_exclusions or manifest_untracked or not diff_scope_ok:
    print(json.dumps({"manifestEntryCount": len(rows), "failed": sum(r["status"] == "FAIL" for r in rows), "missing": missing_files, "extra": extra_files, "unexpectedExtra": unexpected_extra_files, "missingDocumentedExclusions": missing_documented_exclusions, "manifestUntracked": manifest_untracked, "diffScopeOk": diff_scope_ok}, indent=2))
    sys.exit(1)
print(json.dumps({"candidateCommit": COMMIT, "candidateDeliveryTree": identity["candidateDeliveryTree"], "manifestSha256": manifest_bytes["sha256"], "manifestEntries": len(rows), "manifestPassed": sum(r["status"] == "PASS" for r in rows), "manifestFailed": sum(r["status"] == "FAIL" for r in rows), "candidateTrackedFiles": len(tracked), "documentedManifestExclusions": extra_files, "unexpectedUnmanifested": unexpected_extra_files, "parentToCandidateChangesB1Only": diff_scope_ok, "candidateAncestorOfCurrentHead": identity["candidateAncestorOfCurrentHead"], "currentAppTreeMatchesAcceptedBase": identity["currentAppTreeMatchesAcceptedBase"]}, indent=2))
