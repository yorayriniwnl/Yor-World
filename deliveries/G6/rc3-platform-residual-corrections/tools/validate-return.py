"""Validate local evidence, markdown targets, checksums and committed source binding."""
import argparse, hashlib, json, pathlib, re, subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--write",action="store_true")
parser.add_argument("--staged",action="store_true")
args = parser.parse_args()
repo = pathlib.Path(r"C:\Users\yoray\Projects\Yor World")
root = repo/"deliveries/G6/rc3-platform-residual-corrections"
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def git(*argv): return subprocess.check_output(["git",*argv],cwd=repo).decode().strip()
if args.write:
    identity = json.loads((root/"implementation-identity.json").read_text(encoding="utf-8-sig"))
    (root/"evidence/implementation.patch").write_bytes(subprocess.check_output(
        ["git","diff","--binary",identity["baseHead"],identity["implementationCommit"],"--","app"],cwd=repo))
json_count = links = checksum_entries = 0
json_encodings = {}
for path in sorted(root.rglob("*.json")):
    encoding = "utf-16" if path.read_bytes().startswith((b"\xff\xfe",b"\xfe\xff")) else "utf-8-sig"
    json.loads(path.read_text(encoding=encoding))
    json_encodings[path.relative_to(root).as_posix()] = encoding
    json_count += 1
for path in sorted(root.rglob("*.md")):
    for target in re.findall(r"\[[^\]\n]+\]\(([^)\n]+)\)",path.read_text(encoding="utf-8-sig")):
        target = target.strip().strip("<>")
        if re.match(r"^(?:https?://|app://|#)",target): continue
        target = target.split("#")[0]
        if not target: continue
        local = pathlib.Path(target) if pathlib.Path(target).is_absolute() else path.parent/target
        if args.write and local.resolve() == (root/"evidence/return-validation.json").resolve():
            # The receipt is written after its checks; verify it on the read-only pass.
            links += 1
            continue
        assert local.exists(), (str(path.relative_to(root)),target)
        links += 1
for inventory in sorted(root.rglob("SHA256SUMS.txt")):
    if inventory.parent == root: continue
    for line in inventory.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip(): continue
        expected,name = line.split(maxsplit=1)
        path = inventory.parent/name.lstrip("*")
        assert path.is_file() and digest(path) == expected.lower(), (str(inventory),name)
        checksum_entries += 1
identity = json.loads((root/"implementation-identity.json").read_text(encoding="utf-8-sig"))
assert git("rev-parse","HEAD:app") == identity["applicationTreeAfter"]
assert set(git("diff","--name-only",identity["baseHead"],identity["implementationCommit"]).splitlines()) == set(identity["changedFiles"])
assert not git("diff","--name-only","--","app")
for entry in identity["workingSourceBinding"]["changedFiles"]:
    assert git("rev-parse",identity["implementationCommit"]+":"+entry["path"]) == entry["canonicalGitBlob"]
    assert digest(repo/entry["path"]) == entry["workingSha256"]
for entry in identity["inputs"]:
    assert git("rev-parse",identity["baseHead"]+":"+entry["path"]) == git("rev-parse","HEAD:"+entry["path"])
    assert digest(repo/entry["path"]) == entry["workingSha256"]
findings = json.loads((root/"review/delta/findings.json").read_text(encoding="utf-8-sig"))
assert digest(root/"schema-amendment.md") == findings["documentReview"]["sha256"]
for entry in json.loads((root/"review/delta/source-identity.json").read_text(encoding="utf-8-sig"))["files"]:
    assert git("rev-parse",identity["implementationCommit"]+":"+entry["path"]) == entry["gitBlob"]
    assert digest(repo/entry["path"]) == entry["sha256"]
receipt = {"status":"PASS","parsedJsonFiles":json_count,"validLocalMarkdownLinks":links,
    "jsonEncodings":json_encodings,
    "validatedWorkerChecksumEntries":checksum_entries,"implementationCommit":identity["implementationCommit"],
    "appTree":identity["applicationTreeAfter"],"sourceAndInputsMatch":True,
    "reviewedProductionBlobsMatch":True,"schemaDocMatchesIndependentReview":True,
    "method":"Read actual files and Git blobs; SHA256SUMS excludes only itself"}
if args.write:
    (root/"evidence/return-validation.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
    files = sorted(path for path in root.rglob("*") if path.is_file() and path != root/"SHA256SUMS.txt")
    (root/"SHA256SUMS.txt").write_text("".join(digest(path)+"  "+path.relative_to(root).as_posix()+"\n" for path in files),encoding="utf-8")
else:
    files = sorted(path for path in root.rglob("*") if path.is_file() and path != root/"SHA256SUMS.txt")
names = []
for line in (root/"SHA256SUMS.txt").read_text(encoding="utf-8-sig").splitlines():
    expected,name = line.split(maxsplit=1)
    assert digest(root/name) == expected.lower(), name
    names.append(name)
assert names == [path.relative_to(root).as_posix() for path in files]
if args.staged:
    assert set(git("diff","--cached","--name-only").splitlines()) == {path.relative_to(repo).as_posix() for path in files+[root/"SHA256SUMS.txt"]}
    for path in files+[root/"SHA256SUMS.txt"]:
        blob = subprocess.check_output(["git","show",":"+path.relative_to(repo).as_posix()],cwd=repo)
        assert blob == path.read_bytes(), str(path)
receipt["rootChecksumEntries"] = len(files)
receipt["stagedBytesMatch"] = bool(args.staged)
print(json.dumps(receipt))
