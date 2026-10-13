from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(r"C:\Users\yoray\Projects\Yor World")
COMMIT = "3dda9a616033375768f3d5f60f8c653d504f7c8c"
PARENT = "c398876583bc337c069414b79364e3fdea745879"
BRANCH = "codex/finish-30-c1-r9-20261011"
R8 = "deliveries/FINISH-C1-R8"
R9 = "deliveries/FINISH-C1-R9"
OUT = ROOT / "deliveries/completion-audits/FINISH-C1/finish-15/20261011T193547Z-c1-r9-parent-local-recheck-01/evidence/r9-lineage-check.json"

def git(*args: str) -> bytes:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

def raw(commit: str, path: str) -> bytes:
    return git("show", f"{commit}:{path}")

def paths(commit: str, prefix: str) -> set[str]:
    return {x[len(prefix)+1:] for x in git("ls-tree", "-r", "--name-only", commit, "--", prefix).decode().splitlines()}

errors: list[str] = []
checks: dict[str, object] = {}
r8paths, r9paths = paths(PARENT, R8), paths(COMMIT, R9)
checks["r8PathCount"] = len(r8paths)
checks["r9TrackedPathCount"] = len(r9paths)
checks["candidateParent"] = git("rev-parse", f"{COMMIT}^").decode().strip()
checks["candidateTree"] = git("rev-parse", f"{COMMIT}^{{tree}}").decode().strip()
checks["r9Subtree"] = git("rev-parse", f"{COMMIT}:{R9}").decode().strip()
checks["rootAppTree"] = git("rev-parse", f"{COMMIT}:app").decode().strip()
if checks["candidateParent"] != PARENT: errors.append("candidate parent differs from exact R8 commit")
if checks["candidateTree"] != "5a38d405499737ff40b0141a64845c244a9e4813": errors.append("candidate tree mismatch")
if checks["r9Subtree"] != "aa097f12adff2dbac2c88d6300c949f37bf34251": errors.append("R9 subtree mismatch")
if checks["rootAppTree"] != "42ea29ec235225046a75959eb19eb386ac2f821d": errors.append("canonical app tree changed")
if git("rev-parse", f"{PARENT}^{{tree}}").decode().strip() != "798de513703f3d7e76f8d82edb85257d32894681": errors.append("R8 source tree mismatch")
if git("rev-parse", f"{PARENT}:{R8}").decode().strip() != "da822d0362e06e92497001583afb7405b7ccd472": errors.append("R8 delivery subtree mismatch")
remote = git("ls-remote", "origin", f"refs/heads/{BRANCH}").decode().strip().split()
remote_tip = remote[0] if remote else None
checks["remoteBranch"] = BRANCH
checks["remoteTip"] = remote_tip
if remote_tip != COMMIT: errors.append(f"remote branch tip differs: {remote_tip}")

changed_commit = set(git("diff-tree", "--no-commit-id", "--name-only", "-r", PARENT, COMMIT).decode().splitlines())
out_of_scope = sorted(p for p in changed_commit if not p.startswith(R9 + "/"))
checks["commitChangedPathCount"] = len(changed_commit)
checks["commitOutOfScopePaths"] = out_of_scope
if out_of_scope: errors.append("delivery commit changes paths outside R9 root")

new_expected = {"changed-paths.json", "evidence/r9-correction-verification.json", "r9-candidate-binding.json", "r9-correction-report.md"}
modified_expected = {"output-hashes.json", "requirement-matrix.json", "scripts/finalize.py"}
new_actual = r9paths - r8paths
modified_actual = {p for p in r9paths & r8paths if raw(COMMIT, f"{R9}/{p}") != raw(PARENT, f"{R8}/{p}")}
missing_actual = r8paths - r9paths
checks["newPaths"] = sorted(new_actual)
checks["modifiedInheritedPaths"] = sorted(modified_actual)
checks["missingInheritedPaths"] = sorted(missing_actual)
if new_actual != new_expected: errors.append(f"new path set differs: {sorted(new_actual)}")
if modified_actual != modified_expected: errors.append(f"modified inherited path set differs: {sorted(modified_actual)}")
if missing_actual: errors.append(f"R8 package paths missing: {sorted(missing_actual)}")

