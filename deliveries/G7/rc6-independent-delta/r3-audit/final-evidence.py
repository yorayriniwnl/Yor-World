"""Independent final R3 export/receipt and preserved-history verification. No production writes."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = "71737a61c52d1bb887e5cdfc65201666daee5a1d"
CANDIDATE = "deliveries/G7/rc6-candidate-r3"
ORIGINAL_ARCHIVE_COMMIT = "3ab0c7b44bb541136348b760afcfdea5f2d61fff"
COORDINATION = "eb1ff201391334d6041b35c59eb350fcd012a79c"
ACCEPTED = ["deliveries/C4", "deliveries/G6/full-stack-integration", "deliveries/G6/rc4-candidate",
            "deliveries/G6/rc5-candidate", "docs/releases/v1.0.0-rc5.md",
            "docs/planning/reviews/2026-10-06-g6-r1.md", "docs/planning/reviews/2026-10-06-g6-r1",
            "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md"]
PRESERVED = ACCEPTED + ["deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
                       "deliveries/G7/rc6-independent-delta/r2-audit",
                       "deliveries/G7/rc6-independent-delta/runtime",
                       "deliveries/G7/rc6-independent-delta/security-release"]


def sha(data, lf=False):
    return hashlib.sha256(data.replace(b"\r\n", b"\n") if lf else data).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def historical_snapshot():
    result = {}
    for prefix in PRESERVED:
        target = ROOT / prefix
        files = [target] if target.is_file() else sorted(target.rglob("*"))
        for path in files:
            if path.is_file() and "__pycache__" not in path.parts:
                result[path.relative_to(ROOT).as_posix()] = sha(path.read_bytes())
    return result


def verify():
    defects = []
    checks = []
    def require(condition, label, detail=None):
        checks.append({"check": label, "status": "PASS" if condition else "FAIL", "detail": detail})
        if not condition:
            defects.append(label)
    def load(name):
        return json.loads((ROOT / name).read_text(encoding="utf-8"))
    policy = json.loads(git("show", SOURCE + ":scripts/release/rc6-policy.json"))
    manifest = load(CANDIDATE + "/release-manifest.json")
    session = load(CANDIDATE + "/evidence/session.json")
    manifest_hash = sha((ROOT / CANDIDATE / "release-manifest.json").read_bytes(), lf=True)
    bundle_name = policy["bundle"]["path"]
    bundle_bytes = (ROOT / bundle_name).read_bytes()
    bundle_hash = sha(bundle_bytes)
    require(policy["deliveryRoot"] == CANDIDATE and bundle_name == CANDIDATE + "/yor-world-v1.0.0-rc6.bundle.tar.gz"
            and manifest["releaseBundlePath"] == bundle_name, "Policy, manifest and actual archive stay in R3")
    require(manifest["sourceCommit"] == SOURCE and manifest["sourceAppTree"] == "b281deaa902f56d93c4acb40ae8eb7cbb6edcbd4",
            "Manifest exact source/app tree")
    require(bundle_hash == manifest["releaseBundleSha256"] == "661b858e36a639e5bec8c7dc6f48dff79a002348c69025acaa34ed1097adab78"
            and len(bundle_bytes) == 1655708 and manifest["bundleMetadata"] == {"fileCount": 242, "bytes": 1655708},
            "Final actual archive SHA256/bytes/count match manifest")
    require(session["sourceCommit"] == SOURCE and session["initialState"] == {
            "nodeModulesPresent": False, "nextBuildPresent": False, "trackedChanges": ""}, "Inspected fresh exact-source session")
    detached = Path(session["checkoutPath"])
    require(detached.is_dir(), "Retained detached proof workspace accessible", str(detached))
    require(git("rev-parse", SOURCE + ":app").decode().strip() == git("rev-parse", "48ee09a98c9f7e59ca3a652c7f5dbeb31d0c7e2f:app").decode().strip(),
            "R3 application tree equals independently reviewed R2 application tree")
    inputs = {CANDIDATE + "/release-manifest.json": None,
              CANDIDATE + "/bundle-receipt.json": None,
              CANDIDATE + "/release-manifest-validation.receipt.json": None,
              bundle_name: (bundle_hash, "raw")}
    for item in manifest["evidenceHashes"] + [manifest["sourceBinding"], manifest["composition"]]:
        inputs[item["path"]] = (item["sha256"], item.get("hashMode", "raw"))
    for item in manifest["requiredChecks"]:
        inputs[item["evidencePath"]] = (item.get("evidenceSha256"), item.get("evidenceHashMode", "raw"))
    exported = []
    for name, binding in inputs.items():
        primary = (ROOT / name).read_bytes()
        other = (detached / name).read_bytes()
        passed = primary == other
        if binding and binding[0]:
            passed = passed and sha(primary, lf=binding[1] == "lf") == binding[0]
        exported.append({"path": name, "primaryRawSha256": sha(primary), "detachedRawSha256": sha(other), "matches": passed})
    require(all(item["matches"] for item in exported), "Every mandatory final exported input equals detached bytes and declared hash", len(exported))
    for receipt_name in ["release-manifest-validation.receipt.json", "primary-release-manifest-validation.receipt.json"]:
        receipt = load(CANDIDATE + "/" + receipt_name)
        require(receipt["overallStatus"] == "PASS" and receipt["sourceCommit"] == SOURCE
                and receipt["sourceAppTree"] == manifest["sourceAppTree"] and receipt["manifestSha256"] == manifest_hash
                and receipt["manifestPath"] == CANDIDATE + "/release-manifest.json"
                and receipt["releaseBundleSha256"] == bundle_hash and receipt["fileCount"] == 242 and receipt["archiveBytes"] == 1655708,
                "Final input identity matches " + receipt_name)
    bundle_receipt = load(CANDIDATE + "/bundle-receipt.json")
    require(bundle_receipt["sourceCommit"] == SOURCE and bundle_receipt["archivePath"] == bundle_name
            and bundle_receipt["sha256"] == bundle_hash and bundle_receipt["bytes"] == len(bundle_bytes)
            and bundle_receipt["fileCount"] == 242, "Bundle receipt matches final actual archive")
    executions = [json.loads(line) for line in (ROOT / CANDIDATE / "evidence/execution.jsonl").read_text(encoding="utf-8").splitlines()]
    execution_checks = []
    for item in executions:
        raw = (ROOT / item["evidencePath"]).read_bytes()
        valid = sha(raw, lf=True) == item["evidenceSha256"] and item["sourceCommit"] == SOURCE and item["sourceAppTree"] == manifest["sourceAppTree"]
        execution_checks.append({"id": item["id"], "attempt": item["attempt"], "exitCode": item["exitCode"],
                                 "startedAt": item["startedAt"], "completedAt": item["completedAt"], "matches": valid,
                                 "evidencePath": item["evidencePath"]})
    require(all(item["matches"] for item in execution_checks), "Every retained command log hashes to its execution receipt", len(executions))
    required_ids = set(policy["requiredChecks"])
    latest = {item["id"]: item for item in executions}
    require(required_ids <= set(latest) and all(latest[name]["exitCode"] == 0 for name in required_ids)
            and latest["primary-release-manifest-validation"]["exitCode"] == 0, "Latest thirteen mandatory commands and primary strict validation passed")
    for name in ["bundle-assembly", "evidence-assembly", "release-manifest-validation", "primary-release-manifest-validation"]:
        attempts = [item["attempt"] for item in executions if item["id"] == name]
        require(attempts == [1, 2], "Both retained attempts exist: " + name, attempts)
    preserved_now = historical_snapshot()
    preserved_before = load(HERE.relative_to(ROOT).as_posix() + "/historical-before.json")
    changes = sorted(name for name in set(preserved_now) | set(preserved_before) if preserved_now.get(name) != preserved_before.get(name))
    require(not changes, "Audit does not alter original/R2/prior-audit/accepted history", {"files": len(preserved_now), "changes": changes})
    baseline_checks = []
    for revision, prefixes in [(COORDINATION, ACCEPTED), (ORIGINAL_ARCHIVE_COMMIT, ["deliveries/G7/rc6-candidate"])]:
        entries = git("ls-tree", "-r", "-z", revision, "--", *prefixes).decode().rstrip("\0").split("\0")
        for entry in entries:
            metadata, name = entry.split("\t", 1)
            blob_id = metadata.split()[2]
            actual = (ROOT / name).read_bytes()
            # Blob IDs avoid Windows Git stat limits for historical deeply nested evidence paths.
            expected = git("cat-file", "blob", blob_id)
            baseline_checks.append({"path": name, "baselineCommit": revision, "matchesLf": actual.replace(b"\r\n", b"\n") == expected.replace(b"\r\n", b"\n")})
    require(all(item["matchesLf"] for item in baseline_checks), "Accepted and original proof working bytes equal their archival Git baselines", len(baseline_checks))
    ledger_name = "deliveries/G7/preparation/tools/g7-evidence.py"
    ledger_lf_hash = sha((ROOT / ledger_name).read_bytes(), lf=True)
    ledger_review = load("deliveries/G7/rc6-independent-delta/r2-audit/ledger-correction/review-receipt.json")
    require(ledger_lf_hash == "a773309189aff8ec40684fdd0912470611a4d9c891e00f391d7ac8566c2372f6"
            and sha(git("show", "054e1d5:" + ledger_name), lf=True) == ledger_lf_hash
            and sha(git("show", SOURCE + ":" + ledger_name), lf=True) == ledger_lf_hash,
            "PRE05 independently reviewed ledger correction remains exact at commit054e1d5 and final source")
    receipt = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
               "reviewer": "/root/rc6_r3_independent_audit; local maker-independent Codex audit worker; no external account dispatch claimed",
               "auditedSource": SOURCE, "candidate": CANDIDATE, "manifestSha256Lf": manifest_hash,
               "bundleSha256Raw": bundle_hash, "checks": checks, "exportedInputs": exported,
               "inspectedExecutionReceipts": execution_checks, "baselineChecks": baseline_checks,
               "preservedFiles": len(preserved_now), "ledgerReviewReceiptRawSha256": sha(json.dumps(ledger_review,sort_keys=True).encode()),
               "limits": {"fullSuiteRerun": "NOT RUN by this reviewer; retained run inspected", "production": "NOT RUN",
                          "physicalManual": "NOT RUN", "heapGpuLeakAbsence": "UNKNOWN", "acceptanceClaim": False},
               "defects": defects, "overallStatus": "PASS" if not defects else "FAIL"}
    (HERE / "final-evidence.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: value for key,value in receipt.items() if key not in ["exportedInputs", "baselineChecks", "inspectedExecutionReceipts"]}, indent=2))
    if defects:
        raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=["snapshot", "verify"])
    args = parser.parse_args()
    if args.phase == "snapshot":
        values = historical_snapshot()
        (HERE / "historical-before.json").write_text(json.dumps(values, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps({"snapshottedPreservedFiles": len(values)}))
    else:
        verify()
