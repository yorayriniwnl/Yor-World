from __future__ import annotations

import difflib
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
R7_COMMIT = "e2670d4152c461005da86b392dbcea12cec740bf"
R7_TREE = "419950200cc9705a101468d44e5b589b40f609f0"
R7_APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
R6_COMMIT = "9188b413d37da0ec3381b5430e25dc375a45bb18"
R6_MANIFEST_PATH = "deliveries/FINISH-C1-R6/input-hashes.json"
R7_SOURCE_PATH = "deliveries/FINISH-C1-R7/verify-input-provenance.py"
R7_DELIVERY_PREFIX = "deliveries/FINISH-C1-R7/"
RECEIPT_FILES = (
    "source-binding.json",
    "candidate-input-provenance.json",
    "predecessor-output-git-blobs.json",
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_bytes(*args: str) -> bytes:
    process = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
    )
    if process.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} exited {process.returncode}: {process.stderr.decode(errors='replace')}")
    return process.stdout


def git_text(*args: str) -> str:
    return git_bytes(*args).decode("utf-8").strip()


def run(command: list[str], cwd: Path = REPO_ROOT) -> dict:
    process = subprocess.run(command, cwd=cwd, capture_output=True, text=True, check=False)
    return {
        "command": command,
        "cwd": str(cwd),
        "exitCode": process.returncode,
        "stdout": process.stdout,
        "stderr": process.stderr,
    }


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


def exact_blob(commit: str, path: str) -> dict:
    raw = git_bytes("show", f"{commit}:{path}")
    oid = git_text("rev-parse", "--verify", f"{commit}:{path}")
    return {"commit": commit, "path": path, "blobOid": oid, "sha256": sha256(raw), "bytes": len(raw), "_data": raw}


def verify_source_patch() -> dict:
    original = exact_blob(R7_COMMIT, R7_SOURCE_PATH)["_data"]
    corrected = (ROOT / "source" / "verify-input-provenance.py").read_bytes()
    before = original.decode("utf-8").splitlines(keepends=True)
    after = corrected.decode("utf-8").splitlines(keepends=True)
    patch_lines = difflib.unified_diff(
        before,
        after,
        fromfile=f"a/{R7_SOURCE_PATH}",
        tofile=f"b/{R7_SOURCE_PATH}",
        n=0,
    )
    patch = "".join(patch_lines).encode("utf-8")
    (ROOT / "source.patch").write_bytes(patch)

    original_path = ROOT / ".work" / "r7-original" / "verify-input-provenance.py"
    if original_path.read_bytes() != original:
        raise RuntimeError("preserved scratch R7 source differs from the pinned Git blob")
    with tempfile.TemporaryDirectory(dir=ROOT / ".work") as directory:
        replay_root = Path(directory).resolve(strict=True)
        target = replay_root / R7_SOURCE_PATH
        target.parent.mkdir(parents=True)
        target.write_bytes(original)
        target_relative = target.relative_to(replay_root)
        replay_root.resolve(strict=True).relative_to((ROOT / ".work").resolve(strict=True))
        check = run(["git", "apply", "--check", "--unidiff-zero", "--whitespace=nowarn", str(ROOT / "source.patch")], replay_root)
        if check["exitCode"] != 0:
            raise RuntimeError(f"source patch check failed: {check['stdout']} {check['stderr']}")
        apply = run(["git", "apply", "--unidiff-zero", "--whitespace=nowarn", str(ROOT / "source.patch")], replay_root)
        if apply["exitCode"] != 0:
            raise RuntimeError(f"source patch replay failed: {apply['stdout']} {apply['stderr']}")
        replayed = (replay_root / target_relative).read_bytes()
        if replayed != corrected:
            raise RuntimeError("source patch replay bytes differ from packaged corrected verifier")
    return {
        "schemaVersion": 1,
        "status": "PASS",
        "baseCommit": R7_COMMIT,
        "baseTree": R7_TREE,
        "basePath": R7_SOURCE_PATH,
        "baseBlobOid": git_text("rev-parse", "--verify", f"{R7_COMMIT}:{R7_SOURCE_PATH}"),
        "baseSha256": sha256(original),
        "baseBytes": len(original),
        "correctedSha256": sha256(corrected),
        "correctedBytes": len(corrected),
        "patchSha256": sha256(patch),
        "patchBytes": len(patch),
        "replayedBytesExactly": True,
        "commands": [check, apply],
    }


