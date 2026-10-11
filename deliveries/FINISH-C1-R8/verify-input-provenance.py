#!/usr/bin/env python3
"""Verify the FINISH-21-R1 Git and installed-package provenance receipts."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


R6_COMMIT = "9188b413d37da0ec3381b5430e25dc375a45bb18"
R6_TREE = "aaaef9759b66e4f680d5ab9306775a44e596e12f"
R5_COMMIT = "5e85e6a8a248581fe3893fd80c7da3d05079f305"
R5_TREE = "03c92ad3485bf026349971de060527be05d47acf"
BASE_COMMIT = "f62a43c5e71c00dcb89e28275ea81d842167db80"
BASE_TREE = "31ac50e388948a0befb957205413e16babf51929"
R6_RECORDED_AUDIT_COMMIT = "e79503a365a75f793aeebb684986ea6dd3d29b58"
FIN16_COMMIT = "27938c5c3a224a52849f2508cc7ebfcefa61fe6f"
FIN16_TREE = "fb0564b9ceac27119a060b3e68fcc993c235ed5d"

R6_INPUT_MANIFEST_PATH = "deliveries/FINISH-C1-R6/input-hashes.json"
R6_OUTPUT_MANIFEST_PATH = "deliveries/FINISH-C1-R6/output-hashes.json"
R5_OUTPUT_MANIFEST_PATH = "deliveries/FINISH-C1-R5/output-hashes.json"
R6_PACKAGE_JSON_PATH = "app/package.json"
R6_LOCKFILE_PATH = "app/pnpm-lock.yaml"
R6_BUILD_IDENTITY_PATH = "deliveries/FINISH-C1-R6/evidence/source-build-identity.json"
R6_INSTALL_LOG_PATH = "deliveries/FINISH-C1-R6/evidence/logs/install.log"
FIN16_SINGLE_BYTE_LOG_PATH = (
    "deliveries/completion-audits/FINISH-C1/finish-10/"
    "20261011T061133Z-c1-r6-independent-review-03/evidence/logs/"
    "fin16-local-20261011-0711-single-byte-verification-rerun.log"
)

EXPECTED_R6_MAPPED_PATHS = {
    "candidate-app/app/src/features/world/AssetLoader.ts": (
        R6_COMMIT,
        "deliveries/FINISH-C1-R6/source/app/src/features/world/AssetLoader.ts",
    ),
    "candidate-app/app/tests/unit/world/completion-essential-loader.test.ts": (
        R6_COMMIT,
        "deliveries/FINISH-C1-R6/source/app/tests/unit/world/completion-essential-loader.test.ts",
    ),
    "candidate-app/app/src/features/world/RuntimeMaterialQuality.ts": (
        R5_COMMIT,
        "deliveries/FINISH-C1-R5/source/app/src/features/world/RuntimeMaterialQuality.ts",
    ),
    "candidate-app/app/src/features/world/WorldRuntime.ts": (
        R5_COMMIT,
        "deliveries/FINISH-C1-R5/source/app/src/features/world/WorldRuntime.ts",
    ),
    "candidate-app/app/src/features/world/LowQualityBatch.ts": (
        R5_COMMIT,
        "deliveries/FINISH-C1-R3/source/src/features/world/LowQualityBatch.ts",
    ),
    "candidate-app/app/public/models/production-room-full.glb": (
        BASE_COMMIT,
        "app/public/models/production-room-full.glb",
    ),
    "candidate-app/app/public/models/resident-production.glb": (
        BASE_COMMIT,
        "app/public/models/resident-production.glb",
    ),
    "candidate-app/app/public/models/fixture-production.glb": (
        BASE_COMMIT,
        "app/public/models/fixture-production.glb",
    ),
}

EXPECTED_R6_PACKAGE_PATHS = {
    "candidate-app/node_modules/three/build/three.module.js": "build/three.module.js",
    "candidate-app/node_modules/three/build/three.core.js": "build/three.core.js",
}

EXPECTED_THREE_PACKAGE_FILES = {
    "candidate-app/node_modules/three/build/three.module.js": {
        "packageFile": "build/three.module.js",
        "sha256": "c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a",
        "bytes": 603113,
    },
    "candidate-app/node_modules/three/build/three.core.js": {
        "packageFile": "build/three.core.js",
        "sha256": "eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20",
        "bytes": 1403455,
    },
}

EXPECTED_COMMITS = {
    R6_COMMIT: R6_TREE,
    R5_COMMIT: R5_TREE,
    BASE_COMMIT: BASE_TREE,
    FIN16_COMMIT: FIN16_TREE,
}

EXPECTED_THREE_VERSION = "0.180.0"
EXPECTED_PNPM_VERSION = "9.15.9"
EXPECTED_THREE_INTEGRITY = (
    "sha512-o+qycAMZrh+TsE01GqWUxUIKR1AL0S8pq7zDkYOQw8GqfX8b8VoCKYUoHbhiX5j+7hr8XsuHDVU6+gkQJQKg9w=="
)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parents[1]


class VerificationError(Exception):
    """Raised when a pinned input or receipt does not match its evidence."""


def git_bytes(*args: str) -> bytes:
    process = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if process.returncode != 0:
        detail = process.stderr.decode("utf-8", errors="replace").strip()
        raise VerificationError(
            f"git {' '.join(args)} failed with exit {process.returncode}: {detail}"
        )
    return process.stdout


def git_text(*args: str) -> str:
    return git_bytes(*args).decode("utf-8").strip()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def validate_unique_rows(
    rows: Any, key_name: str, expected_count: int, label: str
) -> set[str]:
    require(isinstance(rows, list), f"{label} must be a JSON array")
    require(
        len(rows) == expected_count,
        f"{label} count is {len(rows)}; expected {expected_count}",
    )
    keys: list[str] = []
    for index, row in enumerate(rows):
        require(isinstance(row, dict), f"{label}[{index}] must be an object")
        key = row.get(key_name)
        require(isinstance(key, str) and key, f"{label}[{index}] has no {key_name}")
        keys.append(key)
    require(len(keys) == len(set(keys)), f"{label} contains duplicate {key_name} values")
    return set(keys)


def json_from_bytes(data: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise VerificationError(f"{label} is not valid UTF-8 JSON: {error}") from error
    require(isinstance(value, dict), f"{label} must have a JSON object at its root")
    return value


def logged_json_value(text: str, prefix: str, label: str) -> Any:
    for line in text.splitlines():
        if line.startswith(prefix):
            try:
                return json.loads(line[len(prefix) :])
            except json.JSONDecodeError as error:
                raise VerificationError(f"{label} is not valid JSON in the pinned audit log") from error
    raise VerificationError(f"{label} is absent from the pinned audit log")


def validate_git_path(path: str) -> None:
    require(isinstance(path, str) and path, "Git path must be a non-empty string")
    require("\\" not in path and "\x00" not in path, f"unsafe Git path: {path!r}")
    parts = path.split("/")
    require(not path.startswith("/") and ":" not in path, f"unsafe Git path: {path!r}")
    require(all(part not in ("", ".", "..") for part in parts), f"unsafe Git path: {path!r}")


def verify_commit_pin(commit: str) -> str:
    require(commit in EXPECTED_COMMITS, f"unresolved or unpinned commit: {commit}")
    resolved = git_text("rev-parse", "--verify", f"{commit}^{{commit}}")
    require(resolved == commit, f"commit resolved to {resolved}, expected {commit}")
    tree = git_text("rev-parse", "--verify", f"{commit}^{{tree}}")
    expected_tree = EXPECTED_COMMITS[commit]
    require(tree == expected_tree, f"wrong tree for {commit}: {tree} != {expected_tree}")
    return tree


def resolve_git_blob(commit: str, path: str) -> dict[str, Any]:
    verify_commit_pin(commit)
    validate_git_path(path)
    oid = git_text("rev-parse", "--verify", f"{commit}:{path}")
    kind = git_text("cat-file", "-t", oid)
    require(kind == "blob", f"{commit}:{path} resolves to {kind}, not a blob")
    data = git_bytes("cat-file", "blob", oid)
    return {
        "commit": commit,
        "path": path,
        "blobOid": oid,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "_data": data,
    }


def verify_file_record(
    record: Any, expected_commit: str, expected_path: str, label: str
) -> dict[str, Any]:
    require(isinstance(record, dict), f"{label} record must be an object")
    require(record.get("commit") == expected_commit, f"{label} has wrong commit")
    require(record.get("path") == expected_path, f"{label} has wrong path")
    actual = resolve_git_blob(expected_commit, expected_path)
    for key in ("blobOid", "sha256", "bytes"):
        require(record.get(key) == actual[key], f"{label} {key} does not match Git blob")
    return actual


def load_json_blob(commit: str, path: str, label: str) -> tuple[dict[str, Any], dict[str, Any]]:
    blob = resolve_git_blob(commit, path)
    return json_from_bytes(blob["_data"], label), blob


def validate_source_binding(binding: dict[str, Any]) -> dict[str, Any]:
    require(binding.get("schemaVersion") == 1, "source-binding schemaVersion must be 1")
    identities = binding.get("commits")
    require(isinstance(identities, dict), "source-binding commits are missing")
    expected_identity = {
        "R6": {"commit": R6_COMMIT, "tree": R6_TREE},
        "R5": {"commit": R5_COMMIT, "tree": R5_TREE},
        "baseline": {"commit": BASE_COMMIT, "tree": BASE_TREE},
        "FINISH16": {"commit": FIN16_COMMIT, "tree": FIN16_TREE},
    }
    require(identities == expected_identity, "source-binding commit/tree pins differ from FINISH-21-R1")
    for commit in EXPECTED_COMMITS:
        verify_commit_pin(commit)

    file_specs = (
        ("r6InputManifest", R6_COMMIT, R6_INPUT_MANIFEST_PATH),
        ("r6OutputManifest", R6_COMMIT, R6_OUTPUT_MANIFEST_PATH),
        ("r5OutputManifest", R5_COMMIT, R5_OUTPUT_MANIFEST_PATH),
    )
    source_blobs: dict[str, dict[str, Any]] = {}
    for key, commit, path in file_specs:
        source_blobs[key] = verify_file_record(binding.get(key), commit, path, key)
    source_blobs["singleByteAuditLog"] = verify_file_record(
        binding.get("singleByteAuditLog"), FIN16_COMMIT, FIN16_SINGLE_BYTE_LOG_PATH, "singleByteAuditLog"
    )
    single_byte_log_text = source_blobs["singleByteAuditLog"]["_data"].decode("utf-8")
    diagnostic_record = logged_json_value(
        single_byte_log_text, "DIAGNOSTIC_TEST_RAW ", "diagnostic raw-byte comparison"
    )
    inserted_bytes = logged_json_value(
        single_byte_log_text, "ONE_BYTE_INSERTION_MATCHES ", "diagnostic insertion proof"
    )
    expected_diagnostic = {
        "path": "deliveries/completion-audits/FINISH-C1/finish-08/20261011T003551Z-c1-r5-local-review/evidence/retry-aggregation-diagnostic.test.ts",
        "expectedSha256": "f19932723c3644d4cc25b65d919317bc28e89520c3c47c926b49e08d2fd22235",
        "expectedBytes": 2874,
        "actualSha256": "d952aef28ae996208471a13b5dc3aafe2a12e85a219a677463d06691cf03663a",
        "actualBytes": 2873,
    }
    for key, value in expected_diagnostic.items():
        require(diagnostic_record.get(key) == value, f"pinned FINISH-16 diagnostic log has wrong {key}")
    require(
        inserted_bytes == [{"offset": 2872, "byte": 13, "hex": "0d"}],
        "pinned FINISH-16 log does not prove exactly one extra CR at offset 2872",
    )

    dependency = binding.get("threeDependencyEvidence")
    require(isinstance(dependency, dict), "threeDependencyEvidence is missing")
    dependency_specs = (
        ("packageManifest", R6_COMMIT, R6_PACKAGE_JSON_PATH),
        ("lockfile", R6_COMMIT, R6_LOCKFILE_PATH),
        ("sourceBuildIdentity", R6_COMMIT, R6_BUILD_IDENTITY_PATH),
        ("frozenInstallLog", R6_COMMIT, R6_INSTALL_LOG_PATH),
    )
    dependency_blobs: dict[str, dict[str, Any]] = {}
    for key, commit, path in dependency_specs:
        dependency_blobs[key] = verify_file_record(dependency.get(key), commit, path, key)

    package_json = json_from_bytes(dependency_blobs["packageManifest"]["_data"], "pinned app/package.json")
    require(package_json.get("packageManager") == f"pnpm@{EXPECTED_PNPM_VERSION}", "pinned packageManager is not pnpm 9.15.9")
    require(
        package_json.get("dependencies", {}).get("three") == EXPECTED_THREE_VERSION,
        "pinned package.json does not declare three 0.180.0",
    )

    lock_data = dependency_blobs["lockfile"]["_data"]
    lock_text = lock_data.decode("utf-8")
    lock_match = re.search(
        r"(?m)^  three@0\.180\.0:\r?\n\s+resolution: \{integrity: ([^}\r\n]+)\}",
        lock_text,
    )
    require(lock_match is not None, "pinned lockfile has no three@0.180.0 integrity entry")
    require(
        lock_match.group(1) == EXPECTED_THREE_INTEGRITY,
        "pinned three@0.180.0 integrity string differs from FINISH-21-R1",
    )
    require(dependency.get("threeIntegrity") == EXPECTED_THREE_INTEGRITY, "source binding has wrong Three.js integrity")

    build_identity = json_from_bytes(
        dependency_blobs["sourceBuildIdentity"]["_data"], "pinned source-build-identity.json"
    )
    identity_lock = build_identity.get("dependencyLock", {})
    require(identity_lock.get("sha256") == dependency_blobs["lockfile"]["sha256"], "source-build identity lock hash differs")
    require(identity_lock.get("bytes") == dependency_blobs["lockfile"]["bytes"], "source-build identity lock size differs")
    require(build_identity.get("toolVersions", {}).get("Pnpm") == EXPECTED_PNPM_VERSION, "source-build identity has wrong pnpm version")

    install_log = dependency_blobs["frozenInstallLog"]["_data"].decode("utf-8")
    require("COMMAND=pnpm install --offline --frozen-lockfile" in install_log, "frozen-install receipt command is missing")
    require("EXIT_CODE=0" in install_log, "frozen-install receipt is not successful")
    require(f"using pnpm v{EXPECTED_PNPM_VERSION}" in install_log, "frozen-install receipt has wrong pnpm version")

    source_blobs["dependencyBlobs"] = dependency_blobs
    source_blobs["packageJson"] = package_json
    source_blobs["lockText"] = lock_text
    source_blobs["buildIdentity"] = build_identity
    source_blobs["installLog"] = install_log
    source_blobs["diagnosticRecord"] = diagnostic_record
    source_blobs["diagnosticInsertedBytes"] = inserted_bytes
    return source_blobs


def validate_installed_three_declarations(
    dependency: dict[str, Any], package_info: dict[str, Any], package_root: Path
) -> None:
    require(
        dependency.get("packageName") == package_info.get("name") == "three",
        "source binding packageName does not match the installed Three.js package",
    )
    require(
        dependency.get("packageVersion") == package_info.get("version") == EXPECTED_THREE_VERSION,
        "source binding packageVersion does not match the installed Three.js package",
    )
    declarations = dependency.get("packageFiles")
    require(isinstance(declarations, list), "source binding packageFiles must be a list")
    require(
        len(declarations) == len(EXPECTED_THREE_PACKAGE_FILES),
        f"source binding packageFiles has {len(declarations)} entries; expected {len(EXPECTED_THREE_PACKAGE_FILES)}",
    )
    expected_fields = {"alias", "packageFile", "sha256", "bytes"}
    seen: set[str] = set()
    for declaration in declarations:
        require(isinstance(declaration, dict), "source binding packageFiles entries must be objects")
        require(set(declaration) == expected_fields, "source binding packageFiles entry fields differ")
        alias = declaration.get("alias")
        require(isinstance(alias, str) and alias in EXPECTED_THREE_PACKAGE_FILES, "source binding packageFiles has an unknown alias")
        require(alias not in seen, f"source binding packageFiles has duplicate alias: {alias}")
        seen.add(alias)
        expected = EXPECTED_THREE_PACKAGE_FILES[alias]
        for key in ("packageFile", "sha256", "bytes"):
            actual_declaration = declaration.get(key)
            if key == "bytes":
                require(type(actual_declaration) is int, f"source binding packageFiles {alias} bytes must be an integer")
            else:
                require(isinstance(actual_declaration, str), f"source binding packageFiles {alias} {key} must be a string")
            require(actual_declaration == expected[key], f"source binding packageFiles {alias} {key} differs from the pinned Three.js evidence")
        actual_path = package_root / expected["packageFile"]
        try:
            data = actual_path.read_bytes()
        except OSError as error:
            raise VerificationError(f"installed package file is unavailable for {alias}: {error}") from error
        digest = hashlib.sha256(data).hexdigest()
        require(digest == expected["sha256"], f"installed Three.js file hash differs from pinned evidence: {alias}")
        require(len(data) == expected["bytes"], f"installed Three.js file size differs from pinned evidence: {alias}")
    require(seen == set(EXPECTED_THREE_PACKAGE_FILES), "source binding packageFiles aliases differ from the pinned Three.js files")


def validate_candidate_inputs(
    binding: dict[str, Any], source_blobs: dict[str, Any]
) -> dict[str, Any]:
    manifest, manifest_blob = load_json_blob(R6_COMMIT, R6_INPUT_MANIFEST_PATH, "R6 input-hashes.json")
    require(
        manifest.get("sourceBinding", {}).get("auditCommit") == R6_RECORDED_AUDIT_COMMIT,
        "R6 input manifest's recorded audit commit differs from its pinned content",
    )
    require(
        manifest_blob["blobOid"] == source_blobs["r6InputManifest"]["blobOid"],
        "R6 input manifest blob differs from source binding",
    )
    originals = manifest.get("r6Inputs")
    original_aliases = validate_unique_rows(originals, "path", 29, "R6 original inputs")
    receipt = json.loads((PACKAGE_DIR / "candidate-input-provenance.json").read_text(encoding="utf-8"))
    require(receipt.get("schemaVersion") == 1, "candidate input provenance schemaVersion must be 1")
    source_manifest = receipt.get("sourceManifest")
    source_manifest_fields = ("commit", "path", "blobOid", "sha256", "bytes")
    require(isinstance(source_manifest, dict), "candidate receipt sourceManifest must be an object")
    require(set(source_manifest) == set(source_manifest_fields), "candidate receipt sourceManifest fields differ")
    for key in source_manifest_fields:
        value = source_manifest.get(key)
        if key == "bytes":
            require(type(value) is int, "candidate receipt sourceManifest bytes must be an integer")
        else:
            require(isinstance(value, str), f"candidate receipt sourceManifest {key} must be a string")
        require(value == manifest_blob[key], f"candidate receipt sourceManifest {key} differs from the pinned R6 manifest blob")
    rows = receipt.get("inputs")
    row_aliases = validate_unique_rows(rows, "alias", 29, "candidate input provenance")
    require(row_aliases == original_aliases, "candidate input aliases do not match the original R6 manifest")

    direct_count = mapped_count = package_count = original_match_count = 0
    git_pairs: set[tuple[str, str]] = set()
    checks: list[dict[str, Any]] = []
    by_alias = {row["alias"]: row for row in rows}
    package_link = REPO_ROOT / "app" / "node_modules" / "three"
    try:
        package_root = package_link.resolve(strict=True)
        package_root.relative_to(REPO_ROOT.resolve())
    except (OSError, ValueError) as error:
        raise VerificationError(f"installed Three.js package cannot be resolved inside this checkout: {error}") from error
    package_json_path = package_root / "package.json"
    package_info = json_from_bytes(package_json_path.read_bytes(), "installed three/package.json")
    require(package_info.get("name") == "three", "installed package is not named three")
    require(package_info.get("version") == EXPECTED_THREE_VERSION, "installed Three.js version is not 0.180.0")
    validate_installed_three_declarations(binding.get("threeDependencyEvidence", {}), package_info, package_root)
    package_root_relative = package_root.relative_to(REPO_ROOT.resolve()).as_posix()

    original_by_alias = {row["path"]: row for row in originals}
    for alias in [row["path"] for row in originals]:
        original = original_by_alias[alias]
        record = by_alias[alias]
        require(record.get("originalExpected") == {"sha256": original.get("sha256"), "bytes": original.get("bytes")}, f"{alias}: original receipt values were changed")
        expected_sha = original.get("sha256")
        expected_bytes = original.get("bytes")
        require(isinstance(expected_sha, str) and SHA256_RE.fullmatch(expected_sha) is not None, f"{alias}: original sha256 is unresolved")
        require(isinstance(expected_bytes, int) and expected_bytes >= 0, f"{alias}: original byte count is unresolved")
        provenance = record.get("provenance")
        corrected = record.get("corrected")
        require(isinstance(provenance, dict), f"{alias}: provenance is missing")
        require(isinstance(corrected, dict), f"{alias}: corrected receipt is missing")

        if alias in EXPECTED_R6_PACKAGE_PATHS:
            package_count += 1
            require(provenance.get("kind") == "installed-package-file", f"{alias}: wrong provenance kind")
            require(provenance.get("package") == "three" and provenance.get("version") == EXPECTED_THREE_VERSION, f"{alias}: wrong package identity")
            expected_relative = EXPECTED_R6_PACKAGE_PATHS[alias]
            require(provenance.get("packageFile") == expected_relative, f"{alias}: wrong package-relative path")
            actual_path = package_root / expected_relative
            try:
                data = actual_path.read_bytes()
            except OSError as error:
                raise VerificationError(f"installed package file is unavailable for {alias}: {error}") from error
            digest = hashlib.sha256(data).hexdigest()
            actual_size = len(data)
            require(record.get("installedPackageRoot") == package_root_relative, f"{alias}: installed package root differs")
            require(corrected.get("sha256") == digest and corrected.get("bytes") == actual_size, f"{alias}: corrected package receipt differs from installed bytes")
            require(digest == expected_sha and actual_size == expected_bytes, f"{alias}: installed package bytes differ from the historical receipt")
            original_matches = True
            checks.append({"alias": alias, "kind": "installed-package-file", "status": "PASS", "sha256": digest, "bytes": actual_size, "packageVersion": package_info["version"]})
        else:
            if alias in EXPECTED_R6_MAPPED_PATHS:
                expected_commit, expected_path = EXPECTED_R6_MAPPED_PATHS[alias]
                expected_kind = "mapped-git-blob"
                mapped_count += 1
            else:
                require(not alias.startswith("candidate-app/"), f"unmapped candidate-app alias: {alias}")
                expected_commit, expected_path = R6_COMMIT, alias
                expected_kind = "direct-git-blob"
                direct_count += 1
            require(provenance.get("kind") == expected_kind, f"{alias}: wrong Git provenance kind")
            require(provenance.get("commit") == expected_commit, f"{alias}: wrong Git commit")
            require(provenance.get("path") == expected_path, f"{alias}: wrong authoritative Git path")
            pair = (expected_commit, expected_path)
            require(pair not in git_pairs, f"duplicate authoritative Git path: {expected_commit}:{expected_path}")
            git_pairs.add(pair)
            blob = resolve_git_blob(expected_commit, expected_path)
            require(corrected.get("commit") == expected_commit and corrected.get("path") == expected_path, f"{alias}: corrected source location differs")
            for key in ("blobOid", "sha256", "bytes"):
                require(corrected.get(key) == blob[key], f"{alias}: corrected Git {key} differs")
            digest, actual_size = blob["sha256"], blob["bytes"]
            original_matches = digest == expected_sha and actual_size == expected_bytes
            checks.append({"alias": alias, "kind": expected_kind, "status": "PASS", "commit": expected_commit, "path": expected_path, "blobOid": blob["blobOid"], "sha256": digest, "bytes": actual_size, "originalReceiptMatches": original_matches})

        require(record.get("originalReceiptMatches") is original_matches, f"{alias}: originalReceiptMatches flag is incorrect")
        if original_matches:
            original_match_count += 1

    require(direct_count == 19, f"direct R6 input count is {direct_count}, expected 19")
    require(mapped_count == 8, f"mapped R6 input count is {mapped_count}, expected 8")
    require(package_count == 2, f"installed package input count is {package_count}, expected 2")
    require(len(git_pairs) == 27, f"unique Git-backed input count is {len(git_pairs)}, expected 27")
    require(receipt.get("counts") == {"total": 29, "directGitBlobs": 19, "mappedGitBlobs": 8, "installedPackageFiles": 2, "gitBacked": 27}, "candidate input provenance counts differ")
    diagnostic_alias = source_blobs["diagnosticRecord"]["path"]
    diagnostic_original = original_by_alias.get(diagnostic_alias)
    diagnostic_row = by_alias.get(diagnostic_alias)
    require(diagnostic_original is not None and diagnostic_row is not None, "diagnostic input receipt is missing")
    require(
        diagnostic_original.get("sha256") == source_blobs["diagnosticRecord"]["expectedSha256"]
        and diagnostic_original.get("bytes") == source_blobs["diagnosticRecord"]["expectedBytes"],
        "pinned FINISH-16 diagnostic old receipt differs from the original R6 input manifest",
    )
    diagnostic_corrected = diagnostic_row.get("corrected", {})
    require(
        diagnostic_corrected.get("sha256") == source_blobs["diagnosticRecord"]["actualSha256"]
        and diagnostic_corrected.get("bytes") == source_blobs["diagnosticRecord"]["actualBytes"],
        "corrected diagnostic receipt differs from the pinned R6 blob comparison",
    )
    return {
        "status": "PASS",
        "total": 29,
        "directGitBlobs": direct_count,
        "mappedGitBlobs": mapped_count,
        "gitBacked": len(git_pairs),
        "installedPackageFiles": package_count,
        "originalReceiptMatches": original_match_count,
        "originalReceiptMismatches": 29 - original_match_count,
        "checks": checks,
        "installedPackage": {"name": package_info["name"], "version": package_info["version"], "resolvedRoot": package_root_relative},
        "diagnosticDiscrepancy": {
            "status": "PASS",
            "alias": diagnostic_alias,
            "expectedOriginalSha256": source_blobs["diagnosticRecord"]["expectedSha256"],
            "expectedOriginalBytes": source_blobs["diagnosticRecord"]["expectedBytes"],
            "correctedCommittedSha256": source_blobs["diagnosticRecord"]["actualSha256"],
            "correctedCommittedBytes": source_blobs["diagnosticRecord"]["actualBytes"],
            "oneExtraByte": source_blobs["diagnosticInsertedBytes"][0],
            "auditEvidenceCommit": FIN16_COMMIT,
            "auditEvidencePath": FIN16_SINGLE_BYTE_LOG_PATH,
            "noSourceEditInferred": True,
        },
    }


def validate_predecessor_outputs(binding: dict[str, Any], source_blobs: dict[str, Any]) -> dict[str, Any]:
    manifest, manifest_blob = load_json_blob(R5_COMMIT, R5_OUTPUT_MANIFEST_PATH, "R5 output-hashes.json")
    require(manifest_blob["blobOid"] == source_blobs["r5OutputManifest"]["blobOid"], "R5 output manifest blob differs from source binding")
    outputs = manifest.get("outputs")
    require(isinstance(outputs, dict), "R5 output manifest outputs must be an object")
    require(len(outputs) == 32, f"R5 output manifest declares {len(outputs)} outputs; expected 32")
    receipt = json.loads((PACKAGE_DIR / "predecessor-output-git-blobs.json").read_text(encoding="utf-8"))
    require(receipt.get("schemaVersion") == 1, "predecessor output receipt schemaVersion must be 1")
    manifest_record = receipt.get("sourceManifest", {})
    for key in ("commit", "path", "blobOid", "sha256", "bytes"):
        require(manifest_record.get(key) == manifest_blob[key], f"R5 source manifest {key} differs")
    rows = receipt.get("outputs")
    row_paths = validate_unique_rows(rows, "path", 32, "R5 predecessor outputs")
    expected_paths = {f"deliveries/FINISH-C1-R5/{key}" for key in outputs}
    require(row_paths == expected_paths, "R5 output paths do not match the original manifest")
    by_path = {row["path"]: row for row in rows}
    checks: list[dict[str, Any]] = []
    original_match_count = 0
    for key, original in outputs.items():
        path = f"deliveries/FINISH-C1-R5/{key}"
        record = by_path[path]
        expected = {"sha256": original.get("sha256"), "bytes": original.get("bytes")}
        require(record.get("originalExpected") == expected, f"{path}: original receipt values were changed")
        blob = resolve_git_blob(R5_COMMIT, path)
        require(record.get("commit") == R5_COMMIT, f"{path}: wrong commit")
        for field in ("blobOid", "sha256", "bytes"):
            require(record.get(field) == blob[field], f"{path}: corrected Git {field} differs")
        require(record.get("originalReceiptMatches") is (blob["sha256"] == expected["sha256"] and blob["bytes"] == expected["bytes"]), f"{path}: originalReceiptMatches flag is incorrect")
        original_matches = blob["sha256"] == expected["sha256"] and blob["bytes"] == expected["bytes"]
        if original_matches:
            original_match_count += 1
        checks.append({"path": path, "status": "PASS", "blobOid": blob["blobOid"], "sha256": blob["sha256"], "bytes": blob["bytes"], "originalReceiptMatches": original_matches})
    require(receipt.get("count") == 32, "R5 receipt count field is not 32")
    return {
        "status": "PASS",
        "count": 32,
        "originalReceiptMatches": original_match_count,
        "originalReceiptMismatches": 32 - original_match_count,
        "sourceManifest": {key: manifest_blob[key] for key in ("commit", "path", "blobOid", "sha256", "bytes")},
        "checks": checks,
    }


def validate_output_manifest(commit: str) -> dict[str, Any]:
    resolved_commit = git_text("rev-parse", "--verify", f"{commit}^{{commit}}")
    require(resolved_commit == commit, "output manifest commit must be a full commit SHA")
    manifest_path = "deliveries/FINISH-C1-R7/output-hashes.json"
    manifest_blob = resolve_any_commit_blob(commit, manifest_path)
    manifest = json_from_bytes(manifest_blob["_data"], "R7 output-hashes.json")
    outputs = manifest.get("outputs")
    paths = validate_unique_rows(outputs, "path", manifest.get("fileCount"), "R7 output manifest")
    require("output-hashes.json" not in paths, "R7 output manifest must exclude itself")
    require(not any(path == ".work" or path.startswith(".work/") for path in paths), "R7 output manifest must exclude .work")

    tree_paths = git_text("ls-tree", "-r", "--name-only", commit, "--", "deliveries/FINISH-C1-R7").splitlines()
    prefix = "deliveries/FINISH-C1-R7/"
    package_paths = {path[len(prefix) :] for path in tree_paths if path.startswith(prefix)}
    require(not any(path == ".work" or path.startswith(".work/") for path in package_paths), "R7 commit must not include .work")
    expected_stable = package_paths - {"output-hashes.json"}
    require(paths == expected_stable, "R7 output manifest does not cover every committed stable file")

    by_path = {row["path"]: row for row in outputs}
    for path in sorted(paths):
        blob = resolve_any_commit_blob(commit, f"deliveries/FINISH-C1-R7/{path}")
        record = by_path[path]
        require(record.get("sha256") == blob["sha256"], f"R7 output hash mismatch: {path}")
        require(record.get("bytes") == blob["bytes"], f"R7 output size mismatch: {path}")
    return {"status": "PASS", "commit": commit, "fileCount": len(paths), "totalBytes": sum(row["bytes"] for row in outputs)}


def resolve_any_commit_blob(commit: str, path: str) -> dict[str, Any]:
    validate_git_path(path)
    oid = git_text("rev-parse", "--verify", f"{commit}:{path}")
    kind = git_text("cat-file", "-t", oid)
    require(kind == "blob", f"{commit}:{path} resolves to {kind}, not a blob")
    data = git_bytes("cat-file", "blob", oid)
    return {"commit": commit, "path": path, "blobOid": oid, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "_data": data}


def run_verification(output_commit: str | None) -> dict[str, Any]:
    binding = json.loads((PACKAGE_DIR / "source-binding.json").read_text(encoding="utf-8"))
    source_blobs = validate_source_binding(binding)
    candidate = validate_candidate_inputs(binding, source_blobs)
    predecessor = validate_predecessor_outputs(binding, source_blobs)
    result: dict[str, Any] = {
        "schemaVersion": 1,
        "status": "PASS",
        "pinnedCommits": {"R6": R6_COMMIT, "R5": R5_COMMIT, "baseline": BASE_COMMIT},
        "candidateInputs": candidate,
        "predecessorOutputs": predecessor,
    }
    if output_commit:
        result["outputManifest"] = validate_output_manifest(output_commit)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit the complete JSON verification result")
    parser.add_argument("--check-output-manifest", action="store_true", help="also verify the committed R7 output manifest")
    parser.add_argument("--commit", help="commit SHA required with --check-output-manifest")
    args = parser.parse_args()
    if args.check_output_manifest and not args.commit:
        print("FAIL: --check-output-manifest requires --commit", file=sys.stderr)
        return 2
    if args.commit and not args.check_output_manifest:
        print("FAIL: --commit requires --check-output-manifest", file=sys.stderr)
        return 2
    try:
        result = run_verification(args.commit if args.check_output_manifest else None)
    except (VerificationError, OSError, KeyError, TypeError, ValueError) as error:
        failure = {"schemaVersion": 1, "status": "FAIL", "errors": [str(error)]}
        if args.json:
            print(json.dumps(failure, indent=2, sort_keys=True))
        else:
            print(f"FAIL: {error}")
        return 1
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        candidate = result["candidateInputs"]
        predecessor = result["predecessorOutputs"]
        print("FINISH-21-R1 input provenance: PASS")
        print(f"R6 direct Git blobs: {candidate['directGitBlobs']}/{candidate['directGitBlobs']} PASS")
        print(f"R6 mapped Git blobs: {candidate['mappedGitBlobs']}/{candidate['mappedGitBlobs']} PASS")
        print(f"R6 installed Three.js files: {candidate['installedPackageFiles']}/{candidate['installedPackageFiles']} PASS ({candidate['installedPackage']['version']})")
        print(f"R5 predecessor Git blobs: {predecessor['count']}/{predecessor['count']} PASS")
        print(f"Original R6 receipt matches: {candidate['originalReceiptMatches']}/29; recorded mismatches: {candidate['originalReceiptMismatches']}")
        print(f"Original R5 receipt matches: {predecessor['originalReceiptMatches']}/32; recorded mismatches: {predecessor['originalReceiptMismatches']}")
        if "outputManifest" in result:
            output = result["outputManifest"]
            print(f"Committed R7 output manifest: {output['fileCount']}/{output['fileCount']} PASS ({output['commit']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
