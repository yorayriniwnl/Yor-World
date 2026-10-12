import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()


def git_bytes(*args, input_data=None):
    return subprocess.run(
        ["git", "-C", str(REPO), *map(str, args)],
        input=input_data,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout


def git_text(*args):
    return git_bytes(*args).decode("utf-8").strip()


def file_record(data, label):
    if ("bytes" in label and len(data) != label["bytes"]) or sha(data) != label["sha256"]:
        raise AssertionError(f"input bytes/hash mismatch: {label.get('path', label)}")


def exact_git_blob(commit, path):
    records = git_bytes("ls-tree", "-z", "--full-tree", commit, "--", path).split(b"\0")
    matches = [record for record in records if record]
    if len(matches) != 1:
        raise AssertionError(f"expected one Git tree entry for {commit}:{path}, found {len(matches)}")
    metadata, listed_path = matches[0].split(b"\t", 1)
    mode, kind, blob = metadata.decode("ascii").split()
    if kind != "blob" or listed_path.decode("utf-8") != path:
        raise AssertionError(f"unexpected Git tree entry for {commit}:{path}")
    return blob


def verify_git_file(commit, path, expected_sha256, expected_bytes=None, expected_blob=None):
    blob = exact_git_blob(commit, path)
    if expected_blob and blob != expected_blob:
        raise AssertionError(f"Git blob mismatch for {commit}:{path}")
    data = git_bytes("cat-file", "blob", blob)
    if expected_bytes is not None and len(data) != expected_bytes:
        raise AssertionError(f"Git object byte count mismatch for {commit}:{path}")
    if sha(data) != expected_sha256:
        raise AssertionError(f"Git object SHA-256 mismatch for {commit}:{path}")
    return blob, data


manifest = json.loads((ROOT / "evidence/package-manifest.json").read_text(encoding="utf-8"))
rows = manifest["files"]
assert len(rows) == manifest["fileCount"]
assert sum(row["bytes"] for row in rows) == manifest["totalBytes"]
canonical = json.dumps(rows, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
assert sha(canonical) == manifest["manifestRowsSha256"]
for row in rows:
    file_record((ROOT / row["path"]).read_bytes(), row)

bindings = json.loads((ROOT / "evidence/input-bindings.json").read_text(encoding="utf-8"))
base = bindings["baseCandidate"]
base_root = f"deliveries/{base['candidate']}"
git_manifest_path = ROOT / base["gitManifest"]
git_manifest = json.loads(git_manifest_path.read_text(encoding="utf-8"))
base_rows = git_manifest["files"]
base_digest = sha(json.dumps(base_rows, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode())
assert git_manifest["candidate"] == base["candidate"]
assert git_manifest["commit"] == base["commit"]
assert git_manifest["tree"] == base["tree"]
assert git_manifest["packageSubtree"] == base["deliverySubtree"]
assert git_manifest["fileCount"] == base["packageFileCount"] == len(base_rows)
assert git_manifest["totalBytes"] == base["packageBytes"] == sum(row["bytes"] for row in base_rows)
assert base_digest == base["manifestRowsSha256"] == git_manifest["manifestRowsSha256"]
assert git_text("rev-parse", f"{base['commit']}^{{tree}}") == base["tree"]
assert git_text("rev-parse", f"{base['commit']}:{base_root}") == base["deliverySubtree"]
assert git_text("rev-parse", f"{base['commit']}:app") == bindings["acceptedCanonicalAppTree"]

# Authenticate the archived raw manifest against the actual pinned commit tree,
# then verify every Git object still matches its recorded byte count and SHA-256.
tree_records = git_bytes("ls-tree", "-r", "-z", "--full-tree", base["commit"], "--", base_root).split(b"\0")
tree_blobs = {}
for record in tree_records:
    if not record:
        continue
    metadata, full_path = record.split(b"\t", 1)
    mode, kind, blob = metadata.decode("ascii").split()
    if kind != "blob":
        raise AssertionError(f"unexpected non-blob in base package tree: {full_path!r}")
    relative_path = full_path.decode("utf-8")[len(base_root) + 1 :]
    tree_blobs[relative_path] = blob
assert set(tree_blobs) == {row["path"] for row in base_rows}, "pinned Git tree file set differs from archived manifest"
blob_ids = list(dict.fromkeys(row["gitBlob"] for row in base_rows))
batch = git_bytes("cat-file", "--batch", input_data=("\n".join(blob_ids) + "\n").encode("ascii"))
blob_contents = {}
cursor = 0
for blob in blob_ids:
    end = batch.index(b"\n", cursor)
    oid, kind, size = batch[cursor:end].decode("ascii").split()
    cursor = end + 1
    size = int(size)
    content = batch[cursor : cursor + size]
    if len(content) != size or batch[cursor + size : cursor + size + 1] != b"\n":
        raise AssertionError(f"malformed Git cat-file response for {blob}")
    if oid != blob or kind != "blob":
        raise AssertionError(f"Git object mismatch for {blob}")
    blob_contents[blob] = content
    cursor += size + 1
for row in base_rows:
    data = blob_contents[row["gitBlob"]]
    if len(data) != row["bytes"] or sha(data) != row["sha256"]:
        raise AssertionError(f"base manifest bytes/hash disagree with Git object: {row['path']}")

# Verify each copied R4/R3/checkpoint input against its row in that authenticated manifest.
base_by_path = {row["path"]: row for row in base_rows}
def raw_path_for_package_copy(relative_path):
    if relative_path.startswith("inputs/r4/"):
        return relative_path[len("inputs/r4/") :]
    if relative_path.startswith("inputs/r3/"):
        return relative_path
    if relative_path.startswith("checkpoints/material-only/"):
        return relative_path
    return None


copied_input_count = 0
for prefix in ("inputs/r4", "inputs/r3", "checkpoints/material-only"):
    for path in (ROOT / prefix).rglob("*"):
        if not path.is_file() or path.suffix == ".pyc" or "__pycache__" in path.parts:
            continue
        relative_path = path.relative_to(ROOT).as_posix()
        if relative_path == base["gitManifest"]:
            continue
        raw_path = raw_path_for_package_copy(relative_path)
        if raw_path is None:
            continue
        row = base_by_path.get(raw_path)
        if row is None:
            raise AssertionError(f"copied input is absent from pinned Git manifest: {relative_path}")
        file_record(path.read_bytes(), {**row, "path": relative_path})
        copied_input_count += 1

for item in bindings["runnerAndAssetInputs"]:
    file_record((ROOT / item["path"]).read_bytes(), item)
    raw_path = raw_path_for_package_copy(item["path"])
    row = base_by_path.get(raw_path)
    if row is None or row["bytes"] != item["bytes"] or row["sha256"] != item["sha256"]:
        raise AssertionError(f"runner/asset input is not bound to pinned R4 bytes: {item['path']}")
    if tree_blobs[raw_path] != row["gitBlob"]:
        raise AssertionError(f"runner/asset input Git blob differs from base tree: {item['path']}")

source_revision = bindings["visualAndContractSourceCommit"]
assert git_text("rev-parse", f"{source_revision['commit']}^{{tree}}") == source_revision["tree"]
for item in bindings["visualAndContractInputs"]:
    if item["sourceCommit"] != source_revision["commit"]:
        raise AssertionError(f"source commit binding mismatch: {item['path']}")
    archive = item["archivePath"]
    file_record((ROOT / archive).read_bytes(), {**item, "path": archive})
    verify_git_file(source_revision["commit"], item["path"], item["sha256"], item["bytes"])

packet = bindings["packetArchive"]
file_record((ROOT / packet["path"]).read_bytes(), packet)
review = bindings["pinnedR4FullRoomVisualFinding"]
file_record((ROOT / review["path"]).read_bytes(), review)
verify_git_file(review["sourceCommit"], review["sourcePath"], review["sha256"])

outputs = json.loads((ROOT / "output-hashes.json").read_text(encoding="utf-8"))
assert outputs["packageManifestSha256"] == manifest["manifestRowsSha256"]
assert outputs["packageFileCount"] == manifest["fileCount"]
for row in outputs["allAssetOutputs"]:
    file_record((ROOT / row["file"]).read_bytes(), row)
for row in outputs["candidateCaptures"]:
    file_record((ROOT / row["file"]).read_bytes(), row)

browser = json.loads((ROOT / "evidence/browser-results.json").read_text(encoding="utf-8"))
assert browser["candidateVariantMapping"]["candidate"] == "FINISH-B1-R5"
for key, limit in (("desktop-home", 120), ("mobile-home", 80)):
    result = next(item for item in browser["measurements"] if item.get("variant") == "R5" and item.get("key") == key)
    assert result["rendererInfo"]["calls"] <= limit
    assert result["rendererInfo"]["calls"] == result["interceptedCalls"]
    assert result["frameDelta"] == 1
assert json.loads((ROOT / "evidence/gltf-validation.json").read_text(encoding="utf-8"))["errors"] == 0
commands = json.loads((ROOT / "evidence/commands-and-exit-codes.json").read_text(encoding="utf-8"))
assert commands["status"] == "PASS" and all(item["exitCode"] == 0 for item in commands["records"])

print(json.dumps({
    "status": "PASS",
    "packageFiles": len(rows),
    "manifestRowsSha256": manifest["manifestRowsSha256"],
    "pinnedR4FilesAuthenticated": len(base_rows),
    "copiedBaseInputsAuthenticated": copied_input_count,
    "assetFiles": len(outputs["allAssetOutputs"]),
    "captureFiles": len(outputs["candidateCaptures"]),
}))