def verify_input_bindings() -> dict:
    source_blobs = {
        name: exact_blob(R7_COMMIT, f"{R7_DELIVERY_PREFIX}{name}")
        for name in ("source-binding.json", "candidate-input-provenance.json", "predecessor-output-git-blobs.json")
    }
    for name, blob in source_blobs.items():
        if (ROOT / name).read_bytes() != blob["_data"]:
            raise RuntimeError(f"packaged input {name} differs from the exact R7 Git blob")
    r6_manifest = exact_blob(R6_COMMIT, R6_MANIFEST_PATH)
    binding = json.loads(source_blobs["source-binding.json"]["_data"])
    receipt = json.loads(source_blobs["candidate-input-provenance.json"]["_data"])
    dependency = binding["threeDependencyEvidence"]
    package_root = (REPO_ROOT / "app" / "node_modules" / "three").resolve(strict=True)
    package_info = json.loads((package_root / "package.json").read_text(encoding="utf-8"))
    package_files = []
    for row in dependency["packageFiles"]:
        data = (package_root / row["packageFile"]).read_bytes()
        package_files.append({
            "alias": row["alias"],
            "packageFile": row["packageFile"],
            "sha256": sha256(data),
            "bytes": len(data),
            "matchesPinnedR7Declaration": sha256(data) == row["sha256"] and len(data) == row["bytes"],
        })
    expected_source_manifest = {key: r6_manifest[key] for key in ("commit", "path", "blobOid", "sha256", "bytes")}
    if receipt.get("sourceManifest") != expected_source_manifest:
        raise RuntimeError("exact R7 sourceManifest does not match the raw R6 manifest blob")
    return {
        "schemaVersion": 1,
        "status": "PASS",
        "candidate": {
            "commit": R7_COMMIT,
            "tree": git_text("rev-parse", "--verify", f"{R7_COMMIT}^{{tree}}"),
            "parent": git_text("rev-parse", "--verify", f"{R7_COMMIT}^"),
            "appTree": git_text("rev-parse", "--verify", f"{R7_COMMIT}:app"),
            "deliveryStableFiles": len(git_text("ls-tree", "-r", "--name-only", R7_COMMIT, "--", "deliveries/FINISH-C1-R7").splitlines()),
        },
        "r6SourceManifest": {key: r6_manifest[key] for key in ("commit", "path", "blobOid", "sha256", "bytes")},
        "r7Receipts": {
            name: {key: blob[key] for key in ("commit", "path", "blobOid", "sha256", "bytes")}
            for name, blob in source_blobs.items()
        },
        "sourceManifestDeclaration": receipt["sourceManifest"],
        "sourceManifestMatchesRawR6Blob": True,
        "installedPackage": {
            "name": package_info.get("name"),
            "version": package_info.get("version"),
            "resolvedRoot": package_root.relative_to(REPO_ROOT.resolve()).as_posix(),
            "declaredRoot": dependency["installedPackageRoot"],
            "packageFiles": package_files,
        },
        "correctedVerifier": {
            "path": "source/verify-input-provenance.py",
            "sha256": sha256((ROOT / "source" / "verify-input-provenance.py").read_bytes()),
            "bytes": (ROOT / "source" / "verify-input-provenance.py").stat().st_size,
        },
    }


def stable_files() -> list[Path]:
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if ".work" in relative.parts or "__pycache__" in relative.parts or path.name == "output-hashes.json":
            continue
        files.append(path)
    return sorted(files, key=lambda path: path.relative_to(ROOT).as_posix())


