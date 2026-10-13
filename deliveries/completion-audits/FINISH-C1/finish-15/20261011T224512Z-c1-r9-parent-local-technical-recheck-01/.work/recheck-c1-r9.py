import difflib
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from pathlib import PurePosixPath


COMMIT = "3dda9a616033375768f3d5f60f8c653d504f7c8c"
PARENT = "c398876583bc337c069414b79364e3fdea745879"
R9 = "deliveries/FINISH-C1-R9/"
R8 = "deliveries/FINISH-C1-R8/"
EXPECTED = {
    "fullTree": "5a38d405499737ff40b0141a64845c244a9e4813",
    "r9Tree": "aa097f12adff2dbac2c88d6300c949f37bf34251",
    "r8Tree": "798de513703f3d7e76f8d82edb85257d32894681",
    "r9Subtree": "aa097f12adff2dbac2c88d6300c949f37bf34251",
    "r8Subtree": "da822d0362e06e92497001583afb7405b7ccd472",
    "appTree": "42ea29ec235225046a75959eb19eb386ac2f821d",
    "manifestSha256": "31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465",
    "r8ManifestSha256": "183dcf8ae59cf4bf0ea5a44a7f9ca71ec1ddd344ea7685345dfd2ea2eb9e3bd0",
    "branch": "codex/finish-30-c1-r9-20261011",
}


