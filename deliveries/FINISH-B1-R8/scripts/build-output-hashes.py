#!/usr/bin/env python3
"""Build the R8 package manifest using exact package file bytes."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
MANIFEST = PACKAGE / "output-hashes.json"
EXCLUDED = ["output-hashes.json"]
BASE_COMMIT = "876e119d100936fc821b8618c5aa0e057584b338"
BASE_TREE = "c88be58f85cd46914b271b86d2f5ecda90cc1cce"


def main() -> int:
    rows = []
    for path in sorted(p for p in PACKAGE.rglob("*") if p.is_file() and p != MANIFEST):
        rel = path.relative_to(PACKAGE).as_posix()
        data = path.read_bytes()
        rows.append({"path": rel, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    payload = {
        "schemaVersion": 1,
        "candidate": "FINISH-B1-R8",
        "baseCommit": BASE_COMMIT,
        "baseTree": BASE_TREE,
        "selfExcluded": EXCLUDED,
        "files": rows,
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": "PASS", "files": len(rows), "bytes": sum(r["bytes"] for r in rows), "manifest": "output-hashes.json"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
