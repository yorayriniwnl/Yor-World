"""Rebind FINISH-41 A1-R7 and C1-R9 packages directly from Git objects."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
A1_ROOT = ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0"
C1_ROOT = ROOT / "deliveries/completion-audits/FINISH-C1/finish-16/20261011T233109Z-c1-r9-parent-local-technical-recheck-06-85bd61e0"
A1_COMMIT = "76d679dcb98064152021830b98f16eb456b3ae19"
A1_BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
A1_BRANCH = "codex/finish-29-a1-r5-r7-20261011"
A1_PACKAGE = "deliveries/FINISH-A1/r5-07"
C1_COMMIT = "3dda9a616033375768f3d5f60f8c653d504f7c8c"
R8_COMMIT = "c398876583bc337c069414b79364e3fdea745879"
R7_COMMIT = "e2670d4152c461005da86b392dbcea12cec740bf"
C1_BRANCH = "codex/finish-30-c1-r9-20261011"
R8_BRANCH = "codex/finish-28-c1-r8-20261011"
C1_PACKAGE = "deliveries/FINISH-C1-R9"
R8_PACKAGE = "deliveries/FINISH-C1-R8"


def run_git(*args: str) -> bytes:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True).stdout


def git_text(*args: str) -> str:
    return run_git(*args).decode("utf-8").strip()


def blob(commit: str, path: str) -> bytes:
    return run_git("cat-file", "blob", f"{commit}:{path}")


def json_blob(commit: str, path: str):
    return json.loads(blob(commit, path).decode("utf-8"))


def remote_head(branch: str) -> str:
    result = run_git("ls-remote", "origin", f"refs/heads/{branch}").decode("utf-8").strip()
    return result.split()[0] if result else ""


def tree_paths(commit: str, prefix: str) -> list[str]:
    raw = run_git("ls-tree", "-r", "-z", "--name-only", commit, "--", prefix)
    full = [item.decode("utf-8") for item in raw.split(b"\0") if item]
    return sorted(path[len(prefix) + 1:] for path in full)


def package_hash_check(commit: str, prefix: str, manifest: dict, rows_key: str) -> dict:
    rows = manifest[rows_key]
    mismatches = []
    for row in rows:
        raw = blob(commit, f"{prefix}/{row['path']}")
        actual = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
        if actual != {"bytes": row["bytes"], "sha256": row["sha256"]}:
            mismatches.append({"path": row["path"], "declared": row, "actual": actual})
    inventory = tree_paths(commit, prefix)
    expected_inventory = sorted([row["path"] for row in rows] + ["output-hashes.json"])
    return {
        "manifestRowCount": len(rows),
        "manifestBytes": sum(row["bytes"] for row in rows),
        "allRowsMatch": not mismatches,
        "mismatches": mismatches,
        "inventoryExact": inventory == expected_inventory,
        "gitInventoryCountIncludingManifest": len(inventory),
        "manifestSelfExcluded": "output-hashes.json" not in [row["path"] for row in rows],
    }


def a1_check() -> dict:
    manifest = json_blob(A1_COMMIT, f"{A1_PACKAGE}/output-hashes.json")
    patch = blob(A1_COMMIT, f"{A1_PACKAGE}/source.patch")
    parent = git_text("rev-parse", f"{A1_COMMIT}^")
    base_app = git_text("rev-parse", f"{A1_BASE}:app")
    candidate_app = git_text("rev-parse", f"{A1_COMMIT}:app")
    package_tree = git_text("rev-parse", f"{A1_COMMIT}:{A1_PACKAGE}")
    candidate_tree = git_text("rev-parse", f"{A1_COMMIT}^{{tree}}")
    full_tree = git_text("rev-parse", f"{A1_COMMIT}^{{tree}}")
    raw_check = json.loads((A1_ROOT / ".work/raw-git-verification.json").read_text(encoding="utf-8"))
    replay = json.loads((A1_ROOT / ".work/a1-replay-verification.json").read_text(encoding="utf-8"))
    expected = {
        "commit": A1_COMMIT,
        "parent": A1_BASE,
        "fullTree": "6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6",
        "packageTree": "61026e89795d28aa212ee2e03c8edc05b2aea97a",
    }
    checks = {
        "remoteBranchEqualsCandidate": remote_head(A1_BRANCH) == A1_COMMIT,
        "candidateParentEqualsPinnedBase": parent == A1_BASE,
        "candidateTreeMatchesAllocation": full_tree == expected["fullTree"],
        "packageSubtreeMatchesAllocation": package_tree == expected["packageTree"],
        "canonicalAppTreeUnchanged": base_app == candidate_app == "42ea29ec235225046a75959eb19eb386ac2f821d",
        "outputManifestRowsMatchRawGit": package_hash_check(A1_COMMIT, A1_PACKAGE, manifest, "files")["allRowsMatch"],
        "outputManifestInventoryExact": package_hash_check(A1_COMMIT, A1_PACKAGE, manifest, "files")["inventoryExact"],
        "patchHashMatchesOutputManifest": hashlib.sha256(patch).hexdigest() == manifest["sourcePatchSha256"],
        "patchStrictUtf8NoBomNul": patch.decode("utf-8", errors="strict") is not None and not patch.startswith(b"\xef\xbb\xbf") and b"\0" not in patch,
        "exactBaseReplayChecksPass": replay.get("cachedAndWorktreePatchCheck") == "PASS" and replay.get("appTreeMatch") is True,
        "allChangedPathsWithinFrozenAllowlist": replay.get("changedPathsWithinAllowlist") is True,
        "packagedSourcesMatchReplay": replay.get("packageSourceMatchesReplay") is True,
        "previousRawRecheckRemoteMatch": raw_check.get("remoteMatch") is True,
    }
    return {
        "format": "YOR-WORLD-FINISH-41-A1-RAW-GIT-RECHECK-v1",
        "candidate": {"branch": A1_BRANCH, "commit": A1_COMMIT, "remoteCommit": remote_head(A1_BRANCH), "parent": parent,
                      "fullTree": full_tree, "packageSubtree": package_tree, "rootAppTree": candidate_app,
                      "baseCommit": A1_BASE, "baseAppTree": base_app},
        "manifest": {"sha256": hashlib.sha256(blob(A1_COMMIT, f"{A1_PACKAGE}/output-hashes.json")).hexdigest(),
                     **package_hash_check(A1_COMMIT, A1_PACKAGE, manifest, "files")},
        "patch": {"bytes": len(patch), "sha256": hashlib.sha256(patch).hexdigest(),
                  "changedPathCount": replay.get("changedPathCount"), "allowlistPathCount": replay.get("allowlistPathCount"),
                  "changedPaths": replay.get("changedPaths"), "sourceMismatches": replay.get("sourceMismatches")},
        "checks": checks,
        "allChecksPass": all(checks.values()),
    }


def c1_check() -> dict:
    r9_manifest = json_blob(C1_COMMIT, f"{C1_PACKAGE}/output-hashes.json")
    r8_manifest = json_blob(R8_COMMIT, f"{R8_PACKAGE}/output-hashes.json")
    r9_matrix = json_blob(C1_COMMIT, f"{C1_PACKAGE}/requirement-matrix.json")
    r8_matrix = json_blob(R8_COMMIT, f"{R8_PACKAGE}/requirement-matrix.json")
    r9_binding = json_blob(C1_COMMIT, f"{C1_PACKAGE}/r9-candidate-binding.json")
    receipt = json_blob(C1_COMMIT, f"{C1_PACKAGE}/evidence/r9-correction-verification.json")
    negative = json_blob(C1_COMMIT, f"{C1_PACKAGE}/evidence/cli-negative-false-pass.json")
    r9_finalizer = blob(C1_COMMIT, f"{C1_PACKAGE}/scripts/finalize.py")
    r8_finalizer = blob(R8_COMMIT, f"{R8_PACKAGE}/scripts/finalize.py")

    r9_paths = tree_paths(C1_COMMIT, C1_PACKAGE)
    r8_paths = tree_paths(R8_COMMIT, R8_PACKAGE)
    r9_set, r8_set = set(r9_paths), set(r8_paths)
    added = sorted(r9_set - r8_set)
    removed = sorted(r8_set - r9_set)
    changed = sorted(path for path in r9_set & r8_set if blob(C1_COMMIT, f"{C1_PACKAGE}/{path}") != blob(R8_COMMIT, f"{R8_PACKAGE}/{path}"))
    declared_delta = json_blob(C1_COMMIT, f"{C1_PACKAGE}/changed-paths.json")["changedPaths"]
    changed_paths = sorted(added + changed)

    r9_rows = package_hash_check(C1_COMMIT, C1_PACKAGE, r9_manifest, "outputs")
    r8_rows = package_hash_check(R8_COMMIT, R8_PACKAGE, r8_manifest, "outputs")
    r9_refs = []
    for row in r9_matrix["results"]:
        for path in row.get("evidence", []):
            resolves = path in r9_paths
            r9_refs.append({"id": row["id"], "path": path, "resolves": resolves})

    r9_by_id = {row["id"]: row for row in r9_matrix["results"]}
    r8_by_id = {row["id"]: row for row in r8_matrix["results"]}
    statuses_unchanged = [(row["id"], row["status"]) for row in r9_matrix["results"]] == [(row["id"], row["status"]) for row in r8_matrix["results"]]
    other_rows_preserved = all(
        r9_by_id[row_id] == ({**r8_by_id[row_id], "evidence": ["evidence/cli-negative-false-pass.json"]} if row_id == "E-02-05" else r8_by_id[row_id])
        for row_id in r8_by_id
    )
    old_pointer_list = b'["evidence/cli-negative-false-pass.json", "evidence/cli-negative-false-pass.log"]'
    new_pointer_list = b'["evidence/cli-negative-false-pass.json"]'
    finalizer_only_pointer_change = old_pointer_list in r8_finalizer and r8_finalizer.replace(old_pointer_list, new_pointer_list) == r9_finalizer
    e02_row = r9_by_id["E-02-05"]
    stdout_result = json.loads(negative["stdout"])
    negative_pass = (
        negative.get("status") == "PASS" and negative.get("exitCode") == 1
        and negative.get("parsedResult", {}).get("status") == "FAIL"
        and negative.get("stderr") == "" and negative.get("cache", "").startswith("new Python process")
        and negative.get("mutation", {}).get("field") == "sourceManifest.sha256"
        and negative.get("mutation", {}).get("value") == "0" * 64
        and negative.get("originalReceiptSha256BeforeAndAfter", {}).get("before") == negative.get("originalReceiptSha256BeforeAndAfter", {}).get("after")
        and stdout_result.get("status") == "FAIL"
    )

    r9_remote = remote_head(C1_BRANCH)
    r8_remote = remote_head(R8_BRANCH)
    r9_parent = git_text("rev-parse", f"{C1_COMMIT}^")
    r9_tree = git_text("rev-parse", f"{C1_COMMIT}^{{tree}}")
    r9_pkg_tree = git_text("rev-parse", f"{C1_COMMIT}:{C1_PACKAGE}")
    r8_tree = git_text("rev-parse", f"{R8_COMMIT}^{{tree}}")
    r8_pkg_tree = git_text("rev-parse", f"{R8_COMMIT}:{R8_PACKAGE}")
    root_app = git_text("rev-parse", f"{C1_COMMIT}:app")
    checks = {
        "r9RemoteBranchEqualsCandidate": r9_remote == C1_COMMIT,
        "r9ParentEqualsExactR8Commit": r9_parent == R8_COMMIT,
        "r8RemoteBranchEqualsPinnedInput": r8_remote == R8_COMMIT,
        "candidateAndPackageTreesMatchAllocation": r9_tree == "5a38d405499737ff40b0141a64845c244a9e4813" and r9_pkg_tree == "aa097f12adff2dbac2c88d6300c949f37bf34251",
        "r8TreesMatchPinnedInput": r8_tree == "798de513703f3d7e76f8d82edb85257d32894681" and r8_pkg_tree == "da822d0362e06e92497001583afb7405b7ccd472",
        "canonicalAppTreeUnchanged": root_app == "42ea29ec235225046a75959eb19eb386ac2f821d",
        "r9OutputRowsAndInventoryMatchRawGit": r9_rows["allRowsMatch"] and r9_rows["inventoryExact"],
        "r8InputRowsAndInventoryMatchRawGit": r8_rows["allRowsMatch"] and r8_rows["inventoryExact"],
        "exactSevenPathDelta": not removed and len(changed_paths) == 7 and changed_paths == sorted(declared_delta),
        "allR8FilesClassified": len(changed) == 3 and len(added) == 4 and not removed and len(r8_paths) == 23 and len(r9_paths) == 27,
        "matrixStatusesUnchangedAndOtherRowsPreserved": statuses_unchanged and other_rows_preserved,
        "allR9MatrixEvidenceReferencesResolve": all(ref["resolves"] for ref in r9_refs),
        "e0205UsesOnlyJsonReceipt": e02_row.get("evidence") == ["evidence/cli-negative-false-pass.json"],
        "finalizerOnlyChangesE0205Pointer": finalizer_only_pointer_change and new_pointer_list in r9_finalizer and b"evidence/cli-negative-false-pass.log" not in r9_finalizer,
        "correctionReceiptMatchesObservedChecks": all(value == "PASS" for key, value in receipt.get("checks", {}).items() if key != "inheritedE02BehavioralTestsRerun") and receipt.get("checks", {}).get("inheritedE02BehavioralTestsRerun") == "NOT RUN",
        "falsePassReceiptShowsUncachedFailExit1": negative_pass,
        "r7CandidateMatchesR9ManifestAndBinding": r9_manifest.get("candidateCommit") == R7_COMMIT == r9_binding.get("source", {}).get("r7CandidateCommit"),
        "e01RemainsOpen": r9_by_id["LIMIT-01"]["status"] == "NOT RUN" and r9_binding.get("e01Disposition") != "closed",
    }
    return {
        "format": "YOR-WORLD-FINISH-41-C1-RAW-GIT-RECHECK-v1",
        "candidate": {"branch": C1_BRANCH, "commit": C1_COMMIT, "remoteCommit": r9_remote, "parent": r9_parent,
                      "fullTree": r9_tree, "packageSubtree": r9_pkg_tree, "rootAppTree": root_app,
                      "r8Input": {"branch": R8_BRANCH, "commit": R8_COMMIT, "remoteCommit": r8_remote,
                                  "fullTree": r8_tree, "packageSubtree": r8_pkg_tree}},
        "manifest": {"sha256": hashlib.sha256(blob(C1_COMMIT, f"{C1_PACKAGE}/output-hashes.json")).hexdigest(),
                     "r9": r9_rows, "r8": r8_rows},
        "r8ToR9Delta": {"unchangedInheritedCount": len(r8_set & r9_set) - len(changed), "changedInherited": changed,
                        "added": added, "removed": removed, "declaredChangedPaths": sorted(declared_delta),
                        "matrixStatuses": {row["id"]: row["status"] for row in r9_matrix["results"]},
                        "matrixEvidenceReferences": r9_refs,
                        "e02Evidence": e02_row.get("evidence"),
                        "falsePassReceipt": {"status": negative.get("status"), "childExitCode": negative.get("exitCode"),
                                             "parsedStatus": negative.get("parsedResult", {}).get("status"),
                                             "stderr": negative.get("stderr"), "uncached": negative_pass,
                                             "sourceManifestHashZeroed": negative.get("mutation", {}).get("value") == "0" * 64,
                                             "originalReceiptUnchanged": negative.get("originalReceiptSha256BeforeAndAfter", {}).get("before") == negative.get("originalReceiptSha256BeforeAndAfter", {}).get("after")}},
        "checks": checks,
        "allChecksPass": all(checks.values()),
    }


a1 = a1_check()
c1 = c1_check()
for root, name, result in ((A1_ROOT, "a1-raw-git-verification.json", a1), (C1_ROOT, "c1-raw-git-verification.json", c1)):
    (root / "evidence" / name).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

for root, name, commit, path in (
    (A1_ROOT, "a1-maker-browser-binding.json", A1_COMMIT, f"{A1_PACKAGE}/evidence/browser-binding.json"),
    (A1_ROOT, "a1-maker-browser-results.json", A1_COMMIT, f"{A1_PACKAGE}/evidence/browser-results.json"),
    (A1_ROOT, "a1-maker-verification-results.json", A1_COMMIT, f"{A1_PACKAGE}/evidence/verification-results.json"),
    (A1_ROOT, "a1-maker-build-output-manifest.json", A1_COMMIT, f"{A1_PACKAGE}/evidence/build-output-manifest.json"),
    (C1_ROOT, "c1-r8-requirement-matrix.json", R8_COMMIT, f"{R8_PACKAGE}/requirement-matrix.json"),
    (C1_ROOT, "c1-r9-requirement-matrix.json", C1_COMMIT, f"{C1_PACKAGE}/requirement-matrix.json"),
    (C1_ROOT, "c1-r9-candidate-binding.json", C1_COMMIT, f"{C1_PACKAGE}/r9-candidate-binding.json"),
    (C1_ROOT, "c1-r9-correction-verification.json", C1_COMMIT, f"{C1_PACKAGE}/evidence/r9-correction-verification.json"),
    (C1_ROOT, "c1-cli-negative-false-pass.json", C1_COMMIT, f"{C1_PACKAGE}/evidence/cli-negative-false-pass.json"),
):
    (root / "evidence" / name).write_bytes(blob(commit, path))

pointer_diff = "".join(difflib.unified_diff(
    blob(R8_COMMIT, f"{R8_PACKAGE}/scripts/finalize.py").decode("utf-8").splitlines(keepends=True),
    blob(C1_COMMIT, f"{C1_PACKAGE}/scripts/finalize.py").decode("utf-8").splitlines(keepends=True),
    fromfile="R8 scripts/finalize.py", tofile="R9 scripts/finalize.py",
))
(C1_ROOT / "evidence/c1-finalizer-pointer-diff.patch").write_text(pointer_diff, encoding="utf-8")
print(json.dumps({"A1": a1, "C1": c1, "allChecksPass": a1["allChecksPass"] and c1["allChecksPass"]}, indent=2))
if not a1["allChecksPass"] or not c1["allChecksPass"]:
    sys.exit(1)
