#!/usr/bin/env python3
"""Verify a committed FINISH-50 package against its raw Git blobs and exact parent."""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

BASE = "876e119d100936fc821b8618c5aa0e057584b338"
BASE_TREE = "c88be58f85cd46914b271b86d2f5ecda90cc1cce"
PACKAGE_PREFIX = "deliveries/FINISH-B1-R8/"


def git(repo: Path, *args: str) -> bytes:
    p = subprocess.run(["git", *args], cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(f"git {args!r} failed ({p.returncode}): {p.stderr.decode(errors='replace')}")
    return p.stdout


def tree(repo: Path, rev: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for row in git(repo, "ls-tree", "-r", "-z", rev).split(b"\0"):
        if not row:
            continue
        meta, raw_path = row.split(b"\t", 1)
        _mode, kind, oid = meta.decode().split()
        if kind == "blob":
            out[raw_path.decode("utf-8", errors="surrogateescape")] = oid
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--commit", default="HEAD")
    args = parser.parse_args()
    repo = args.repo.resolve()
    commit = git(repo, "rev-parse", args.commit).decode().strip()
    parent = git(repo, "rev-parse", f"{commit}^1").decode().strip()
    if parent != BASE:
        raise RuntimeError(f"candidate parent mismatch: expected {BASE}, got {parent}")
    if git(repo, "rev-parse", f"{BASE}^{{tree}}").decode().strip() != BASE_TREE:
        raise RuntimeError("pinned R7 base tree mismatch")
    current_tree = tree(repo, commit)
    base_tree = tree(repo, BASE)
    changed = sorted(p for p in set(current_tree) | set(base_tree) if current_tree.get(p) != base_tree.get(p))
    if not changed or any(not p.startswith(PACKAGE_PREFIX) for p in changed):
        raise RuntimeError(f"candidate changed paths outside R8 package: {changed!r}")
    manifest_path = PACKAGE_PREFIX + "output-hashes.json"
    manifest_blob = current_tree.get(manifest_path)
    if manifest_blob is None:
        raise RuntimeError("output-hashes.json is missing from raw Git tree")
    manifest_raw = git(repo, "cat-file", "blob", manifest_blob)
    manifest = json.loads(manifest_raw)
    if manifest.get("candidate") != "FINISH-B1-R8" or manifest.get("baseCommit") != BASE or manifest.get("baseTree") != BASE_TREE:
        raise RuntimeError("output manifest metadata mismatch")
    listed = {PACKAGE_PREFIX + row["path"]: row for row in manifest["files"]}
    actual_package = {p for p in current_tree if p.startswith(PACKAGE_PREFIX)}
    if actual_package != set(listed) | {manifest_path}:
        raise RuntimeError(f"manifest file inventory mismatch: unlisted={sorted(actual_package-set(listed)-{manifest_path})}, absent={sorted(set(listed)-actual_package)}")
    failures = []
    total_bytes = 0
    for path, row in listed.items():
        oid = current_tree[path]
        raw = git(repo, "cat-file", "blob", oid)
        total_bytes += len(raw)
        if len(raw) != row["bytes"] or hashlib.sha256(raw).hexdigest() != row["sha256"]:
            failures.append(path)
    if failures:
        raise RuntimeError(f"raw Git manifest mismatch: {failures!r}")
    app_base = git(repo, "rev-parse", f"{BASE}:app").decode().strip()
    app_candidate = git(repo, "rev-parse", f"{commit}:app").decode().strip()
    if app_base != app_candidate:
        raise RuntimeError("canonical app tree changed")
    print(json.dumps({
        "status": "PASS",
        "candidateCommit": commit,
        "candidateTree": git(repo, "rev-parse", f"{commit}^{{tree}}").decode().strip(),
        "exactParent": parent,
        "changedPathCount": len(changed),
        "changedPaths": changed,
        "manifestFiles": len(listed),
        "rawGitVerifiedFiles": len(listed),
        "rawGitVerifiedBytes": total_bytes,
        "appTreeUnchanged": app_base == app_candidate,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
