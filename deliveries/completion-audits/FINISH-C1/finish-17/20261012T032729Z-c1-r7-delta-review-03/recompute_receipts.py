#!/usr/bin/env python3
"""Recompute FINISH-C1-R7's E-01 receipts from pinned Git objects and package bytes."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


CANDIDATE = "e2670d4152c461005da86b392dbcea12cec740bf"
PARENT = "1058676cb74d8239aae7fed3dfa91defcc8a30a1"
R6 = "9188b413d37da0ec3381b5430e25dc375a45bb18"
R5 = "5e85e6a8a248581fe3893fd80c7da3d05079f305"
BASELINE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
FINISH16 = "27938c5c3a224a52849f2508cc7ebfcefa61fe6f"
R7_ROOT = "deliveries/FINISH-C1-R7"
R6_INPUTS_PATH = "deliveries/FINISH-C1-R6/input-hashes.json"
R6_OUTPUTS_PATH = "deliveries/FINISH-C1-R6/output-hashes.json"
R5_OUTPUTS_PATH = "deliveries/FINISH-C1-R5/output-hashes.json"

MAPPED_INPUTS = {
    "candidate-app/app/src/features/world/AssetLoader.ts": (
        R6,
        "deliveries/FINISH-C1-R6/source/app/src/features/world/AssetLoader.ts",
    ),
    "candidate-app/app/tests/unit/world/completion-essential-loader.test.ts": (
        R6,
        "deliveries/FINISH-C1-R6/source/app/tests/unit/world/completion-essential-loader.test.ts",
    ),
    "candidate-app/app/src/features/world/RuntimeMaterialQuality.ts": (
        R5,
        "deliveries/FINISH-C1-R5/source/app/src/features/world/RuntimeMaterialQuality.ts",
    ),
    "candidate-app/app/src/features/world/WorldRuntime.ts": (
        R5,
        "deliveries/FINISH-C1-R5/source/app/src/features/world/WorldRuntime.ts",
    ),
    "candidate-app/app/src/features/world/LowQualityBatch.ts": (
        R5,
        "deliveries/FINISH-C1-R3/source/src/features/world/LowQualityBatch.ts",
    ),
    "candidate-app/app/public/models/production-room-full.glb": (
        BASELINE,
        "app/public/models/production-room-full.glb",
    ),
    "candidate-app/app/public/models/resident-production.glb": (
        BASELINE,
        "app/public/models/resident-production.glb",
    ),
    "candidate-app/app/public/models/fixture-production.glb": (
        BASELINE,
        "app/public/models/fixture-production.glb",
    ),
}


class AuditError(Exception):
    pass


class Auditor:
    def __init__(self, repo: Path, package_root: Path) -> None:
        self.repo = repo.resolve()
        self.package_root = package_root.resolve(strict=True)
        self.commands: list[dict[str, Any]] = []
        self.checks: list[dict[str, Any]] = []

    def git(self, *args: str, binary: bool = False) -> bytes:
        argv = ["git", *args]
        run = subprocess.run(argv, cwd=self.repo, capture_output=True, check=False)
        output = run.stdout
        self.commands.append(
            {
                "argv": argv,
                "cwd": str(self.repo),
                "exitCode": run.returncode,
                "stdoutBytes": len(output),
                "stdoutSha256": hashlib.sha256(output).hexdigest(),
                "stderr": run.stderr.decode("utf-8", errors="replace"),
            }
        )
        if run.returncode:
            raise AuditError(
                f"Git command failed ({run.returncode}): {' '.join(argv)}: "
                f"{run.stderr.decode('utf-8', errors='replace')}"
            )
        return output if binary else output.strip()

    def git_text(self, *args: str) -> str:
        return self.git(*args).decode("utf-8")

    def blob(self, commit: str, path: str) -> tuple[str, bytes]:
        oid = self.git_text("rev-parse", f"{commit}:{path}")
        data = self.git("cat-file", "blob", f"{commit}:{path}", binary=True)
        self.checks.append(
            {
                "kind": "git-blob",
                "commit": commit,
                "path": path,
                "blobOid": oid,
                "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data),
                "status": "PASS",
            }
        )
        return oid, data

    def json_blob(self, commit: str, path: str) -> tuple[str, bytes, Any]:
        oid, data = self.blob(commit, path)
        try:
            return oid, data, json.loads(data)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise AuditError(f"Invalid JSON in {commit}:{path}: {error}") from error

    def verify_git_receipt(self, receipt: dict[str, Any]) -> dict[str, Any]:
        commit, path = receipt["commit"], receipt["path"]
        oid, data = self.blob(commit, path)
        actual = {
            "commit": commit,
            "path": path,
            "blobOid": oid,
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
        }
        for field in ("commit", "path", "blobOid", "sha256", "bytes"):
            if receipt.get(field) != actual[field]:
                raise AuditError(
                    f"Receipt differs for {commit}:{path}, field {field}: "
                    f"{receipt.get(field)!r} != {actual[field]!r}"
                )
        return actual

    def run(self) -> dict[str, Any]:
        commit_parent = self.git_text("show", "-s", "--format=%H %P %T", CANDIDATE)
        parts = commit_parent.split()
        if parts != [CANDIDATE, PARENT, "419950200cc9705a101468d44e5b589b40f609f0"]:
            raise AuditError(f"Candidate identity differs: {commit_parent}")
        candidate_tree = parts[2]
        parent_app = self.git_text("rev-parse", f"{PARENT}:app")
        candidate_app = self.git_text("rev-parse", f"{CANDIDATE}:app")
        if parent_app != "42ea29ec235225046a75959eb19eb386ac2f821d" or candidate_app != parent_app:
            raise AuditError(f"Canonical app tree changed: parent={parent_app}, candidate={candidate_app}")
        changed = self.git_text(
            "diff-tree", "--no-commit-id", "--name-only", "-r", PARENT, CANDIDATE
        ).splitlines()
        changed = sorted(changed)

        r7_manifest_oid, r7_manifest_raw, r7_manifest = self.json_blob(
            CANDIDATE, f"{R7_ROOT}/output-hashes.json"
        )
        output_rows = r7_manifest["outputs"]
        output_results = []
        total_output_bytes = 0
        for row in output_rows:
            path = f"{R7_ROOT}/{row['path']}"
            oid, data = self.blob(CANDIDATE, path)
            actual = {
                "path": path,
                "blobOid": oid,
                "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data),
            }
            if row.get("sha256") != actual["sha256"] or row.get("bytes") != actual["bytes"]:
                raise AuditError(f"R7 output manifest mismatch: {path}")
            total_output_bytes += len(data)
            output_results.append(actual)
        if len(output_rows) != 10 or r7_manifest.get("fileCount") != 10 or total_output_bytes != 186448:
            raise AuditError("R7 output count or total-byte binding differs")
        expected_changed = sorted(
            [f"{R7_ROOT}/{row['path']}" for row in output_rows]
            + [f"{R7_ROOT}/output-hashes.json"]
        )
        if changed != expected_changed:
            raise AuditError("R7 candidate diff is not exactly the eleven declared package files")

        _, input_receipt_raw, input_receipt = self.json_blob(
            CANDIDATE, f"{R7_ROOT}/candidate-input-provenance.json"
        )
        _, predecessor_raw, predecessor = self.json_blob(
            CANDIDATE, f"{R7_ROOT}/predecessor-output-git-blobs.json"
        )
        _, binding_raw, binding = self.json_blob(CANDIDATE, f"{R7_ROOT}/source-binding.json")
        _, r6_input_raw, r6_input_manifest = self.json_blob(R6, R6_INPUTS_PATH)
        _, r6_output_raw, r6_output_manifest = self.json_blob(R6, R6_OUTPUTS_PATH)
        _, r5_output_raw, r5_output_manifest = self.json_blob(R5, R5_OUTPUTS_PATH)

        r6_input_ref = binding["r6InputManifest"]
        r6_output_ref = binding["r6OutputManifest"]
        r5_output_ref = binding["r5OutputManifest"]
        ref_results = {
            "r6InputManifest": self.verify_git_receipt(r6_input_ref),
            "r6OutputManifest": self.verify_git_receipt(r6_output_ref),
            "r5OutputManifest": self.verify_git_receipt(r5_output_ref),
        }
        expected_manifest_blobs = {
            "r6InputManifest": (R6, R6_INPUTS_PATH, r6_input_raw),
            "r6OutputManifest": (R6, R6_OUTPUTS_PATH, r6_output_raw),
            "r5OutputManifest": (R5, R5_OUTPUTS_PATH, r5_output_raw),
        }
        for name, (expected_commit, expected_path, raw) in expected_manifest_blobs.items():
            receipt = binding[name]
            if receipt["commit"] != expected_commit or receipt["path"] != expected_path:
                raise AuditError(f"Wrong pinned path for {name}")
            if receipt["sha256"] != hashlib.sha256(raw).hexdigest() or receipt["bytes"] != len(raw):
                raise AuditError(f"Wrong raw-byte hash or size for {name}")
        for owner, field, target in (
            (input_receipt, "sourceManifest", binding["r6InputManifest"]),
            (predecessor, "sourceManifest", binding["r5OutputManifest"]),
        ):
            for key in ("commit", "path", "blobOid", "sha256", "bytes"):
                if owner.get(field, {}).get(key) != target.get(key):
                    raise AuditError(f"Duplicated {field}.{key} does not match source binding")

        original_inputs = {row["path"]: row for row in r6_input_manifest["r6Inputs"]}
        input_rows = input_receipt["inputs"]
        if len(original_inputs) != 29 or len(input_rows) != 29:
            raise AuditError("R6 input count is not 29")
        if [row["alias"] for row in input_rows] != [row["path"] for row in r6_input_manifest["r6Inputs"]]:
            raise AuditError("R7 aliases do not preserve the exact R6 input order and paths")
        if input_receipt.get("counts") != {
            "total": 29,
            "directGitBlobs": 19,
            "mappedGitBlobs": 8,
            "installedPackageFiles": 2,
            "gitBacked": 27,
        }:
            raise AuditError("R7 input receipt count declaration differs")

        package_root = self.package_root
        package_info = json.loads((package_root / "package.json").read_bytes())
        if package_info.get("name") != "three" or package_info.get("version") != "0.180.0":
            raise AuditError("Observed package is not three@0.180.0")
        three_evidence = binding["threeDependencyEvidence"]
        if three_evidence.get("packageName") != "three" or three_evidence.get("packageVersion") != "0.180.0":
            raise AuditError("Pinned dependency evidence has the wrong Three.js identity")
        package_manifest_ref = three_evidence["packageManifest"]
        lock_ref = three_evidence["lockfile"]
        build_identity_ref = three_evidence["sourceBuildIdentity"]
        install_log_ref = three_evidence["frozenInstallLog"]
        for ref in (package_manifest_ref, lock_ref, build_identity_ref, install_log_ref):
            if ref.get("commit") != R6:
                raise AuditError(f"Three.js dependency evidence is not pinned to R6: {ref}")
        dependency_refs = {
            "packageManifest": self.verify_git_receipt(package_manifest_ref),
            "lockfile": self.verify_git_receipt(lock_ref),
            "sourceBuildIdentity": self.verify_git_receipt(build_identity_ref),
            "frozenInstallLog": self.verify_git_receipt(install_log_ref),
        }
        _, package_manifest_raw = self.blob(package_manifest_ref["commit"], package_manifest_ref["path"])
        _, lock_raw = self.blob(lock_ref["commit"], lock_ref["path"])
        _, build_identity_raw, build_identity = self.json_blob(build_identity_ref["commit"], build_identity_ref["path"])
        _, install_log_raw = self.blob(install_log_ref["commit"], install_log_ref["path"])
        dependency_versions = json.loads(package_manifest_raw).get("dependencies", {})
        if dependency_versions.get("three") not in ("0.180.0", "^0.180.0", "~0.180.0"):
            raise AuditError("Pinned package manifest does not declare three@0.180.0")
        integrity = three_evidence["threeIntegrity"]
        lock_text = lock_raw.decode("utf-8")
        if "three@0.180.0:" not in lock_text or integrity not in lock_text:
            raise AuditError("Pinned lockfile does not contain the exact three@0.180.0 integrity")
        lock_identity = build_identity["dependencyLock"]
        if lock_identity.get("sha256") != hashlib.sha256(lock_raw).hexdigest() or lock_identity.get("bytes") != len(lock_raw):
            raise AuditError("Source-build identity does not bind the pinned raw lockfile")
        if build_identity.get("toolVersions", {}).get("Pnpm") != "9.15.9":
            raise AuditError("Source-build identity reports a different pnpm version")
        install_text = install_log_raw.decode("utf-8")
        if (
            "COMMAND=pnpm install --offline --frozen-lockfile" not in install_text
            or "EXIT_CODE=0" not in install_text
            or "using pnpm v9.15.9" not in install_text
        ):
            raise AuditError("Pinned frozen-install receipt is not successful or uses a different command")
        if lock_ref.get("path") != "app/pnpm-lock.yaml" or package_manifest_ref.get("path") != "app/package.json":
            raise AuditError("Three.js dependency evidence points to an unexpected package manifest or lockfile")

        package_file_rows = {row["alias"]: row for row in three_evidence["packageFiles"]}
        input_results = []
        direct_count = mapped_count = package_count = old_match_count = 0
        seen_git_sources: set[tuple[str, str]] = set()
        for row in input_rows:
            alias = row["alias"]
            original = original_inputs[alias]
            if row.get("originalExpected") != {"sha256": original["sha256"], "bytes": original["bytes"]}:
                raise AuditError(f"Historical R6 input receipt changed for {alias}")
            provenance = row["provenance"]
            if provenance["kind"] == "installed-package-file":
                package_count += 1
                if alias not in package_file_rows:
                    raise AuditError(f"Missing duplicate installed-package binding for {alias}")
                if (
                    provenance.get("package") != "three"
                    or provenance.get("version") != "0.180.0"
                    or row.get("installedPackageRoot") != three_evidence["installedPackageRoot"]
                ):
                    raise AuditError(f"Installed-package identity differs for {alias}")
                package_file = provenance["packageFile"]
                file_path = package_root / package_file
                data = file_path.read_bytes()
                actual = {
                    "alias": alias,
                    "kind": "installed-package-file",
                    "packageVersion": package_info["version"],
                    "path": str(file_path),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "bytes": len(data),
                }
                duplicate = package_file_rows[alias]
                old_matches = actual["sha256"] == original["sha256"] and actual["bytes"] == original["bytes"]
                if (
                    provenance.get("packageFile") != duplicate.get("packageFile")
                    or not old_matches
                    or row.get("originalReceiptMatches") is not old_matches
                    or row.get("corrected") != {"sha256": actual["sha256"], "bytes": actual["bytes"]}
                    or duplicate.get("sha256") != actual["sha256"]
                    or duplicate.get("bytes") != actual["bytes"]
                ):
                    raise AuditError(f"Installed package bytes or duplicated declaration differ for {alias}")
                actual["originalReceiptMatches"] = old_matches
                actual["status"] = "PASS"
            else:
                if alias in MAPPED_INPUTS:
                    expected_commit, expected_path = MAPPED_INPUTS[alias]
                    expected_kind = "mapped-git-blob"
                    mapped_count += 1
                else:
                    expected_commit, expected_path = R6, alias
                    expected_kind = "direct-git-blob"
                    direct_count += 1
                if provenance != {"kind": expected_kind, "commit": expected_commit, "path": expected_path}:
                    raise AuditError(f"Provenance mapping differs for {alias}")
                source_pair = (expected_commit, expected_path)
                if source_pair in seen_git_sources:
                    raise AuditError(f"Duplicate authoritative source path: {source_pair}")
                seen_git_sources.add(source_pair)
                oid, data = self.blob(expected_commit, expected_path)
                digest = hashlib.sha256(data).hexdigest()
                corrected = {
                    "commit": expected_commit,
                    "path": expected_path,
                    "blobOid": oid,
                    "sha256": digest,
                    "bytes": len(data),
                }
                if row.get("corrected") != corrected:
                    raise AuditError(f"Corrected raw Git receipt differs for {alias}")
                old_matches = digest == original["sha256"] and len(data) == original["bytes"]
                if row.get("originalReceiptMatches") is not old_matches:
                    raise AuditError(f"Historical-match flag differs for {alias}")
                if old_matches:
                    old_match_count += 1
                actual = {
                    "alias": alias,
                    "kind": expected_kind,
                    **corrected,
                    "originalReceiptMatches": old_matches,
                    "status": "PASS",
                }
            if row.get("originalReceiptMatches"):
                old_match_count += 1 if provenance["kind"] == "installed-package-file" else 0
            input_results.append(actual)
        if (direct_count, mapped_count, package_count) != (19, 8, 2):
            raise AuditError(f"Unexpected R6 input provenance counts: {direct_count}/{mapped_count}/{package_count}")
        if old_match_count != 22:
            raise AuditError(f"Expected 22 historical R6 receipt matches, got {old_match_count}")

        predecessor_rows = predecessor["outputs"]
        # R5's output manifest uses an object keyed by path, unlike R6/R7's row lists.
        r5_manifest_outputs = {
            path: {"path": path, **receipt}
            for path, receipt in r5_output_manifest["outputs"].items()
        }
        if len(predecessor_rows) != 32 or len(r5_manifest_outputs) != 32:
            raise AuditError("R5 predecessor output count is not 32")
        predecessor_results = []
        r5_old_match_count = 0
        for row in predecessor_rows:
            key = row["manifestKey"]
            original = r5_manifest_outputs[key]
            if row.get("originalExpected") != {"sha256": original["sha256"], "bytes": original["bytes"]}:
                raise AuditError(f"Historical R5 output receipt changed for {key}")
            if row.get("commit") != R5 or not row["path"].startswith("deliveries/FINISH-C1-R5/"):
                raise AuditError(f"R5 output source mapping differs for {key}")
            if row["path"] != f"deliveries/FINISH-C1-R5/{key}":
                raise AuditError(f"R5 output manifest key/path mismatch for {key}")
            oid, data = self.blob(R5, row["path"])
            digest = hashlib.sha256(data).hexdigest()
            actual = {
                "path": row["path"],
                "manifestKey": key,
                "commit": R5,
                "blobOid": oid,
                "sha256": digest,
                "bytes": len(data),
                "originalReceiptMatches": digest == original["sha256"] and len(data) == original["bytes"],
            }
            for field in ("blobOid", "sha256", "bytes", "originalReceiptMatches"):
                if row.get(field) != actual[field]:
                    raise AuditError(f"R5 raw output receipt differs for {key}, field {field}")
            r5_old_match_count += actual["originalReceiptMatches"] is True
            actual["status"] = "PASS"
            predecessor_results.append(actual)
        if r5_old_match_count != 9:
            raise AuditError(f"Expected 9 historical R5 output matches, got {r5_old_match_count}")

        diagnostic = next(
            row for row in input_rows if row["alias"].endswith("retry-aggregation-diagnostic.test.ts")
        )
        diagnostic_raw = self.blob(R6, diagnostic["alias"])[1]
        expected_diagnostic = diagnostic["originalExpected"]
        diagnostic_actual = {
            "path": diagnostic["alias"],
            "originalSha256": expected_diagnostic["sha256"],
            "originalBytes": expected_diagnostic["bytes"],
            "committedSha256": hashlib.sha256(diagnostic_raw).hexdigest(),
            "committedBytes": len(diagnostic_raw),
        }
        if (
            diagnostic_actual["originalBytes"] != 2874
            or diagnostic_actual["committedBytes"] != 2873
            or diagnostic_actual["committedSha256"] != "d952aef28ae996208471a13b5dc3aafe2a12e85a219a677463d06691cf03663a"
        ):
            raise AuditError("Diagnostic-test raw-byte discrepancy differs from FINISH-16")
        single_log_ref = binding["singleByteAuditLog"]
        if single_log_ref.get("commit") != FINISH16:
            raise AuditError("Single-byte diagnostic explanation is not pinned to FINISH-16")
        single_log = self.verify_git_receipt(single_log_ref)
        log_raw = self.blob(single_log_ref["commit"], single_log_ref["path"])[1]
        log_text = log_raw.decode("utf-8")
        if '"offset": 2872, "byte": 13' not in log_text:
            raise AuditError("Pinned FINISH-16 log does not record the single CR at offset 2872")
        diagnostic_actual["insertedByteProof"] = {"offset": 2872, "byte": 13, "hex": "0d", "status": "PASS"}

        result = {
            "schemaVersion": 1,
            "status": "PASS",
            "reviewBoundary": "Parent-local E-01 raw receipt-integrity review; not GPT Plus #2 or implementation acceptance",
            "candidate": {
                "commit": CANDIDATE,
                "parent": PARENT,
                "tree": candidate_tree,
                "deliveryTree": self.git_text("rev-parse", f"{CANDIDATE}:{R7_ROOT}"),
                "appTree": candidate_app,
                "changedPathCount": len(changed),
                "changedPaths": changed,
            },
            "r7Outputs": {
                "manifestSha256": hashlib.sha256(r7_manifest_raw).hexdigest(),
                "manifestBlobOid": r7_manifest_oid,
                "count": len(output_results),
                "totalBytes": total_output_bytes,
                "items": output_results,
                "status": "PASS",
            },
            "r6Inputs": {
                "count": len(input_results),
                "directGitBlobs": direct_count,
                "mappedGitBlobs": mapped_count,
                "installedPackageFiles": package_count,
                "historicalReceiptMatches": old_match_count,
                "historicalReceiptMismatches": 29 - old_match_count,
                "items": input_results,
                "status": "PASS",
            },
            "r5Outputs": {
                "count": len(predecessor_results),
                "historicalReceiptMatches": r5_old_match_count,
                "historicalReceiptMismatches": 32 - r5_old_match_count,
                "items": predecessor_results,
                "status": "PASS",
            },
            "historicalManifestBlobs": ref_results,
            "threeDependencyEvidence": dependency_refs,
            "installedThree": {
                "name": package_info["name"],
                "version": package_info["version"],
                "integrity": integrity,
                "files": [
                    row
                    for row in input_results
                    if row["kind"] == "installed-package-file"
                ],
                "status": "PASS",
            },
            "oneByteDiscrepancy": diagnostic_actual,
            "executedCommandCount": len(self.commands),
            "gitCommands": self.commands,
            "statusDetails": {
                "E01": "PASS for corrected raw-byte provenance; all historical mismatches remain explicitly disclosed.",
                "applicationTests": "NOT RUN; outside the receipt-only scope.",
                "externalGptPlus2": "NOT RUN.",
                "implementationAcceptance": "PENDING.",
                "canonicalIntegration": False,
            },
        }
        return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--installed-package-root",
        required=True,
        type=Path,
        help="Existing three@0.180.0 install to verify read-only; no registry fetch or install is performed.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Write the structured result here as UTF-8 without a BOM; stdout remains the default.",
    )
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[5]
    status = "PASS"
    auditor: Auditor | None = None
    try:
        auditor = Auditor(repo, args.installed_package_root)
        result: dict[str, Any] = auditor.run()
    except Exception as error:  # emit a structured failure with command provenance
        status = "FAIL"
        result = {
            "schemaVersion": 1,
            "status": status,
            "error": f"{type(error).__name__}: {error}",
        }
        if auditor is not None:
            result["gitCommands"] = auditor.commands
            result["completedChecks"] = auditor.checks
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_bytes(rendered.encode("utf-8"))
    else:
        print(rendered, end="")
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
