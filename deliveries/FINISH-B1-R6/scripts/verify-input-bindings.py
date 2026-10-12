"""Bind FINISH-44 inputs and report text to committed raw Git objects."""
from __future__ import annotations
import hashlib, json, pathlib, subprocess

OUT = pathlib.Path(__file__).resolve().parents[1]
ROOT = OUT.parent.parent
R5 = "a5ebcc88170703751a5f504f67aed637d2f7d8e9"
COORD = "ddc0175682edbb5f51938e9abe080853b6738ad1"
EXPECTED_TREE = "d3dcb1ab82485749bd8b53f2b7cb9add2e576caa"
EXPECTED_PARENT = "7936fa981a24fe4af834ff250ffec8a7b02b09b3"
EXPECTED_MANIFEST_SHA = "e961589754498b3b8770de38ec6516cd051c838267ed3f2db85248769556370a"

def git(*args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(ROOT), *args])

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

head = git("rev-parse", "HEAD").decode().strip()
tree = git("rev-parse", f"{R5}^{{tree}}").decode().strip()
parent = git("rev-parse", f"{R5}^").decode().strip()
if (head, tree, parent) != (R5, EXPECTED_TREE, EXPECTED_PARENT):
    raise SystemExit(f"Pinned input mismatch: HEAD/tree/parent={(head, tree, parent)}")

manifest_raw = git("cat-file", "blob", f"{R5}:deliveries/FINISH-B1-R5/output-hashes.json")
if sha(manifest_raw) != EXPECTED_MANIFEST_SHA:
    raise SystemExit("R5 output manifest raw Git hash mismatch")
manifest = json.loads(manifest_raw)
if len(manifest["files"]) != 127:
    raise SystemExit(f"Expected 127 manifest outputs; got {len(manifest['files'])}")

rows, mismatches, total = [], [], 0
for row in manifest["files"]:
    path = row["path"]
    raw = git("cat-file", "blob", f"{R5}:deliveries/FINISH-B1-R5/{path}")
    copy_path = OUT / "inputs" / "r5" / "FINISH-B1-R5" / pathlib.PurePosixPath(path)
    copied_before = copy_path.read_bytes()
    rebound = copied_before != raw
    if rebound:
        copy_path.parent.mkdir(parents=True, exist_ok=True)
        copy_path.write_bytes(raw)
    copied = copy_path.read_bytes()
    observed = {"bytes": len(raw), "sha256": sha(raw)}
    matches = observed == {"bytes": row["bytes"], "sha256": row["sha256"]} and copied == raw
    if not matches:
        mismatches.append(path)
    total += len(raw)
    rows.append({"path": path, **observed, "copyReboundFromRawGit": rebound,
                 "copiedByteIdentical": copied == raw, "status": "PASS" if matches else "FAIL"})
if total != 18_529_345 or mismatches:
    raise SystemExit(f"R5 source binding failed: total={total}, mismatches={mismatches[:5]}")

excluded_rows = []
for path in manifest["selfExcluded"]:
    raw = git("cat-file", "blob", f"{R5}:deliveries/FINISH-B1-R5/{path}")
    target = OUT / "inputs" / "r5" / "FINISH-B1-R5" / pathlib.PurePosixPath(path)
    before = target.read_bytes()
    rebound = before != raw
    if rebound:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
    excluded_rows.append({"path": path, "bytes": len(raw), "sha256": sha(raw),
                          "copyReboundFromRawGit": rebound, "copiedByteIdentical": target.read_bytes() == raw})

docs = {
    "2026-10-12-finish-44-b1-full-reference-detail-correction.md": "inputs/FINISH-44.md",
    "2026-10-12-finish-43-b1-r5-independent-audit.md": "inputs/FINISH-43-independent-audit.md",
    "2026-10-12-finish-43-local-recheck-output-reallocation.md": "inputs/FINISH-43-local-recheck.md",
}
doc_rows = []
for source, rel in docs.items():
    source_path = f"docs/planning/reconciliation-packets/{source}"
    raw = git("cat-file", "blob", f"{COORD}:{source_path}")
    blob = git("rev-parse", f"{COORD}:{source_path}").decode().strip()
    target = OUT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.read_bytes() != raw:
        raise SystemExit(f"Refusing to overwrite divergent bound input: {rel}")
    target.write_bytes(raw)
    doc_rows.append({"source": source_path, "coordinationCommit": COORD, "blob": blob,
                     "path": rel, "bytes": len(raw), "sha256": sha(raw), "status": "PASS"})

receipt = {
    "status": "PASS", "command": "python deliveries/FINISH-B1-R6/scripts/verify-input-bindings.py",
    "candidate": "FINISH-B1-R6", "baseCommit": R5, "baseTree": tree, "baseParent": parent,
    "r5OutputManifest": {"path": "deliveries/FINISH-B1-R5/output-hashes.json",
                         "sha256": sha(manifest_raw), "listedFiles": len(rows), "listedBytes": total},
    "rawGitFileBindings": rows, "selfExcludedRawGitBindings": excluded_rows, "coordinationInputs": doc_rows,
    "limitations": "This confirms byte lineage for the pinned candidate; it does not accept R5 or R6."
}
(OUT / "evidence" / "input-bindings.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": "PASS", "r5Files": len(rows), "r5Bytes": total,
                  "coordinationInputs": len(doc_rows), "manifestSHA256": sha(manifest_raw)}, indent=2))
