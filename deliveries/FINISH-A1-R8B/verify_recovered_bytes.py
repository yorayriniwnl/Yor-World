#!/usr/bin/env python3
"""Verify FINISH-A1-R8B recovered bytes against declared hashes and Git objects."""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RECOVERY = ROOT / "input-recovery.json"

def git(*args: str, input_bytes: bytes | None = None, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(["git", *args], cwd=ROOT.parents[1], input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and result.returncode:
        raise RuntimeError(f"git {' '.join(args)} failed ({result.returncode}): {result.stderr.decode(errors='replace')}")
    return result

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def blob_oid(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode()
    return hashlib.sha1(header + data).hexdigest()

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", help="candidate commit to verify; without it, only local bytes and predicted Git IDs are checked")
    args = parser.parse_args()
    data = json.loads(RECOVERY.read_text(encoding="utf-8"))
    errors: list[str] = []
    print(f"R8B recovery verifier | R8={data['r8Commit']} | mode={'commit '+args.commit if args.commit else 'worktree/predicted'}")
    for item in data["recoveredFiles"]:
        rel = item["packagePath"]
        path = ROOT / Path(rel)
        actual = path.read_bytes()
        size = len(actual)
        digest = sha256(actual)
        oid = blob_oid(actual)
        local_ok = size == item["bytes"] and digest == item["sha256"] and oid == item["r8bGitBlob"]
        print(f"LOCAL {rel}: bytes={size} sha256={digest} gitBlob={oid} expectedBytes={item['bytes']} expectedSha256={item['sha256']} expectedGitBlob={item['r8bGitBlob']} status={'PASS' if local_ok else 'FAIL'}")
        if not local_ok:
            errors.append(f"local mismatch: {rel}")
        source_commit_path = f"{data['r8Commit']}:{item['originalRepoPath']}"
        absent = git("cat-file", "-e", source_commit_path, check=False)
        print(f"R8_PATH {item['originalRepoPath']}: exit={absent.returncode} status={'PASS_ABSENT' if absent.returncode != 0 else 'FAIL_PRESENT'}")
        if absent.returncode == 0:
            errors.append(f"unexpected path present in R8: {item['originalRepoPath']}")
        if args.commit:
            committed = git("show", f"{args.commit}:deliveries/FINISH-A1-R8B/{item['packagePath']}").stdout
            commit_ok = committed == actual and sha256(committed) == item["sha256"] and blob_oid(committed) == item["r8bGitBlob"]
            print(f"COMMIT {item['packagePath']}: bytes={len(committed)} sha256={sha256(committed)} gitBlob={blob_oid(committed)} status={'PASS' if commit_ok else 'FAIL'}")
            if not commit_ok:
                errors.append(f"committed blob mismatch: {item['packagePath']}")
    if args.commit:
        resolved = git("rev-parse", "--verify", f"{args.commit}^{{commit}}").stdout.decode().strip()
        tree = git("rev-parse", f"{resolved}^{{tree}}").stdout.decode().strip()
        parent = git("rev-parse", f"{resolved}^{{commit}}^").stdout.decode().strip()
        print(f"CANDIDATE commit={resolved} tree={tree} parent={parent}")
        if parent != data["r8Commit"]:
            errors.append(f"candidate parent {parent} is not pinned R8 {data['r8Commit']}")
        manifest = json.loads(git("show", f"{resolved}:deliveries/FINISH-A1-R8B/output-hashes.json").stdout)
        for item in manifest["files"]:
            committed = git("show", f"{resolved}:deliveries/FINISH-A1-R8B/{item['path']}").stdout
            ok = len(committed) == item["bytes"] and sha256(committed) == item["sha256"] and blob_oid(committed) == item["gitBlob"]
            print(f"OUTPUT {item['path']}: bytes={len(committed)} sha256={sha256(committed)} gitBlob={blob_oid(committed)} status={'PASS' if ok else 'FAIL'}")
            if not ok:
                errors.append(f"output manifest mismatch: {item['path']}")
        print(f"OUTPUT_MANIFEST files={manifest['fileCount']} totalBytes={manifest['totalBytes']} verified={len(manifest['files'])}")
    print(f"RESULT={'FAIL' if errors else 'PASS'}")
    for error in errors:
        print(f"ERROR {error}")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())