import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
AUDITS = {
    "A1": ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0",
    "C1": ROOT / "deliveries/completion-audits/FINISH-C1/finish-16/20261011T233109Z-c1-r9-parent-local-technical-recheck-06-85bd61e0",
}

results = {}
for label, root in AUDITS.items():
    manifest = json.loads((root / "output-hashes.json").read_text(encoding="utf-8"))
    actual_rows = []
    for current, directories, names in os.walk(root, topdown=True, followlinks=False):
        directories[:] = [name for name in directories if name != ".work"]
        for name in names:
            path = Path(current) / name
            if path.name == "output-hashes.json" or not path.is_file():
                continue
            raw = path.read_bytes()
            actual_rows.append({"path": path.relative_to(root).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
    actual_rows.sort(key=lambda row: row["path"])
    declared = manifest["files"]
    hash_ok = declared == actual_rows
    matrix = json.loads((root / "requirement-matrix.json").read_text(encoding="utf-8"))
    missing_refs = []
    for row in matrix["results"]:
        for reference in row.get("evidencePaths", []):
            if not (root / reference).is_file():
                missing_refs.append({"id": row["id"], "path": reference})
    results[label] = {
        "manifestFiles": manifest["fileCount"],
        "actualStableFiles": len(actual_rows),
        "manifestTotalBytes": manifest["totalBytes"],
        "actualTotalBytes": sum(row["bytes"] for row in actual_rows),
        "hashManifestExact": hash_ok,
        "missingMatrixEvidenceReferences": missing_refs,
        "matrixReferencesResolve": not missing_refs,
    }

print(json.dumps(results, indent=2))
if not all(row["hashManifestExact"] and row["matrixReferencesResolve"] for row in results.values()):
    raise SystemExit(1)
