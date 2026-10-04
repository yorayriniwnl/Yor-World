"""Validate evidence consistency, inventories and source immutability; write root inventory."""
import hashlib, json, pathlib, re, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
repo = root.parents[2]
scratch = pathlib.Path("C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186")
head = "2a1864a0648146462b45ba25e0bbc797cf37f3cd"
tree = "3586e0c8674faac3f73bcab4d17f646e3b2e9191"
def git(*args, cwd=repo):
    return subprocess.check_output(["git", *args], cwd=cwd).decode().strip()
def sha(body):
    return hashlib.sha256(body).hexdigest()

for path in ["report.md", "defects.json", "commands-and-exit-codes.md", "verification-identity.json"]:
    assert (root / path).is_file(), path
identity = json.loads((root / "verification-identity.json").read_text(encoding="utf-8"))
assert identity["auditedHead"] == head and identity["auditedAppTree"] == tree
assert git("rev-parse", "HEAD:app") == tree
assert not git("diff", "--name-only", head, "--", "app", "START_HERE.md", "README.md", "docs")
assert git("rev-parse", "HEAD", cwd=scratch) == head
assert not git("status", "--short", cwd=scratch)

parsed = 0
for path in root.rglob("*.json"):
    json.loads(path.read_text(encoding="utf-8-sig"))
    parsed += 1

missing_links = []
for path in root.rglob("*.md"):
    for target in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8-sig")):
        if target.startswith(("https://", "http://", "#")):
            continue
        target = target.strip("<>").split("#", 1)[0]
        target = re.sub(r":\d+$", "", target)
        if target == "SHA256SUMS.txt" and path.parent == root:
            continue
        if not (path.parent / target).is_file():
            missing_links.append({"file": str(path.relative_to(root)), "target": target})
assert not missing_links, missing_links

worker_hashes = 0
for inventory in (root / "reviewers").glob("*/SHA256SUMS.txt"):
    for line in inventory.read_text(encoding="utf-8-sig").splitlines():
        if not line:
            continue
        digest, name = line.split("  ", 1)
        assert sha((inventory.parent / name).read_bytes()) == digest.lower(), (inventory, name)
        worker_hashes += 1

app = scratch / "app"
chunks = [{"path": path.relative_to(app).as_posix(), "bytes": path.stat().st_size,
           "sha256": sha(path.read_bytes())} for path in sorted((app / ".next/static").rglob("*.js"))]
build = {"buildId": (app / ".next/BUILD_ID").read_text().strip(), "auditedAppTree": tree,
         "clientJsChunks": chunks, "chunkCount": len(chunks),
         "inspection": "Reviewer media/boundary-results.json scanned these fresh build artifacts"}
(root / "evidence/build-artifact-inventory.json").write_text(json.dumps(build, indent=2) + "\n", encoding="utf-8")
validation = {"requiredFilesPresent": True, "jsonParsed": parsed, "missingMarkdownLinks": missing_links,
    "reviewerChecksumEntriesVerified": worker_hashes, "primaryAppTree": tree, "primaryProtectedDelta": [],
    "scratchSourceDelta": [], "scratchHead": head, "reviewerConsistencyReview": "reviewers/contract-crosscheck/root-return-review.json",
    "validationKind": "Artifact consistency/provenance, not product acceptance", "clientJsChunksInventoried": len(chunks)}
(root / "evidence/return-validation.json").write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
files = sorted(path for path in root.rglob("*") if path.is_file() and path != root / "SHA256SUMS.txt")
inventory = "".join(f"{sha(path.read_bytes())}  {path.relative_to(root).as_posix()}\n" for path in files)
(root / "SHA256SUMS.txt").write_text(inventory, encoding="utf-8")
for line in inventory.splitlines():
    digest, name = line.split("  ", 1)
    assert sha((root / name).read_bytes()) == digest
print(json.dumps({**validation, "rootChecksumEntriesVerified": len(files), "rootBytes": sum(path.stat().st_size for path in files)}))
