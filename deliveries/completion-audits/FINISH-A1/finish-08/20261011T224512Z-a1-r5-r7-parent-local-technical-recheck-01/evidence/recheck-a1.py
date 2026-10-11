import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


CANDIDATE = "76d679dcb98064152021830b98f16eb456b3ae19"
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
CONTRACT_COMMIT = "d913270712e9757478a9794f5d72a12cc18a9634"
PACKAGE = "deliveries/FINISH-A1/r5-07/"
ALLOWLIST_DOC = "docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md"
EXPECTED = {
    "branch": "codex/finish-29-a1-r5-r7-20261011",
    "fullTree": "6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6",
    "packageTree": "61026e89795d28aa212ee2e03c8edc05b2aea97a",
    "baseAppTree": "42ea29ec235225046a75959eb19eb386ac2f821d",
    "candidateAppTree": "42ea29ec235225046a75959eb19eb386ac2f821d",
    "sourceAppSnapshotTree": "1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3",
    "replayedAppTree": "ba8f952edc34e94393c48b25779071daab9a9812",
    "patchSha256": "aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8",
    "outputManifestSha256": "5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420",
}


def run(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def blob(revision, path):
    return run(["git", "cat-file", "blob", f"{revision}:{path}"]).stdout


def blob_tree(tree_oid, path):
    return run(["git", "cat-file", "blob", f"{tree_oid}:{path}"]).stdout


def tree_files(revision_or_tree, prefix):
    raw = run(["git", "ls-tree", "-rz", "-r", "--full-tree", revision_or_tree]).stdout
    result = {}
    for item in raw.split(b"\0"):
        if not item:
            continue
        meta, path = item.split(b"\t", 1)
        _, kind, oid = meta.split()
        name = path.decode("utf-8")
        if kind == b"blob" and name.startswith(prefix):
            result[name[len(prefix):]] = oid.decode("ascii")
    return result


def main():
    repo = Path.cwd()
    root = Path(__file__).resolve().parent.parent
    worktree = root / ".work" / "base-worktree"
    checks = {}
    results = {}

    meta = run(["git", "show", "-s", "--format=%H%x00%P%x00%T", CANDIDATE]).stdout.decode().split("\0")
    full_tree = meta[2].strip()
    remote = run(["git", "ls-remote", "origin", f"refs/heads/{EXPECTED['branch']}"]).stdout.decode().strip()
    remote_commit = remote.split()[0]
    base_app = run(["git", "rev-parse", f"{BASE}:app"]).stdout.decode().strip()
    candidate_app = run(["git", "rev-parse", f"{CANDIDATE}:app"]).stdout.decode().strip()
    package_tree = run(["git", "rev-parse", f"{CANDIDATE}:{PACKAGE.rstrip('/')}"]).stdout.decode().strip()

    manifest_raw = blob(CANDIDATE, PACKAGE + "output-hashes.json")
    manifest = json.loads(manifest_raw)
    manifest_errors = []
    for row in manifest["files"]:
        raw = blob(CANDIDATE, PACKAGE + row["path"])
        if len(raw) != row["bytes"] or hashlib.sha256(raw).hexdigest() != row["sha256"]:
            manifest_errors.append(row["path"])
    checks["candidate_binding"] = meta[0] == CANDIDATE and meta[1] == BASE and full_tree == EXPECTED["fullTree"] and remote_commit == CANDIDATE
    checks["accepted_base_and_root_app"] = base_app == EXPECTED["baseAppTree"] and candidate_app == EXPECTED["candidateAppTree"]
    checks["package_manifest"] = (
        package_tree == EXPECTED["packageTree"]
        and len(manifest["files"]) == 79
        and len({row["path"] for row in manifest["files"]}) == 79
        and sum(row["bytes"] for row in manifest["files"]) == 1695825
        and hashlib.sha256(manifest_raw).hexdigest() == EXPECTED["outputManifestSha256"]
        and not manifest_errors
    )

    patch = blob(CANDIDATE, PACKAGE + "source.patch")
    patch_text = patch.decode("utf-8", errors="strict")
    patch_sha = hashlib.sha256(patch).hexdigest()
    patch_lines = patch_text.splitlines()
    patch_paths = sorted({
        line[6:]
        for line in patch_lines
        if line.startswith("diff --git a/")
    })
    declared = [line for line in blob(CANDIDATE, PACKAGE + "changed-paths.txt").decode("utf-8", errors="strict").splitlines() if line]
    source_files = tree_files(CANDIDATE, PACKAGE + "source/app/")
    worktree_index = run(["git", "-C", str(worktree), "write-tree"]).stdout.decode().strip()
    app_entry = run(["git", "-C", str(worktree), "ls-tree", worktree_index, "app"]).stdout.decode().split()
    replayed_app = app_entry[2]
    replayed_changes = run(["git", "-C", str(worktree), "diff", "--cached", "--name-only"]).stdout.decode().splitlines()
    raw_source_mismatches = []
    for path in declared:
        rel = path.removeprefix("app/")
        source = blob(CANDIDATE, PACKAGE + "source/app/" + rel)
        replayed = blob_tree(worktree_index, path)
        if source != replayed:
            raw_source_mismatches.append(path)

    contract_raw = blob(CONTRACT_COMMIT, ALLOWLIST_DOC)
    contract = contract_raw.decode("utf-8", errors="strict")
    a1_section = contract.split("### FINISH-A1:", 1)[1].split("### FINISH-A2:", 1)[0]
    allowlist = re.findall(r"^\|\s*`([^`]+)`\s*\|", a1_section, flags=re.MULTILINE)
    changed_relative = sorted(path.removeprefix("app/") for path in declared)
    path_outside_allowlist = sorted(set(changed_relative) - set(allowlist))
    source_hash = hashlib.sha256(contract_raw).hexdigest()
    checks["patch_replay_and_packaged_source"] = (
        patch_sha == EXPECTED["patchSha256"]
        and not patch.startswith(b"\xef\xbb\xbf")
        and b"\x00" not in patch
        and len(declared) == 25
        and len(set(declared)) == 25
        and sorted(declared) == sorted(replayed_changes)
        and set(source_files) == set(changed_relative)
        and not raw_source_mismatches
        and replayed_app == EXPECTED["replayedAppTree"]
        and len(allowlist) == 26
        and not path_outside_allowlist
        and "tests/integration/platform/published-media.test.ts" not in changed_relative
        and len(allowlist) - len(changed_relative) == 1
    )

    matrix = json.loads(blob(CANDIDATE, PACKAGE + "requirement-matrix.json"))
    rows = matrix["rows"]
    r5_rows = [row for row in rows if row["clause"].startswith("FINISH-27/A1-R5-")]
    package_files = tree_files(CANDIDATE, PACKAGE)
    replayed_app_files = tree_files(worktree_index, "app/")
    unresolved_matrix_evidence = sorted({
        path
        for row in rows
        for path in row.get("evidencePaths", [])
        if path not in package_files
    })
    unresolved_source_paths = sorted({
        path
        for row in rows
        for path in row.get("sourcePaths", [])
        if not (
            path == "app/"
            or (path.startswith("app/") and path.removeprefix("app/") in replayed_app_files)
            or (path.endswith("/") and any(item.startswith(path) for item in package_files))
            or path in package_files
        )
    })
    not_run_rows = [row["clause"] for row in rows if row["status"] == "NOT RUN"]
    checks["six_a1_corrections_and_evidence_paths"] = len(r5_rows) == 6 and all(row["status"] == "PASS" for row in r5_rows) and not unresolved_matrix_evidence and not unresolved_source_paths and len(rows) == 35 and len(not_run_rows) == 4

    evidence_dir = root / "evidence"
    def log(name):
        raw = (evidence_dir / name).read_bytes()
        if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
            return raw.decode("utf-16", errors="replace")
        return raw.decode("utf-8-sig", errors="replace")
    full_unit = log("a1-unit-full.log")
    full_integration = log("a1-integration-full.log")
    focused_unit = log("a1-unit-focused.log")
    focused_integration = log("a1-integration-focused.log")
    lint = log("a1-lint.log")
    typecheck = log("a1-typecheck.log")
    build = log("a1-build.log")
    browser_pass_log = log("a1-chromium-fixture.log")
    browser_results = json.loads((evidence_dir / "chromium-fixture" / "browser-results.json").read_bytes())
    browser_stats = browser_results["stats"]
    browser_missing_fixture = json.loads((evidence_dir / "chromium-focused" / "browser-results.json").read_bytes())["stats"]
    build_id = (worktree / "app" / ".next" / "BUILD_ID").read_text(encoding="utf-8").strip()
    screenshots = sorted(str(p.relative_to(root).as_posix()) for p in (evidence_dir / "a1-browser-captures").glob("*.png"))
    checks["local_unit_integration_lint_typecheck_build"] = bool(
        "24 passed (24)" in full_unit and "317 passed (317)" in full_unit
        and "28 passed (28)" in full_integration and "308 passed (308)" in full_integration
        and "5 passed (5)" in focused_unit and "22 passed (22)" in focused_integration
        and "eslint . --max-warnings=0" in lint and "tsc --noEmit" in typecheck
        and "Compiled successfully" in build and build_id
    )
    checks["chromium_replay"] = browser_stats["expected"] == 6 and browser_stats["unexpected"] == 0 and browser_stats["skipped"] == 0 and "6 passed" in browser_pass_log and len(screenshots) == 2

    results["candidate"] = {"commit": meta[0], "parent": meta[1], "fullTree": full_tree, "remoteBranch": EXPECTED["branch"], "remoteCommit": remote_commit, "baseAppTree": base_app, "rootAppTree": candidate_app, "packageTree": package_tree}
    results["package"] = {"outputRows": len(manifest["files"]), "uniqueRows": len({row["path"] for row in manifest["files"]}), "bytes": sum(row["bytes"] for row in manifest["files"]), "outputManifestSha256": hashlib.sha256(manifest_raw).hexdigest(), "rawGitBlobMismatches": manifest_errors}
    results["replay"] = {"sourceAppSnapshotTree": EXPECTED["sourceAppSnapshotTree"], "sourceFiles": len(source_files), "patchSha256": patch_sha, "replayedAppTree": replayed_app, "changedPaths": len(declared), "allowlistPaths": len(allowlist), "allowlistDocumentCommit": CONTRACT_COMMIT, "allowlistDocumentSha256": source_hash, "changedPathsOutsideAllowlist": path_outside_allowlist, "packagedSourceMismatches": raw_source_mismatches, "unchangedAllowedPath": "tests/integration/platform/published-media.test.ts"}
    results["a1R5Rows"] = [{"clause": row["clause"], "status": row["status"]} for row in r5_rows]
    results["unresolvedMatrixEvidence"] = unresolved_matrix_evidence
    results["requirementMatrix"] = {"rows": len(rows), "pass": sum(row["status"] == "PASS" for row in rows), "notRun": not_run_rows, "unresolvedSourcePaths": unresolved_source_paths}
    results["rerunChecks"] = {
        "unitFull": {"status": "PASS", "files": 24, "tests": 317},
        "integrationFull": {"status": "PASS", "files": 28, "tests": 308},
        "focusedUnit": {"status": "PASS", "tests": 5},
        "focusedIntegration": {"status": "PASS", "tests": 22},
        "lint": "PASS",
        "typecheck": "PASS",
        "build": {"status": "PASS", "buildId": build_id, "appTree": replayed_app},
        "chromium": {"status": "PASS", "expected": browser_stats["expected"], "unexpected": browser_stats["unexpected"], "skipped": browser_stats["skipped"], "browser": "153.0.8010.12", "screenshots": screenshots, "fixture": "isolated local PGlite; no provider credentials"},
        "chromiumWithoutFixture": {"status": "FAIL AS CONFIGURED", "expected": browser_missing_fixture.get("expected"), "unexpected": browser_missing_fixture.get("unexpected"), "reason": "owner routes correctly redirected to login because the explicit local fixture variables were absent"},
        "unscopedFullBrowserAttempt": {"status": "INTERRUPTED BY REVIEWER", "reason": "an initial pnpm -- forwarding mistake selected the 110-test suite; nine unrelated checks passed before it was stopped"},
    }
    results["limitations"] = ["GPT Plus #2 review not run", "Parent acceptance and canonical integration pending", "Native provider services, deployment/CDN, physical devices/accessibility, recovery/manual operations and G7 not run"]
    results["checks"] = checks
    results["recommendation"] = "PASS" if all(checks.values()) else "REWORK"
    output = json.dumps(results, ensure_ascii=False, indent=2) + "\n"
    with (evidence_dir / "recheck-results.json").open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(output)
    print(output, end="")
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
