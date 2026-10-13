from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def git(*args: str) -> bytes:
    return subprocess.run(["git", *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", required=True)
    parser.add_argument("--parent", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--delivery", required=True)
    parser.add_argument("--manifest", default="output-hashes.json")
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--tree", required=True)
    parser.add_argument("--subtree", required=True)
    parser.add_argument("--app-tree", required=True)
    parser.add_argument("--files-member", required=True)
    parser.add_argument("--count-member", required=True)
    parser.add_argument("--bytes-member", required=True)
    parser.add_argument("--expected-count", type=int, required=True)
    parser.add_argument("--expected-bytes", type=int, required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    errors: list[str] = []
    commit = git("rev-parse", "--verify", f"{args.commit}^{{commit}}").decode().strip()
    parent = git("rev-parse", "--verify", f"{commit}^").decode().strip()
    tree = git("rev-parse", "--verify", f"{commit}^{{tree}}").decode().strip()
    subtree = git("rev-parse", "--verify", f"{commit}:{args.delivery}").decode().strip()
    app_tree = git("rev-parse", "--verify", f"{commit}:app").decode().strip()
    if commit != args.commit:
        errors.append(f"commit mismatch: {commit}")
    if parent != args.parent:
        errors.append(f"parent mismatch: {parent}")
    if tree != args.tree:
        errors.append(f"tree mismatch: {tree}")
    if subtree != args.subtree:
        errors.append(f"delivery subtree mismatch: {subtree}")
    if app_tree != args.app_tree:
        errors.append(f"app tree mismatch: {app_tree}")

    remote = git("ls-remote", "origin", f"refs/heads/{args.branch}").decode().strip().split()
    remote_sha = remote[0] if remote else None
    if remote_sha != args.commit:
        errors.append(f"remote branch tip mismatch: {remote_sha}")

    manifest_path = f"{args.delivery}/{args.manifest}"
    manifest_raw = git("show", f"{commit}:{manifest_path}")
    manifest_sha = hashlib.sha256(manifest_raw).hexdigest()
    if manifest_sha != args.manifest_sha256:
        errors.append(f"manifest SHA-256 mismatch: {manifest_sha}")
    manifest = json.loads(manifest_raw)
    rows = manifest[args.files_member]
    row_paths = {row["path"] for row in rows}
    if len(row_paths) != len(rows):
        errors.append("duplicate manifest paths")
    all_paths = set(
        git("ls-tree", "-r", "--name-only", commit, f"{args.delivery}/").decode().splitlines()
    )
    actual_stable_paths = {path[len(args.delivery) + 1 :] for path in all_paths if path != manifest_path}
    if row_paths != actual_stable_paths:
        missing = sorted(actual_stable_paths - row_paths)
        extra = sorted(row_paths - actual_stable_paths)
        errors.append(f"manifest inventory mismatch: missing={missing}; extra={extra}")
    if len(rows) != args.expected_count or manifest[args.count_member] != args.expected_count:
        errors.append(f"file count mismatch: rows={len(rows)} metadata={manifest[args.count_member]}")
    total_bytes = 0
    verified = 0
    for row in rows:
        path = f"{args.delivery}/{row['path']}"
        raw = git("show", f"{commit}:{path}")
        size = len(raw)
        digest = hashlib.sha256(raw).hexdigest()
        total_bytes += size
        if size != row["bytes"] or digest != row["sha256"]:
            errors.append(f"raw output mismatch: {row['path']} bytes={size} sha256={digest}")
        else:
            verified += 1
    if total_bytes != args.expected_bytes or manifest[args.bytes_member] != args.expected_bytes:
        errors.append(f"total byte mismatch: raw={total_bytes} metadata={manifest[args.bytes_member]}")

    changed = set(git("diff-tree", "--no-commit-id", "--name-only", "-r", parent, commit).decode().splitlines())
    prefix = f"{args.delivery}/"
    out_of_scope = sorted(path for path in changed if not path.startswith(prefix))
    if out_of_scope:
        errors.append(f"out-of-scope commit paths: {out_of_scope}")

    result = {
        "status": "PASS" if not errors else "FAIL",
        "commit": commit,
        "parent": parent,
        "fullTree": tree,
        "delivery": args.delivery,
        "deliverySubtree": subtree,
        "appTree": app_tree,
        "remoteBranch": args.branch,
        "remoteTip": remote_sha,
        "manifestPath": manifest_path,
        "manifestSha256": manifest_sha,
        "manifestRows": len(rows),
        "verifiedRows": verified,
        "expectedCount": args.expected_count,
        "verifiedTotalBytes": total_bytes,
        "expectedTotalBytes": args.expected_bytes,
        "commitChangedPathCount": len(changed),
        "outOfScopeChangedPaths": out_of_scope,
        "errors": errors,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
