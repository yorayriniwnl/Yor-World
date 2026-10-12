#!/usr/bin/env python3
"""Build a Git binary patch from the pinned R6 raw blobs to pinned R7 outputs."""
from __future__ import annotations
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

R6 = "e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf"
R7 = "876e119d100936fc821b8618c5aa0e057584b338"
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

def run(args: list[str], cwd: Path, *, data: bytes | None = None) -> bytes:
    p = subprocess.run(args, cwd=cwd, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {args!r}\n{p.stderr.decode(errors='replace')}")
    return p.stdout

def pinned_blob(repo: Path, commit: str, path: str, expected: dict[str, object], side: str) -> bytes:
    oid = run(["git", "rev-parse", f"{commit}:{path}"], repo).decode().strip()
    data = run(["git", "cat-file", "blob", oid], repo)
    got = {"blob": oid, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    want = {k: expected[f"{side}_{k}"] for k in ("blob", "bytes", "sha256")}
    if got != want:
        raise RuntimeError(f"pinned input mismatch for {path}: expected={want!r}, got={got!r}")
    return data

def main() -> int:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[3])
    args = parser.parse_args()
    repo = args.repo.resolve()
    package = Path(__file__).resolve().parents[1]
    old_files: dict[str, bytes] = {}
    new_files: dict[str, bytes] = {}
    for rel, spec in FILES.items():
        old_files[rel] = pinned_blob(repo, R6, str(spec["r6_path"]), spec, "r6")
        new_files[rel] = pinned_blob(repo, R7, str(spec["r7_path"]), spec, "r7")

    with tempfile.TemporaryDirectory(prefix="finish50-patchgen-", dir=package) as temp:
        scratch = Path(temp)
        (scratch / ".gitattributes").write_text("*.glb binary\n*.blend binary\n", encoding="ascii")
        for rel, data in old_files.items():
            target = scratch / Path(rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        run(["git", "init", "--quiet"], scratch)
        run(["git", "config", "core.autocrlf", "false"], scratch)
        run(["git", "config", "core.filemode", "false"], scratch)
        run(["git", "config", "user.name", "FINISH-50 artifact builder"], scratch)
        run(["git", "config", "user.email", "finish50-artifact-builder@invalid.local"], scratch)
        run(["git", "add", "--", ".gitattributes", *FILES.keys()], scratch)
        run(["git", "commit", "--quiet", "-m", "FINISH-50 exact R6 source blobs"], scratch)
        for rel, data in new_files.items():
            (scratch / Path(rel)).write_bytes(data)
        patch = run(["git", "diff", "--binary", "--full-index", "--no-ext-diff", "HEAD", "--", *FILES.keys()], scratch)

    headers = re.findall(rb"^diff --git a/(.*?) b/(.*?)$", patch, flags=re.MULTILINE)
    declared = sorted(rel.encode() for rel in FILES)
    if sorted(a for a, _ in headers) != declared or sorted(b for _, b in headers) != declared:
        raise RuntimeError(f"patch path set mismatch: {headers!r}")
    if patch.count(b"GIT binary patch") != len(FILES):
        raise RuntimeError("expected a Git binary patch block for each changed file")
    destination = package / "source.patch"
    destination.write_bytes(patch)
    result = {
        "status": "PASS",
        "sourcePatch": "source.patch",
        "patchBytes": len(patch),
        "patchSha256": hashlib.sha256(patch).hexdigest(),
        "changedPaths": sorted(FILES),
        "binaryPatchBlocks": patch.count(b"GIT binary patch"),
        "r6RawBlobIds": {rel: spec["r6_blob"] for rel, spec in FILES.items()},
        "r7RawBlobIds": {rel: spec["r7_blob"] for rel, spec in FILES.items()},
        "gitVersion": run(["git", "--version"], repo).decode().strip(),
    }
    print(json.dumps(result, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())