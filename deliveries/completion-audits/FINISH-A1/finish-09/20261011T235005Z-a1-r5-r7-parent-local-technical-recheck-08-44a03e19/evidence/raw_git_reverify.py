"""Recheck FINISH-43 A1-R7 and C1-R9 receipts from raw Git objects."""
from __future__ import annotations

import difflib
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
A1_ROOT = ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T235005Z-a1-r5-r7-parent-local-technical-recheck-08-44a03e19"
C1_ROOT = ROOT / "deliveries/completion-audits/FINISH-C1/finish-16/20261011T235005Z-c1-r9-parent-local-technical-recheck-08-44a03e19"
A1_COMMIT = "76d679dcb98064152021830b98f16eb456b3ae19"
A1_BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
A1_BRANCH = "codex/finish-29-a1-r5-r7-20261011"
A1_PACKAGE = "deliveries/FINISH-A1/r5-07"
CONTRACT_COMMIT = "d913270712e9757478a9794f5d72a12cc18a9634"
CONTRACT_PATH = "docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md"
C1_COMMIT = "3dda9a616033375768f3d5f60f8c653d504f7c8c"
R8_COMMIT = "c398876583bc337c069414b79364e3fdea745879"
R7_COMMIT = "e2670d4152c461005da86b392dbcea12cec740bf"
C1_BRANCH = "codex/finish-30-c1-r9-20261011"
R8_BRANCH = "codex/finish-28-c1-r8-20261011"
C1_PACKAGE = "deliveries/FINISH-C1-R9"
R8_PACKAGE = "deliveries/FINISH-C1-R8"