# All inherited bytes other than the three declared edits are identical.
identical = sorted(p for p in r8paths & r9paths if raw(COMMIT, f"{R9}/{p}") == raw(PARENT, f"{R8}/{p}"))
checks["byteIdenticalInheritedCount"] = len(identical)
checks["byteIdenticalInheritedPaths"] = identical

old_m = json.loads(raw(PARENT, f"{R8}/requirement-matrix.json"))
new_m = json.loads(raw(COMMIT, f"{R9}/requirement-matrix.json"))
def normalize_matrix(m):
    m = json.loads(json.dumps(m))
    rows = {row["id"]: row for row in m["results"]}
    rows["E-02-05"]["evidence"] = ["__E0205_POINTER__"]
    return m
checks["matrixRowIds"] = [x["id"] for x in new_m["results"]]
if normalize_matrix(old_m) != normalize_matrix(new_m): errors.append("matrix changed outside E-02-05 evidence pointer")
rows_old = {x["id"]: x for x in old_m["results"]}
rows_new = {x["id"]: x for x in new_m["results"]}
if rows_old["E-02-05"]["evidence"] != ["evidence/cli-negative-false-pass.json", "evidence/cli-negative-false-pass.log"]:
    errors.append("R8 E-02-05 source pointer unexpected")
if rows_new["E-02-05"]["evidence"] != ["evidence/cli-negative-false-pass.json"]:
    errors.append("R9 E-02-05 target pointer unexpected")
checks["e0205OldEvidence"] = rows_old["E-02-05"]["evidence"]
checks["e0205NewEvidence"] = rows_new["E-02-05"]["evidence"]
if any(rows_old[k]["status"] != rows_new[k]["status"] for k in rows_old): errors.append("matrix statuses changed")

# The finalizer edit must change only the E-02-05 template evidence array.
old_f = raw(PARENT, f"{R8}/scripts/finalize.py")
new_f = raw(COMMIT, f"{R9}/scripts/finalize.py")
obsolete = b"evidence/cli-negative-false-pass.log"
checks["finalizerOldPointerOccurrences"] = old_f.count(obsolete)
checks["finalizerNewPointerOccurrences"] = new_f.count(obsolete)
checks["finalizerNewJsonPointerOccurrences"] = new_f.count(b"evidence/cli-negative-false-pass.json")
if old_f.count(obsolete) != 1 or new_f.count(obsolete) != 0: errors.append("finalizer obsolete pointer occurrence unexpected")
old_line = next((line for line in old_f.splitlines(keepends=True) if b'"id": "E-02-05"' in line), b"")
new_line = next((line for line in new_f.splitlines(keepends=True) if b'"id": "E-02-05"' in line), b"")
expected_line = old_line.replace(b', "evidence/cli-negative-false-pass.log"', b"")
if not old_line or expected_line == old_line or expected_line != new_line or old_f.replace(old_line, expected_line) != new_f:
    errors.append("finalizer changes are not limited to the E-02-05 obsolete evidence pointer")

# Verify output manifest against committed R9 blobs.
manifest_path = f"{R9}/output-hashes.json"
manifest_raw = raw(COMMIT, manifest_path)
manifest = json.loads(manifest_raw)
rows = manifest["outputs"]
manifest_sha = hashlib.sha256(manifest_raw).hexdigest()
stable = r9paths - {"output-hashes.json"}
if {r["path"] for r in rows} != stable: errors.append("output manifest path inventory mismatch")
total, verified = 0, 0
for row in rows:
    blob = raw(COMMIT, f"{R9}/{row['path']}")
    total += len(blob)
    if len(blob) != row["bytes"] or hashlib.sha256(blob).hexdigest() != row["sha256"]:
        errors.append(f"output hash mismatch: {row['path']}")
    else: verified += 1
