#!/usr/bin/env python3
"""Verify FINISH-50 source.patch from exact R6 raw Git blobs to exact R7 outputs."""
from __future__ import annotations
import argparse
import hashlib
import json
import platform
import re
import subprocess
import tempfile
from pathlib import Path

R6 = "e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf"
R6_TREE = "60da77df9e600670a416635101558203872bde7b"
R7 = "876e119d100936fc821b8618c5aa0e057584b338"
R7_TREE = "c88be58f85cd46914b271b86d2f5ecda90cc1cce"
GOV = "e4f6cd68ffa3c8cb8cc0c927afebe07445b736ad"
R7_MANIFEST_SHA256 = "2a56fb6bf39ffe742bb75a16fa5cb4ab89f155319b6cf1f4918ca43419f8941a"
EXPECTED_APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
FILES = {
    "assets/room.glb": {
        "r6_path": "deliveries/FINISH-B1-R6/assets/room.glb",
        "r6_blob": "61194e81466b609997b5ebbae6e65235844ff3af",
        "r6_bytes": 1447928,
        "r6_sha256": "6e247e1621fcdd934b57912894a3199add84355b0fe18d36a6745ed82b36623d",
        "r7_path": "deliveries/FINISH-B1-R7/assets/room.glb",
        "r7_blob": "8f70cb95511c6b8dd9350647d52ab93fbf62166f",
        "r7_bytes": 2059280,
        "r7_sha256": "7d1c11e3d67f84fddbbaac609c2ca88a025cec400fe2cddb15ab1a92cf29bb67",
    },
    "assets/source/room.blend": {
        "r6_path": "deliveries/FINISH-B1-R6/assets/source/room.blend",
        "r6_blob": "45a121bd2187a7b80a200ed8dc5fb9d77f7c15f8",
        "r6_bytes": 436194,
        "r6_sha256": "e781e4d9d1bcd16da2a48e58ad44844d90fc9784537644e474060e1e357a96ea",
        "r7_path": "deliveries/FINISH-B1-R7/assets/source/room.blend",
        "r7_blob": "ef8f84aef4717d6549fd58c9357c47d06d09de03",
        "r7_bytes": 445694,
        "r7_sha256": "1820982983ce8bc785ddfcc97c2a0abec738c0d311aaf1fe632aca5c0fad5600",
    },
}
GOV_INPUTS = {
    "docs/planning/reconciliation-packets/2026-10-12-finish-50-b1-r8-source-patch-supplement.md": "FINISH-50 packet",
    "docs/planning/production-prompts/repairs-2026-10-12/28-CODEX-B1-R8.md": "FINISH-50 prompt",
}
R6_PREFIX = "deliveries/FINISH-B1-R6/"
R7_PREFIX = "deliveries/FINISH-B1-R7/"