def git(*args: str, check: bool = True) -> bytes:
    result = subprocess.run(["git", *args], cwd=ROOT, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


def text(*args: str) -> str:
    return git(*args).decode("utf-8").strip()


def blob(commit: str, path: str) -> bytes:
    return git("cat-file", "blob", f"{commit}:{path}")


def obj(commit: str, path: str):
    return json.loads(blob(commit, path).decode("utf-8"))


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def remote(branch: str) -> str:
    raw = git("ls-remote", "origin", f"refs/heads/{branch}").decode("utf-8").strip()
    return raw.split()[0] if raw else ""


def paths(commit: str, prefix: str) -> list[str]:
    raw = git("ls-tree", "-r", "-z", "--name-only", commit, "--", prefix)
    return sorted(item.decode("utf-8")[len(prefix) + 1:] for item in raw.split(b"\0") if item)


def manifest_check(commit: str, prefix: str, manifest: dict, rows_key: str) -> dict:
    rows = manifest[rows_key]
    errors = []
    for row in rows:
        raw = blob(commit, f"{prefix}/{row['path']}")
        actual = {"bytes": len(raw), "sha256": sha(raw)}
        if actual != {"bytes": row["bytes"], "sha256": row["sha256"]}:
            errors.append({"path": row["path"], "declared": row, "actual": actual})
    inventory = paths(commit, prefix)
    expected = sorted([row["path"] for row in rows] + ["output-hashes.json"])
    return {"rowCount": len(rows), "rowBytes": sum(row["bytes"] for row in rows), "allRowsMatch": not errors,
            "rowErrors": errors, "inventoryExact": inventory == expected, "inventoryCountIncludingManifest": len(inventory),
            "selfHashExcluded": "output-hashes.json" not in {row["path"] for row in rows}}


def check_a1() -> dict:
    commit_tree = text("rev-parse", f"{A1_COMMIT}^{{tree}}")
    package_tree = text("rev-parse", f"{A1_COMMIT}:{A1_PACKAGE}")
    parent = text("rev-parse", f"{A1_COMMIT}^")
    base_app = text("rev-parse", f"{A1_BASE}:app")
    root_app = text("rev-parse", f"{A1_COMMIT}:app")
    manifest_raw = blob(A1_COMMIT, f"{A1_PACKAGE}/output-hashes.json")
    manifest = json.loads(manifest_raw.decode("utf-8"))
    output_rows = manifest_check(A1_COMMIT, A1_PACKAGE, manifest, "files")
    patch = blob(A1_COMMIT, f"{A1_PACKAGE}/source.patch")
    replay = json.loads((A1_ROOT / ".work/a1-replay-verification.json").read_text(encoding="utf-8"))
    allowlist_contract = blob(CONTRACT_COMMIT, CONTRACT_PATH).decode("utf-8")
    first = allowlist_contract.index("### FINISH-A1:")
    second = allowlist_contract.index("### FINISH-A2:", first)
    allowlist = re.findall(r"^\| `([^`]+)` \| (?:existing|new) \|", allowlist_contract[first:second], flags=re.MULTILINE)
    checks = {
        "remoteBranchEqualsCandidate": remote(A1_BRANCH) == A1_COMMIT,
        "parentIsPinnedBase": parent == A1_BASE,
        "fullTreeMatchesPacket": commit_tree == "6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6",
        "packageSubtreeMatchesPacket": package_tree == "61026e89795d28aa212ee2e03c8edc05b2aea97a",
        "outputRowsMatchRawGitAndInventory": output_rows["allRowsMatch"] and output_rows["inventoryExact"],
        "rootAppTreeUnchanged": base_app == root_app == "42ea29ec235225046a75959eb19eb386ac2f821d",
        "patchStrictUtf8NoBomNulAndHash": patch.decode("utf-8", errors="strict") is not None and not patch.startswith(b"\xef\xbb\xbf") and b"\0" not in patch and sha(patch) == manifest["sourcePatchSha256"],
        "exactBaseReplayAndChangedPathInventoryPass": replay["patch"]["applyCheckExitCode"] == 0 and replay["declaredPathsMatch"] is True and replay["changedPathCount"] == 25,
        "packagedSourcesMatchReplayAndAllowlist": replay["packageSourcesMatchReplay"] is True and replay["changedPathsWithinFrozenAllowlist"] is True and len(allowlist) == replay["frozenAllowlistCount"] == 26,
        "replayAppTreeMatchesCandidateManifest": replay["appTreeMatch"] is True and replay["replayedAppTree"] == manifest["candidateAppTree"],
    }
    return {"format": "YOR-WORLD-FINISH-43-A1-RAW-GIT-VERIFICATION-v1",
            "candidate": {"branch": A1_BRANCH, "commit": A1_COMMIT, "remoteCommit": remote(A1_BRANCH), "parent": parent,
                          "tree": commit_tree, "packageSubtree": package_tree, "base": A1_BASE,
                          "rootAppTree": root_app, "baseAppTree": base_app},
            "outputManifest": {"sha256": sha(manifest_raw), **output_rows},
            "patch": {"bytes": len(patch), "sha256": sha(patch), "changedPaths": replay["changedPaths"],
                      "changedPathCount": replay["changedPathCount"], "frozenAllowlistCount": len(allowlist),
                      "allowlistContractCommit": CONTRACT_COMMIT},
            "checks": checks, "allChecksPass": all(checks.values())}


def check_c1() -> dict:
    r9_tree = text("rev-parse", f"{C1_COMMIT}^{{tree}}")
    r9_package_tree = text("rev-parse", f"{C1_COMMIT}:{C1_PACKAGE}")
    r9_parent = text("rev-parse", f"{C1_COMMIT}^")
    r8_tree = text("rev-parse", f"{R8_COMMIT}^{{tree}}")
    r8_package_tree = text("rev-parse", f"{R8_COMMIT}:{R8_PACKAGE}")
    r9_manifest_raw = blob(C1_COMMIT, f"{C1_PACKAGE}/output-hashes.json")
    r8_manifest = obj(R8_COMMIT, f"{R8_PACKAGE}/output-hashes.json")
    r9_manifest = json.loads(r9_manifest_raw.decode("utf-8"))
    r9_outputs = manifest_check(C1_COMMIT, C1_PACKAGE, r9_manifest, "outputs")
    r8_outputs = manifest_check(R8_COMMIT, R8_PACKAGE, r8_manifest, "outputs")
    r9_paths = paths(C1_COMMIT, C1_PACKAGE)
    r8_paths = paths(R8_COMMIT, R8_PACKAGE)
    r9_set, r8_set = set(r9_paths), set(r8_paths)
    added = sorted(r9_set - r8_set)
    removed = sorted(r8_set - r9_set)
    changed = sorted(path for path in r9_set & r8_set if blob(C1_COMMIT, f"{C1_PACKAGE}/{path}") != blob(R8_COMMIT, f"{R8_PACKAGE}/{path}"))
    declared = sorted(obj(C1_COMMIT, f"{C1_PACKAGE}/changed-paths.json")["changedPaths"])
    r9_matrix = obj(C1_COMMIT, f"{C1_PACKAGE}/requirement-matrix.json")
    r8_matrix = obj(R8_COMMIT, f"{R8_PACKAGE}/requirement-matrix.json")
    r9_by_id = {row["id"]: row for row in r9_matrix["results"]}
    r8_by_id = {row["id"]: row for row in r8_matrix["results"]}
    statuses_same = [(row["id"], row["status"]) for row in r9_matrix["results"]] == [(row["id"], row["status"]) for row in r8_matrix["results"]]
    rows_preserved = all(r9_by_id[key] == ({**value, "evidence": ["evidence/cli-negative-false-pass.json"]} if key == "E-02-05" else value) for key, value in r8_by_id.items())
    references = [{"id": row["id"], "path": path, "resolves": path in r9_set}
                  for row in r9_matrix["results"] for path in row.get("evidence", [])]
    old_finalizer = blob(R8_COMMIT, f"{R8_PACKAGE}/scripts/finalize.py")
    new_finalizer = blob(C1_COMMIT, f"{C1_PACKAGE}/scripts/finalize.py")
    old_list = b'["evidence/cli-negative-false-pass.json", "evidence/cli-negative-false-pass.log"]'
    new_list = b'["evidence/cli-negative-false-pass.json"]'
    finalizer_diff = "".join(difflib.unified_diff(old_finalizer.decode("utf-8").splitlines(keepends=True),
                                                  new_finalizer.decode("utf-8").splitlines(keepends=True),
                                                  fromfile="R8 finalize.py", tofile="R9 finalize.py"))
    receipt = obj(C1_COMMIT, f"{C1_PACKAGE}/evidence/r9-correction-verification.json")
    false_receipt = obj(C1_COMMIT, f"{C1_PACKAGE}/evidence/cli-negative-false-pass.json")
    parsed_stdout = json.loads(false_receipt["stdout"])
    r9_binding = obj(C1_COMMIT, f"{C1_PACKAGE}/r9-candidate-binding.json")
    r9_remote = remote(C1_BRANCH)
    r8_remote = remote(R8_BRANCH)
    root_app = text("rev-parse", f"{C1_COMMIT}:app")
    checks = {
        "r9RemoteBranchEqualsCandidate": r9_remote == C1_COMMIT,
        "r9ParentIsExactR8Commit": r9_parent == R8_COMMIT,
        "r8RemoteBranchEqualsInput": r8_remote == R8_COMMIT,
        "r9TreeAndPackageMatchPacket": r9_tree == "5a38d405499737ff40b0141a64845c244a9e4813" and r9_package_tree == "aa097f12adff2dbac2c88d6300c949f37bf34251",
        "r8TreeAndPackageMatchPinnedInput": r8_tree == "798de513703f3d7e76f8d82edb85257d32894681" and r8_package_tree == "da822d0362e06e92497001583afb7405b7ccd472",
        "r9AndR8OutputRowsAndInventoriesMatch": r9_outputs["allRowsMatch"] and r9_outputs["inventoryExact"] and r8_outputs["allRowsMatch"] and r8_outputs["inventoryExact"],
        "canonicalRootAppUnchanged": root_app == "42ea29ec235225046a75959eb19eb386ac2f821d",
        "exactSevenPathDelta": not removed and len(changed) == 3 and len(added) == 4 and sorted(changed + added) == declared and len(r8_paths) == 23 and len(r9_paths) == 27,
        "allTwentyInheritedUnchangedFilesVerified": len(r8_set & r9_set) - len(changed) == 20,
        "matrixStatusesAndNonE0205RowsPreserved": statuses_same and rows_preserved,
        "everyMatrixEvidenceReferenceResolves": all(item["resolves"] for item in references),
        "e0205UsesOnlyJsonReceipt": r9_by_id["E-02-05"]["evidence"] == ["evidence/cli-negative-false-pass.json"],
        "finalizerChangesOnlyE0205EvidencePointer": old_list in old_finalizer and old_finalizer.replace(old_list, new_list) == new_finalizer and b"evidence/cli-negative-false-pass.log" not in new_finalizer,
        "correctionReceiptMatchesObservedChecks": all(value == "PASS" for key, value in receipt["checks"].items() if key != "inheritedE02BehavioralTestsRerun") and receipt["checks"]["inheritedE02BehavioralTestsRerun"] == "NOT RUN",
        "falsePassReceiptIsUncachedFailExitOne": false_receipt["status"] == "PASS" and false_receipt["exitCode"] == 1 and false_receipt["parsedResult"]["status"] == "FAIL" and parsed_stdout["status"] == "FAIL" and false_receipt["stderr"] == "" and false_receipt["mutation"]["field"] == "sourceManifest.sha256" and false_receipt["mutation"]["value"] == "0" * 64 and false_receipt["originalReceiptSha256BeforeAndAfter"]["before"] == false_receipt["originalReceiptSha256BeforeAndAfter"]["after"] and false_receipt["cache"].startswith("new Python process"),
        "r7CommitBoundAcrossManifestAndBinding": r9_manifest["candidateCommit"] == R7_COMMIT == r9_binding["source"]["r7CandidateCommit"],
        "e01RemainsNotRun": r9_by_id["LIMIT-01"]["status"] == "NOT RUN",
    }
    evidence = C1_ROOT / "evidence"
    for name, commit, path in (
        ("c1-r8-requirement-matrix.json", R8_COMMIT, f"{R8_PACKAGE}/requirement-matrix.json"),
        ("c1-r9-requirement-matrix.json", C1_COMMIT, f"{C1_PACKAGE}/requirement-matrix.json"),
        ("c1-r9-candidate-binding.json", C1_COMMIT, f"{C1_PACKAGE}/r9-candidate-binding.json"),
        ("c1-r9-correction-verification.json", C1_COMMIT, f"{C1_PACKAGE}/evidence/r9-correction-verification.json"),
        ("c1-cli-negative-false-pass.json", C1_COMMIT, f"{C1_PACKAGE}/evidence/cli-negative-false-pass.json"),
    ):
        (evidence / name).write_bytes(blob(commit, path))
    (evidence / "c1-finalizer-pointer-diff.patch").write_text(finalizer_diff, encoding="utf-8")
    return {"format": "YOR-WORLD-FINISH-43-C1-RAW-GIT-VERIFICATION-v1",
            "candidate": {"branch": C1_BRANCH, "commit": C1_COMMIT, "remoteCommit": r9_remote, "parent": r9_parent,
                          "tree": r9_tree, "packageSubtree": r9_package_tree, "rootAppTree": root_app,
                          "r8Input": {"branch": R8_BRANCH, "commit": R8_COMMIT, "remoteCommit": r8_remote, "tree": r8_tree, "packageSubtree": r8_package_tree}},
            "r9OutputManifest": {"sha256": sha(r9_manifest_raw), **r9_outputs}, "r8OutputManifest": r8_outputs,
            "r8ToR9Delta": {"unchangedInheritedCount": 20, "changedInherited": changed, "added": added, "removed": removed,
                            "declaredChangedPaths": declared, "matrixStatuses": {row["id"]: row["status"] for row in r9_matrix["results"]},
                            "matrixEvidenceReferences": references, "falsePassReceipt": {"status": false_receipt["status"],
                                "childExitCode": false_receipt["exitCode"], "parsedStatus": false_receipt["parsedResult"]["status"],
                                "stderr": false_receipt["stderr"], "uncached": false_receipt["cache"],
                                "sourceManifestHashZeroed": false_receipt["mutation"]["value"] == "0" * 64,
                                "originalReceiptUnchanged": false_receipt["originalReceiptSha256BeforeAndAfter"]["before"] == false_receipt["originalReceiptSha256BeforeAndAfter"]["after"]}},
            "checks": checks, "allChecksPass": all(checks.values())}


a1 = check_a1()
c1 = check_c1()
(A1_ROOT / "evidence/a1-raw-git-verification.json").write_text(json.dumps(a1, indent=2) + "\n", encoding="utf-8")
(C1_ROOT / "evidence/c1-raw-git-verification.json").write_text(json.dumps(c1, indent=2) + "\n", encoding="utf-8")

a1_candidate = A1_COMMIT
browser_binding = obj(A1_COMMIT, f"{A1_PACKAGE}/evidence/browser-binding.json")
browser_results_raw = blob(A1_COMMIT, f"{A1_PACKAGE}/evidence/browser-results.json")
browser_results = json.loads(browser_results_raw.decode("utf-8"))
build_manifest_raw = blob(A1_COMMIT, f"{A1_PACKAGE}/evidence/build-output-manifest.json")
build_manifest = json.loads(build_manifest_raw.decode("utf-8"))
chromium_receipt = obj(A1_COMMIT, f"{A1_PACKAGE}/evidence/chromium-final.result.json")
replay_build = obj(A1_COMMIT, f"{A1_PACKAGE}/evidence/replay-next-build.result.json")
initial_build = obj(A1_COMMIT, f"{A1_PACKAGE}/evidence/next-build.result.json")
playwright_hash_matches = sha(blob(A1_COMMIT, f"{A1_PACKAGE}/evidence/chromium-final.result.json")) == browser_binding["playwrightResultSha256"]
binding_checks = {
    "buildManifestHashMatchesBinding": sha(build_manifest_raw) == browser_binding["buildManifestSha256"],
    "browserResultsHashMatchesBinding": sha(browser_results_raw) == browser_binding["browserResultsSha256"],
    "playwrightReceiptHashMatches": playwright_hash_matches,
    "chromiumReceiptMatchesCandidateTreeAndBuildId": chromium_receipt["candidate_app_tree"] == browser_binding["candidateAppTree"] and chromium_receipt["build_id"] == browser_binding["buildId"],
    "browserReceiptExitZero": chromium_receipt["exit_code"] == browser_binding["playwrightExitCode"] == 0,
    "browserResultCountAndFlakiness": browser_results["stats"]["expected"] == 6 and browser_results["stats"]["unexpected"] == 0 and browser_results["stats"]["skipped"] == 0 and browser_results["stats"]["flaky"] == 0 and not browser_results["errors"],
    "successfulExactBaseReplayBuildReceipt": replay_build["exit_code"] == 0,
    "initialFailedBuildAttemptRetained": initial_build["exit_code"] == 1,
}
maker_binding = {"format": "YOR-WORLD-FINISH-43-A1-MAKER-BUILD-BROWSER-BINDING-v1", "candidateCommit": a1_candidate,
                 "candidateAppTree": browser_binding["candidateAppTree"], "patchSha256": browser_binding["sourcePatchSha256"],
                 "checks": binding_checks, "allChecksPass": all(binding_checks.values()),
                 "build": {"initialBuildExitCode": initial_build["exit_code"], "exactBaseReplayBuildExitCode": replay_build["exit_code"],
                           "buildId": browser_binding["buildId"], "buildManifestSha256": sha(build_manifest_raw),
                           "physicalBuildOutputFilesIndependentlyRehashed": False},
                 "browser": {"expected": browser_results["stats"]["expected"], "unexpected": browser_results["stats"]["unexpected"],
                             "skipped": browser_results["stats"]["skipped"], "flaky": browser_results["stats"]["flaky"],
                             "browserVersion": browser_binding["browserVersion"], "playwrightVersion": browser_results["config"]["version"],
                             "parentFreshBrowserRun": "NOT RUN"}}
(A1_ROOT / "evidence/a1-maker-binding-verification.json").write_text(json.dumps(maker_binding, indent=2) + "\n", encoding="utf-8")
for name, path in (
    ("a1-maker-browser-binding.json", "browser-binding.json"),
    ("a1-maker-browser-results.json", "browser-results.json"),
    ("a1-maker-verification-results.json", "verification-results.json"),
    ("a1-maker-build-output-manifest.json", "build-output-manifest.json"),
):
    (A1_ROOT / "evidence" / name).write_bytes(blob(A1_COMMIT, f"{A1_PACKAGE}/evidence/{path}"))

print(json.dumps({"A1": a1, "C1": c1, "A1MakerBindings": maker_binding,
                  "allChecksPass": a1["allChecksPass"] and c1["allChecksPass"] and maker_binding["allChecksPass"]}, indent=2))
if not a1["allChecksPass"] or not c1["allChecksPass"] or not maker_binding["allChecksPass"]:
    sys.exit(1)