checks["outputManifestSha256"] = manifest_sha
checks["manifestRows"] = len(rows)
checks["verifiedRows"] = verified
checks["manifestTotalBytes"] = total
if manifest.get("candidateCommit") != "e2670d4152c461005da86b392dbcea12cec740bf": errors.append("manifest candidate commit mismatch")
if manifest.get("fileCount") != 26 or len(rows) != 26 or total != 145757 or manifest.get("totalBytes") != 145757: errors.append("output manifest count/byte total mismatch")
if manifest_sha != "31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465": errors.append("output manifest hash mismatch")

# Check all matrix evidence paths resolve within the committed package.
referenced = sorted({p for row in new_m["results"] for p in row["evidence"]})
missing_refs = []
for ref in referenced:
    if ref.startswith("/") or "\\" in ref or ".." in Path(ref).parts:
        missing_refs.append(ref)
    elif ref not in r9paths:
        missing_refs.append(ref)
checks["matrixEvidencePaths"] = referenced
checks["matrixEvidencePathCount"] = len(referenced)
checks["missingMatrixEvidencePaths"] = missing_refs
if missing_refs: errors.append("matrix contains unresolved or unsafe evidence paths")

# Inspect the archived negative receipt structurally, without rerunning its command.
receipt = json.loads(raw(COMMIT, f"{R9}/evidence/cli-negative-false-pass.json"))
stdout_obj = json.loads(receipt["stdout"])
checks["negativeReceipt"] = {
    "exitCode": receipt.get("exitCode"),
    "parsedStatus": receipt.get("parsedResult", {}).get("status"),
    "stdoutParsedStatus": stdout_obj.get("status"),
    "stderr": receipt.get("stderr"),
    "receiptHashBefore": receipt.get("originalReceiptSha256BeforeAndAfter", {}).get("before"),
    "receiptHashAfter": receipt.get("originalReceiptSha256BeforeAndAfter", {}).get("after"),
    "command": receipt.get("command"),
    "mutation": receipt.get("mutation"),
}
if receipt.get("exitCode") != 1 or receipt.get("parsedResult", {}).get("status") != "FAIL" or stdout_obj != receipt.get("parsedResult"):
    errors.append("negative CLI receipt does not consistently record FAIL and exit 1")
if receipt.get("stderr") != "": errors.append("negative CLI receipt has unexpected stderr")
if receipt.get("originalReceiptSha256BeforeAndAfter", {}).get("before") != receipt.get("originalReceiptSha256BeforeAndAfter", {}).get("after"):
    errors.append("negative CLI receipt reports original receipt changed")
if receipt.get("mutation", {}).get("value") != "0" * 64: errors.append("negative CLI receipt mutation does not zero source manifest hash")

binding = json.loads(raw(COMMIT, f"{R9}/r9-candidate-binding.json"))
checks["bindingSource"] = binding["source"]
checks["bindingCorrection"] = binding["correction"]
if binding["source"].get("commit") != PARENT or binding["source"].get("deliverySubtree") != "da822d0362e06e92497001583afb7405b7ccd472":
    errors.append("R9 binding source lineage mismatch")
if binding["correction"].get("requirementId") != "E-02-05" or binding["correction"].get("newEvidence") != ["evidence/cli-negative-false-pass.json"]:
    errors.append("R9 binding correction claim mismatch")
if binding["correction"].get("inheritedEvidenceRerun") is not False: errors.append("R9 binding misstates inherited rerun status")

result = {
    "status": "PASS" if not errors else "FAIL",
    "scope": "Parent-local raw-Git technical recheck; not the required independent GPT Plus #2 audit or Parent acceptance",
    "checks": checks,
    "errors": errors,
    "limits": {
        "inheritedE02BehavioralTestsRerun": "NOT RUN",
        "fullFinalizer": "NOT RUN (timestamped receipts would be rewritten)",
        "e01Disposition": "OPEN",
        "externalIndependentAudit": "NOT RUN",
        "parentAcceptance": "NOT RUN",
        "integrationDeploymentG7": "NOT RUN"
    }
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
raise SystemExit(0 if not errors else 1)