def run(args: list[str], cwd: Path, *, data: bytes | None = None, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    p = subprocess.run(args, cwd=cwd, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {args!r}\n{p.stderr.decode(errors='replace')}")
    return p

def git(repo: Path, *args: str, data: bytes | None = None) -> bytes:
    return run(["git", *args], repo, data=data).stdout

def commit_tree(repo: Path, commit: str) -> str:
    return git(repo, "rev-parse", f"{commit}^{{tree}}").decode().strip()

def load_blob(repo: Path, commit: str, path: str, expected: dict[str, object], side: str) -> tuple[str, bytes]:
    oid = git(repo, "rev-parse", f"{commit}:{path}").decode().strip()
    data = git(repo, "cat-file", "blob", oid)
    got = {"blob": oid, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    want = {k: expected[f"{side}_{k}"] for k in ("blob", "bytes", "sha256")}
    if got != want:
        raise RuntimeError(f"raw Git binding mismatch for {path}: expected={want!r}, got={got!r}")
    return oid, data

def ls_tree(repo: Path, commit: str) -> dict[str, str]:
    raw = git(repo, "ls-tree", "-r", "-z", commit)
    result: dict[str, str] = {}
    for row in raw.split(b"\0"):
        if not row:
            continue
        meta, path = row.split(b"\t", 1)
        _mode, kind, oid = meta.decode().split()
        if kind == "blob":
            result[path.decode("utf-8", errors="surrogateescape")] = oid
    return result

def verify_r7_manifest(repo: Path) -> dict[str, object]:
    manifest_path = R7_PREFIX + "output-hashes.json"
    manifest_blob = git(repo, "rev-parse", f"{R7}:{manifest_path}").decode().strip()
    raw = git(repo, "cat-file", "blob", manifest_blob)
    actual_manifest_sha = hashlib.sha256(raw).hexdigest()
    if actual_manifest_sha != R7_MANIFEST_SHA256:
        raise RuntimeError(f"R7 output manifest SHA mismatch: {actual_manifest_sha}")
    manifest = json.loads(raw)
    if manifest.get("baseCommit") != R6 or manifest.get("baseTree") != R6_TREE:
        raise RuntimeError("R7 output manifest does not pin the FINISH-50 R6 base")
    tree = ls_tree(repo, R7)
    bad: list[dict[str, object]] = []
    bytes_seen = 0
    verified = 0
    for item in manifest["files"]:
        path = R7_PREFIX + item["path"]
        oid = tree.get(path)
        if oid is None:
            bad.append({"path": path, "error": "missing raw Git path"})
            continue
        data = git(repo, "cat-file", "blob", oid)
        bytes_seen += len(data)
        if len(data) != item["bytes"] or hashlib.sha256(data).hexdigest() != item["sha256"]:
            bad.append({"path": path, "error": "raw Git bytes/hash mismatch"})
        else:
            verified += 1
    if bad or verified != 260 or bytes_seen != 49362930:
        raise RuntimeError(f"R7 manifest raw Git verification failed: verified={verified}, bytes={bytes_seen}, bad={bad[:4]}")
    package_paths = {p for p in tree if p.startswith(R7_PREFIX)}
    listed_paths = {R7_PREFIX + item["path"] for item in manifest["files"]}
    excluded = sorted(package_paths - listed_paths)
    expected_excluded = sorted({
        R7_PREFIX + "output-hashes.json",
        R7_PREFIX + "evidence/git-raw-blob-check.json",
        R7_PREFIX + "evidence/package-verification.json",
    })
    if excluded != expected_excluded:
        raise RuntimeError(f"unexpected R7 manifest exclusions: {excluded!r}")
    return {
        "commit": R7,
        "tree": R7_TREE,
        "manifestPath": manifest_path,
        "manifestBlob": manifest_blob,
        "manifestSha256": actual_manifest_sha,
        "manifestFiles": len(manifest["files"]),
        "rawGitVerifiedFiles": verified,
        "rawGitVerifiedBytes": bytes_seen,
        "excludedPaths": [p[len(R7_PREFIX):] for p in excluded],
        "status": "PASS",
    }

def verify_assets_and_app(repo: Path) -> dict[str, object]:
    t6 = ls_tree(repo, R6)
    t7 = ls_tree(repo, R7)
    a6 = {p[len(R6_PREFIX + "assets/"):]: oid for p, oid in t6.items() if p.startswith(R6_PREFIX + "assets/")}
    a7 = {p[len(R7_PREFIX + "assets/"):]: oid for p, oid in t7.items() if p.startswith(R7_PREFIX + "assets/")}
    changed = sorted(p for p in set(a6) | set(a7) if a6.get(p) != a7.get(p))
    expected = sorted(rel[len("assets/"):] for rel in FILES)
    if set(a6) != set(a7) or changed != expected:
        raise RuntimeError(f"unexpected R6/R7 asset scope: changed={changed!r}")
    app6 = git(repo, "rev-parse", f"{R6}:app").decode().strip()
    app7 = git(repo, "rev-parse", f"{R7}:app").decode().strip()
    if app6 != EXPECTED_APP_TREE or app7 != EXPECTED_APP_TREE:
        raise RuntimeError(f"canonical app tree changed: R6={app6}, R7={app7}")
    parent = run(["git", "merge-base", "--is-ancestor", R6, R7], repo, check=False)
    if parent.returncode != 0:
        raise RuntimeError("R6 is not an ancestor of R7")
    return {
        "r6AssetFiles": len(a6),
        "r7AssetFiles": len(a7),
        "changedAssetPaths": ["assets/" + p for p in changed],
        "unchangedAssetPathCount": len(a6) - len(changed),
        "allOtherAssetsBlobIdentical": True,
        "r6AppTree": app6,
        "r7AppTree": app7,
        "r6IsAncestorOfR7": True,
    }

def verify_governance_inputs(repo: Path) -> dict[str, object]:
    result: dict[str, object] = {}
    for path, label in GOV_INPUTS.items():
        oid = git(repo, "rev-parse", f"{GOV}:{path}").decode().strip()
        data = git(repo, "cat-file", "blob", oid)
        result[path] = {
            "label": label,
            "commit": GOV,
            "gitBlob": oid,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        }
    return result

def patch_paths(patch: bytes) -> list[str]:
    rows = re.findall(rb"^diff --git a/(.*?) b/(.*?)$", patch, flags=re.MULTILINE)
    left = sorted(a.decode() for a, _ in rows)
    right = sorted(b.decode() for _, b in rows)
    if left != sorted(FILES) or right != sorted(FILES) or patch.count(b"GIT binary patch") != 2:
        raise RuntimeError(f"source.patch must contain only two binary file patches: left={left}, right={right}")
    return left

def replay(repo: Path, package: Path, old_data: dict[str, bytes], target_info: dict[str, dict[str, object]]) -> dict[str, object]:
    patch_path = package / "source.patch"
    patch = patch_path.read_bytes()
    paths = patch_paths(patch)
    steps: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory(prefix="finish50-replay-", dir=package) as temp:
        scratch = Path(temp)
        for rel, data in old_data.items():
            dest = scratch / Path(rel)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        (scratch / ".gitattributes").write_text("*.glb binary\n*.blend binary\n", encoding="ascii")
        commands = [
            ["git", "init", "--quiet"],
            ["git", "config", "core.autocrlf", "false"],
            ["git", "config", "core.filemode", "false"],
            ["git", "config", "user.name", "FINISH-50 replay verifier"],
            ["git", "config", "user.email", "finish50-replay@invalid.local"],
            ["git", "add", "--", ".gitattributes", *FILES.keys()],
            ["git", "commit", "--quiet", "-m", "FINISH-50 exact R6 replay base"],
            ["git", "apply", "--binary", "--check", str(patch_path)],
            ["git", "apply", "--binary", str(patch_path)],
        ]
        for command in commands:
            p = run(command, scratch)
            steps.append({"argv": command, "exitCode": p.returncode})
        changed = git(scratch, "diff", "--name-only", "HEAD").decode().splitlines()
        if sorted(changed) != sorted(FILES):
            raise RuntimeError(f"patch changed paths mismatch: {changed!r}")
        output_checks: dict[str, object] = {}
        for rel, target in target_info.items():
            data = (scratch / Path(rel)).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            ok = len(data) == target["bytes"] and digest == target["sha256"]
            output_checks[rel] = {
                "bytes": len(data),
                "sha256": digest,
                "expectedBytes": target["bytes"],
                "expectedSha256": target["sha256"],
                "matchesR7RawGitOutput": ok,
            }
            if not ok:
                raise RuntimeError(f"replay output mismatch: {rel}: {output_checks[rel]!r}")
        actual_files = sorted(p.relative_to(scratch).as_posix() for p in scratch.rglob("*") if p.is_file() and ".git" not in p.parts)
        if actual_files != sorted([*FILES.keys(), ".gitattributes"]):
            raise RuntimeError(f"unexpected scratch file inventory: {actual_files!r}")
    return {
        "patchSha256": hashlib.sha256(patch).hexdigest(),
        "patchBytes": len(patch),
        "patchPaths": paths,
        "binaryPatchBlocks": patch.count(b"GIT binary patch"),
        "commands": steps,
        "changedPaths": sorted(changed),
        "outputs": output_checks,
        "scratchCleaned": True,
        "exitCode": 0,
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[3])
    args = parser.parse_args()
    repo = args.repo.resolve()
    package = Path(__file__).resolve().parents[1]
    if commit_tree(repo, R6) != R6_TREE or commit_tree(repo, R7) != R7_TREE:
        raise RuntimeError("pinned R6 or R7 tree mismatch")

    source_inputs: dict[str, dict[str, object]] = {}
    old_data: dict[str, bytes] = {}
    target_info: dict[str, dict[str, object]] = {}
    for rel, spec in FILES.items():
        r6_oid, r6_data = load_blob(repo, R6, str(spec["r6_path"]), spec, "r6")
        r7_oid, r7_data = load_blob(repo, R7, str(spec["r7_path"]), spec, "r7")
        old_data[rel] = r6_data
        target_info[rel] = {"blob": r7_oid, "bytes": len(r7_data), "sha256": hashlib.sha256(r7_data).hexdigest()}
        source_inputs[rel] = {
            "r6": {"commit": R6, "path": spec["r6_path"], "gitBlob": r6_oid, "bytes": len(r6_data), "sha256": hashlib.sha256(r6_data).hexdigest()},
            "r7": {"commit": R7, "path": spec["r7_path"], "gitBlob": r7_oid, "bytes": len(r7_data), "sha256": hashlib.sha256(r7_data).hexdigest()},
        }

    r7_manifest = verify_r7_manifest(repo)
    asset_scope = verify_assets_and_app(repo)
    governance = verify_governance_inputs(repo)
    replay_result = replay(repo, package, old_data, target_info)
    git_version = git(repo, "--version").decode().strip()
    patch_hash = replay_result["patchSha256"]
    inputs = {
        "format": "YOR-WORLD-FINISH-50-B1-R8-INPUT-HASHES-v1",
        "governanceHead": GOV,
        "r6BaseCommit": R6,
        "r6BaseTree": R6_TREE,
        "r7CandidateCommit": R7,
        "r7CandidateTree": R7_TREE,
        "canonicalAppTree": EXPECTED_APP_TREE,
        "governanceInputs": governance,
        "sourceFiles": source_inputs,
        "r7OutputManifest": r7_manifest,
        "assetScope": asset_scope,
        "sourcePatch": {"path": "source.patch", "bytes": replay_result["patchBytes"], "sha256": patch_hash},
        "hashPolicy": "SHA-256 and Git blob IDs are computed over raw Git blob bytes; no working-copy normalization is used.",
    }
    receipt = {
        "format": "YOR-WORLD-FINISH-50-B1-R8-SOURCE-PATCH-REPLAY-v1",
        "status": "PASS",
        "baseCommit": R6,
        "baseTree": R6_TREE,
        "targetCommit": R7,
        "targetTree": R7_TREE,
        "sourcePatch": replay_result,
        "verifierCommand": ["python", "scripts/replay-source-patch.py", "--repo", "."],
        "invocation": ["python", "scripts/replay-source-patch.py", "--repo", str(repo)],
        "workingDirectory": str(repo),
        "toolVersions": {"python": platform.python_version(), "git": git_version},
        "r7ManifestRawGitStatus": r7_manifest["status"],
        "scopeStatus": "PASS",
        "exitCode": 0,
        "limits": ["Artifact-only supplement; no new visual review, device proof, or art acceptance."],
    }
    (package / "input-hashes.json").write_text(json.dumps(inputs, indent=2) + "\n", encoding="utf-8", newline="\n")
    (package / "source-patch-replay.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": "PASS",
        "baseCommit": R6,
        "targetCommit": R7,
        "r7ManifestRawGit": {"files": r7_manifest["rawGitVerifiedFiles"], "bytes": r7_manifest["rawGitVerifiedBytes"], "status": "PASS"},
        "changedAssetPaths": asset_scope["changedAssetPaths"],
        "appTreeUnchanged": asset_scope["r6AppTree"] == asset_scope["r7AppTree"],
        "sourcePatch": {"bytes": replay_result["patchBytes"], "sha256": patch_hash, "paths": replay_result["patchPaths"], "binaryBlocks": replay_result["binaryPatchBlocks"]},
        "replayOutputsMatch": all(bool(v["matchesR7RawGitOutput"]) for v in replay_result["outputs"].values()),
        "exitCode": 0,
    }, indent=2))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL: {type(exc).__name__}: {exc}")
        raise
