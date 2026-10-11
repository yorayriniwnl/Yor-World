"""Verify the authorized FINISH-25-R1 lineage and preservation boundaries."""

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
BASE_COMMIT = "1753b9278c4537b5377c3893172b2a0f26d13b10"
BASE_TREE = "9759ac9879bcc9489770b7c5784ead2f022157b0"
BASE_DELIVERY = "deliveries/FINISH-B1-R3"
CHECKPOINT = ROOT / "checkpoints" / "material-only"


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git(*args: str, cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, check=False)


def verify_checkpoint() -> dict:
    manifest_path = CHECKPOINT / "checkpoint-hashes.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows = manifest.get("files")
    if not isinstance(rows, list) or len(rows) != 72:
        raise RuntimeError("material-only checkpoint manifest must bind exactly 72 files")
    failures = []
    total = 0
    for row in rows:
        path = CHECKPOINT / row["path"]
        raw = path.read_bytes()
        total += len(raw)
        if len(raw) != row["bytes"] or sha(raw) != row["sha256"]:
            failures.append(row["path"])
    if failures:
        raise RuntimeError(f"material-only checkpoint mismatch: {failures}")
    return {
        "status": "PASS",
        "fileCount": len(rows),
        "totalBytes": total,
        "manifestSha256": sha(manifest_path.read_bytes()),
        "preservedByteForByte": True,
    }


def verify_input_blobs() -> dict:
    if git("rev-parse", "--verify", f"{BASE_COMMIT}^{{tree}}").stdout.decode().strip() != BASE_TREE:
        raise RuntimeError("FINISH-B1-R3 commit tree pin mismatch")
    inputs = json.loads((ROOT / "evidence" / "input-hashes.json").read_text(encoding="utf-8"))
    if len(inputs) != 26:
        raise RuntimeError("R4 input manifest must bind the 8 production outputs and 18 authoring/review inputs")
    rows = []
    r3_prefix = "deliveries/FINISH-B1-R3/"
    production_prefix = r3_prefix + "assets/"
    for row in inputs:
        expected_commit = row["commit"]
        git_result = git("show", f"{expected_commit}:{row['path']}")
        if git_result.returncode != 0:
            raise RuntimeError(f"cannot read pinned R3 blob: {row['path']}")
        raw_git = git_result.stdout
        if len(raw_git) != row["bytes"] or sha(raw_git) != row["sha256"]:
            raise RuntimeError(f"input receipt differs from raw pinned Git blob: {row['path']}")
        local_copy = None
        if row["path"].startswith(production_prefix):
            local_path = ROOT / "inputs" / "r3" / row["path"].replace(r3_prefix, "")
            local_copy = local_path.read_bytes()
            if local_copy != raw_git:
                raise RuntimeError(f"R3 production input copy differs from raw pinned Git blob: {row['path']}")
        rows.append({"path": row["path"], "commit": expected_commit, "blobBytes": len(raw_git), "sha256": sha(raw_git), "localR3CopyVerified": local_copy is not None, "status": "PASS"})
    return {"status": "PASS", "baseCommit": BASE_COMMIT, "baseTree": BASE_TREE, "inputCount": len(rows), "inputs": rows}


def replay_source_patch() -> dict:
    patch = ROOT / "source.patch"
    r3_relative = Path(BASE_DELIVERY) / "source" / "blender" / "scripts" / "build-environment.py"
    source_input = ROOT / "inputs" / "r3" / "source" / "blender" / "scripts" / "build-environment.py"
    original = source_input.read_bytes()
    pinned = git("show", f"{BASE_COMMIT}:{r3_relative.as_posix()}")
    if pinned.returncode != 0 or pinned.stdout != original:
        raise RuntimeError("R3 builder copy does not match pinned Git blob")
    scratch_root = ROOT / ".work"
    scratch_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="r1-source-replay-", dir=scratch_root) as directory:
        replay = Path(directory).resolve(strict=True)
        replay.relative_to(scratch_root.resolve(strict=True))
        target = replay / r3_relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(original)
        check = git("apply", "--check", str(patch), cwd=replay)
        if check.returncode != 0:
            raise RuntimeError(f"source patch check failed: {check.stderr.decode(errors='replace')}")
        apply = git("apply", str(patch), cwd=replay)
        if apply.returncode != 0:
            raise RuntimeError(f"source patch apply failed: {apply.stderr.decode(errors='replace')}")
        replayed = target.read_bytes()
        candidate = (ROOT / "source" / "blender" / "scripts" / "build-environment.py").read_bytes()
        if replayed != candidate:
            raise RuntimeError("replayed source patch does not match the packaged R4 builder bytes")
    return {
        "status": "PASS",
        "baseCommit": BASE_COMMIT,
        "baseTree": BASE_TREE,
        "basePath": r3_relative.as_posix(),
        "baseSha256": sha(original),
        "baseBytes": len(original),
        "patchSha256": sha(patch.read_bytes()),
        "candidateSha256": sha(candidate),
        "candidateBytes": len(candidate),
        "patchCheckExit": check.returncode,
        "patchApplyExit": apply.returncode,
        "exactCandidateBytes": True,
    }


def verify_production_assets() -> dict:
    expected = (
        "room.glb",
        "resident.glb",
        "fixture.glb",
        "group-b-props.glb",
        "on-demand-projects.glb",
        "textures/deskmat-topography.png",
        "textures/monitor-wallpaper.png",
        "source/room.blend",
    )
    rows = []
    for relative in expected:
        candidate_path = ROOT / "assets" / relative
        candidate = candidate_path.read_bytes()
        base_path = f"{BASE_DELIVERY}/assets/{relative}"
        base = git("show", f"{BASE_COMMIT}:{base_path}")
        if base.returncode != 0:
            raise RuntimeError(f"pinned R3 output missing: {base_path}")
        unchanged = candidate == base.stdout
        should_change = relative in ("room.glb", "source/room.blend")
        if unchanged == should_change:
            raise RuntimeError(f"unexpected R1 production asset identity for {relative}")
        rows.append({
            "path": f"assets/{relative}",
            "baseCommit": BASE_COMMIT,
            "baseBytes": len(base.stdout),
            "baseSha256": sha(base.stdout),
            "candidateBytes": len(candidate),
            "candidateSha256": sha(candidate),
            "byteIdentical": unchanged,
            "expectedChange": should_change,
            "status": "PASS",
        })
    return {"status": "PASS", "productionUniverse": "five runtime GLBs, two textures and native room source", "files": rows}


def main() -> int:
    result = {
        "schemaVersion": 1,
        "checkpoint": verify_checkpoint(),
        "inputs": verify_input_blobs(),
        "sourcePatchReplay": replay_source_patch(),
        "productionAssets": verify_production_assets(),
    }
    output = ROOT / "evidence" / "lineage-r1.json"
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": "PASS",
        "checkpointFiles": result["checkpoint"]["fileCount"],
        "inputBlobs": result["inputs"]["inputCount"],
        "patchReplay": result["sourcePatchReplay"]["status"],
        "productionOutputs": len(result["productionAssets"]["files"]),
        "evidence": str(output),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