def run(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def blob(rev, path):
    return run(["git", "cat-file", "blob", f"{rev}:{path}"]).stdout


def tree(rev, prefix):
    result = {}
    raw = run(["git", "ls-tree", "-rz", "-r", "--full-tree", rev]).stdout
    for row in raw.split(b"\0"):
        if not row:
            continue
        meta, path = row.split(b"\t", 1)
        _, kind, oid = meta.split()
        name = path.decode("utf-8")
        if kind == b"blob" and name.startswith(prefix):
            result[name[len(prefix):]] = oid.decode("ascii")
    return result


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    checks = {}
    results = {}
    commands = []

    version = run(["git", "--version"]).stdout.decode().strip()
    remote = run(["git", "ls-remote", "origin", f"refs/heads/{EXPECTED['branch']}"])
    remote_text = remote.stdout.decode().strip()
    commands.append({"argv": ["git", "ls-remote", "origin", f"refs/heads/{EXPECTED['branch']}"], "exitCode": 0, "stdout": remote_text, "stderr": remote.stderr.decode()})
    commit_meta = run(["git", "show", "-s", "--format=%H%x00%P%x00%T", COMMIT]).stdout.decode().split("\0")
    full_tree = commit_meta[2].strip()
    app_tree = run(["git", "rev-parse", f"{COMMIT}:app"]).stdout.decode().strip()
    r9_tree = run(["git", "rev-parse", f"{COMMIT}:{R9.rstrip('/')}"]).stdout.decode().strip()
    r8_tree = run(["git", "rev-parse", f"{PARENT}:{R8.rstrip('/')}"]).stdout.decode().strip()
    checks["candidate_identity"] = commit_meta[0] == COMMIT and commit_meta[1] == PARENT and full_tree == EXPECTED["fullTree"]
    checks["remote_branch"] = remote_text.split()[0] == COMMIT
    checks["root_app_tree"] = app_tree == EXPECTED["appTree"]
    checks["delivery_subtrees"] = r9_tree == EXPECTED["r9Subtree"] and r8_tree == EXPECTED["r8Subtree"]
    results["binding"] = {"commit": commit_meta[0], "parent": commit_meta[1], "fullTree": full_tree, "remoteBranch": EXPECTED["branch"], "remoteCommit": remote_text.split()[0], "rootAppTree": app_tree, "r9Subtree": r9_tree, "r8Subtree": r8_tree}

    r9_files = tree(COMMIT, R9)
    r8_files = tree(PARENT, R8)
    manifest_bytes = blob(COMMIT, R9 + "output-hashes.json")
    manifest = json.loads(manifest_bytes)
    rows = manifest["outputs"]
    manifest_pass = True
    row_errors = []
    for row in rows:
        path = row["path"]
        raw = blob(COMMIT, R9 + path)
        if digest(raw) != row["sha256"] or len(raw) != row["bytes"]:
            manifest_pass = False
            row_errors.append(path)
    checks["output_manifest"] = (
        len(rows) == 26
        and len({row["path"] for row in rows}) == 26
        and sum(row["bytes"] for row in rows) == 145757
        and digest(manifest_bytes) == EXPECTED["manifestSha256"]
        and manifest_pass
    )
    results["outputManifest"] = {"rowCount": len(rows), "uniquePaths": len({row["path"] for row in rows}), "totalBytes": sum(row["bytes"] for row in rows), "manifestSha256": digest(manifest_bytes), "rawBlobMismatches": row_errors}

    common = set(r9_files) & set(r8_files)
    changed = sorted(path for path in common if r9_files[path] != r8_files[path])
    new = sorted(set(r9_files) - set(r8_files))
    changed_paths = json.loads(blob(COMMIT, R9 + "changed-paths.json"))["changedPaths"]
    expected_changes = sorted(changed + new)
    checks["relative_changed_inventory"] = changed_paths == expected_changes and changed == ["output-hashes.json", "requirement-matrix.json", "scripts/finalize.py"] and len(new) == 4

    matrix = json.loads(blob(COMMIT, R9 + "requirement-matrix.json"))
    old_matrix = json.loads(blob(PARENT, R8 + "requirement-matrix.json"))
    old_expected = json.loads(json.dumps(old_matrix))
    old_expected["results"][4]["evidence"] = ["evidence/cli-negative-false-pass.json"]
    matrix_refs = [path for row in matrix["results"] for path in row.get("evidence", [])]
    missing_refs = sorted(set(path for path in matrix_refs if path not in r9_files))
    statuses_same = [(row["id"], row["status"]) for row in matrix["results"]] == [(row["id"], row["status"]) for row in old_matrix["results"]]
    checks["matrix_and_paths"] = matrix == old_expected and statuses_same and not missing_refs and len(matrix_refs) == 10

    finalizer_r9 = blob(COMMIT, R9 + "scripts/finalize.py").decode("utf-8").splitlines()
    finalizer_r8 = blob(PARENT, R8 + "scripts/finalize.py").decode("utf-8").splitlines()
    diff = list(difflib.unified_diff(finalizer_r8, finalizer_r9, n=0))
    checks["finalizer_template"] = len(diff) == 5 and '"evidence/cli-negative-false-pass.json"]' in "\n".join(diff) and "cli-negative-false-pass.log" in "\n".join(diff)

    receipt = json.loads(blob(COMMIT, R9 + "evidence/cli-negative-false-pass.json"))
    stdout = json.loads(receipt["stdout"])
    receipt_ok = (
        receipt["exitCode"] == 1
        and receipt["parsedResult"]["status"] == "FAIL"
        and receipt["parsedResult"] == stdout
        and receipt["stderr"] == ""
        and receipt["mutation"]["field"] == "sourceManifest.sha256"
        and receipt["mutation"]["value"] == "0" * 64
        and receipt["candidateCommit"] == "e2670d4152c461005da86b392dbcea12cec740bf"
        and receipt["originalReceiptSha256BeforeAndAfter"]["before"] == receipt["originalReceiptSha256BeforeAndAfter"]["after"]
        and "--check-output-manifest" in receipt["command"]
        and COMMIT == commit_meta[0]
    )
    checks["false_pass_receipt"] = receipt_ok
    checks["correction_limits"] = json.loads(blob(COMMIT, R9 + "evidence/r9-correction-verification.json"))["checks"]["inheritedE02BehavioralTestsRerun"] == "NOT RUN"
    results["lineage"] = {"r9FileCount": len(r9_files), "r8FileCount": len(r8_files), "unchangedOverlap": len(common) - len(changed), "changedInherited": changed, "newFiles": new, "declaredChangedPaths": changed_paths, "missingMatrixEvidencePaths": missing_refs, "matrixStatusPairs": [(row["id"], row["status"]) for row in matrix["results"]], "finalizerDiff": diff}
    results["falsePassReceipt"] = {"exitCode": receipt["exitCode"], "parsedStatus": receipt["parsedResult"]["status"], "errors": receipt["parsedResult"].get("errors"), "stderr": receipt["stderr"], "stdout": receipt["stdout"], "command": receipt["command"], "originalReceiptSha256BeforeAndAfter": receipt["originalReceiptSha256BeforeAndAfter"]}
    results["commands"] = commands
    results["toolVersions"] = {"git": version, "python": sys.version.split()[0]}
    results["checks"] = checks
    results["recommendation"] = "PASS" if all(checks.values()) else "REWORK"
    output = json.dumps(results, ensure_ascii=False, indent=2) + "\n"
    evidence = Path(__file__).resolve().parent.parent / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    with (evidence / "recheck-results.json").open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(output)
    print(output, end="")
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