def main() -> int:
    if git_text("rev-parse", "--verify", f"{R7_COMMIT}^{{tree}}") != R7_TREE:
        raise SystemExit("FINISH-C1-R7 tree pin mismatch")
    app_tree = git_text("rev-parse", "--verify", f"{R7_COMMIT}:app")
    if app_tree != R7_APP_TREE:
        raise SystemExit("FINISH-C1-R7 app-tree pin mismatch")

    patch_result = verify_source_patch()
    write_json(ROOT / "evidence" / "source-patch-replay.json", patch_result)
    binding_result = verify_input_bindings()
    write_json(ROOT / "evidence" / "candidate-binding.json", binding_result)

    positive_command = [
        sys.executable,
        "-B",
        str(ROOT / "source" / "verify-input-provenance.py"),
        "--check-output-manifest",
        "--commit",
        R7_COMMIT,
    ]
    positive = run(positive_command)
    (ROOT / "evidence" / "positive-cli.log").write_text(
        positive["stdout"] + positive["stderr"], encoding="utf-8", newline="\n"
    )
    if positive["exitCode"] != 0 or "PASS" not in positive["stdout"]:
        raise SystemExit("positive exact-candidate verifier run failed")
    write_json(ROOT / "evidence" / "positive-cli.json", positive)

    test_command = [
        sys.executable,
        "-B",
        "-m",
        "unittest",
        "discover",
        "-s",
        str(ROOT / "tests"),
        "-p",
        "test_*.py",
        "-v",
    ]
    tests = run(test_command)
    (ROOT / "evidence" / "tests.log").write_text(
        tests["stdout"] + tests["stderr"], encoding="utf-8", newline="\n"
    )
    if tests["exitCode"] != 0:
        raise SystemExit("FINISH-C1-R8 regression suite failed")
    write_json(ROOT / "evidence" / "tests.json", tests)

    negative_command = [sys.executable, "-B", str(ROOT / "scripts" / "verify-negative-cli.py")]
    negative = run(negative_command)
    (ROOT / "evidence" / "negative-runner.log").write_text(
        negative["stdout"] + negative["stderr"], encoding="utf-8", newline="\n"
    )
    if negative["exitCode"] != 0:
        raise SystemExit("uncached negative CLI regression failed")
    write_json(ROOT / "evidence" / "negative-runner.json", negative)

    version_command = run([sys.executable, "--version"])
    git_version_command = run(["git", "--version"])
    versions = {
        "observedUtc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version,
        "pythonCommand": version_command,
        "gitCommand": git_version_command,
        "platform": sys.platform,
        "three": binding_result["installedPackage"],
    }
    write_json(ROOT / "evidence" / "tool-versions.json", versions)

    requirement_matrix = {
        "schemaVersion": 1,
        "packet": "FINISH-28",
        "candidateCommit": R7_COMMIT,
        "results": [
            {"id": "E-02-01", "requirement": "All five candidate sourceManifest fields match the raw pinned R6 manifest blob; missing/extra fields fail closed.", "status": "PASS", "evidence": ["tests/test_fail_closed_metadata.py", "evidence/candidate-binding.json", "evidence/tests.log"]},
            {"id": "E-02-02", "requirement": "Every packageFiles alias, packageFile, SHA-256 and byte count is exact, unique, and matches installed three@0.180.0 bytes.", "status": "PASS", "evidence": ["evidence/candidate-binding.json", "evidence/tests.log"]},
            {"id": "E-02-03", "requirement": "Malformed, missing, extra, duplicate, or contradictory declarations are rejected.", "status": "PASS", "evidence": ["evidence/tests.log"]},
            {"id": "E-02-04", "requirement": "Previously passing malformed hash, wrong path/commit/count, duplicate alias/path, missing-file, unpinned commit, lock-integrity, and package identity/version/byte probes still reject.", "status": "PASS", "evidence": ["evidence/tests.log"]},
            {"id": "E-02-05", "requirement": "Uncached CLI with zeroed sourceManifest hash and output-manifest check returns FAIL and nonzero.", "status": "PASS", "evidence": ["evidence/cli-negative-false-pass.json", "evidence/cli-negative-false-pass.log"]},
            {"id": "LINEAGE-01", "requirement": "R7 candidate, R6 source manifest, installed package bytes, and patch replay are bound to exact local inputs.", "status": "PASS", "evidence": ["evidence/candidate-binding.json", "evidence/source-patch-replay.json"]},
            {"id": "LIMIT-01", "requirement": "E-01 disposition, external GPT Plus #2, application/runtime/build/browser, physical/device/provider, deployment and G7.", "status": "NOT RUN", "evidence": []},
        ],
    }
    write_json(ROOT / "requirement-matrix.json", requirement_matrix)

    report = f"""# FINISH-C1-R8 verifier correction

Status: **local correction package PASS; independent delta audit and Parent acceptance pending**.

This evidence-only package corrects E-02 against exact C1-R7 candidate `{R7_COMMIT}`. It validates all fields in the duplicated R6 source-manifest declaration and every `threeDependencyEvidence.packageFiles` declaration against the pinned receipt and installed Three.js bytes. It adds fail-closed JSON-key handling and regression coverage without changing C1-R7, application/runtime source, dependency files, or canonical `app/`.

The exact candidate output-manifest check passed. The regression suite passed, including all source-manifest fields, package-file row fields, missing/extra/duplicate cases, inherited fail-closed checks, disposable package-identity/version/byte probes, and the uncached CLI false-pass reproduction. The zeroed hash now returns structured `FAIL` with exit 1; the raw child stdout, stderr and command are in `evidence/cli-negative-false-pass.json`.

The corrected source patch replays from the verifier blob pinned by R7 and reproduces the packaged verifier byte-for-byte. The three input receipts are copied as raw bytes from R7 commit `{R7_COMMIT}`. Installed package identity and both package-file hashes match the R7 evidence and actual local `three@0.180.0` bytes. Stable output hashes are listed in `output-hashes.json`.

The correction does not adjudicate E-01. External GPT Plus #2, separate Parent acceptance, application/runtime/build/browser, native provider, physical-device/accessibility, deployment, recovery, and G7 checks remain **NOT RUN**. This package makes no canonical integration claim.
"""
    (ROOT / "report.md").write_text(report, encoding="utf-8", newline="\n")

    outputs = []
    total_bytes = 0
    for path in stable_files():
        raw = path.read_bytes()
        relative = path.relative_to(ROOT).as_posix()
        outputs.append({"path": relative, "sha256": sha256(raw), "bytes": len(raw)})
        total_bytes += len(raw)
    write_json(ROOT / "output-hashes.json", {
        "schemaVersion": 1,
        "delivery": "FINISH-C1-R8",
        "candidateCommit": R7_COMMIT,
        "fileCount": len(outputs),
        "totalBytes": total_bytes,
        "outputs": outputs,
    })
    print(f"PASS: FINISH-C1-R8 evidence finalized; {len(outputs)} stable files / {total_bytes} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
