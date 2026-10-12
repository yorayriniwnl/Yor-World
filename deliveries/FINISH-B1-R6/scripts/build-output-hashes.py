"""Create a deterministic SHA-256 manifest for the complete R6 delivery."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
EXCLUDED = {"output-hashes.json", "evidence/package-verification.json"}
rows = []
for path in sorted((p for p in OUT.rglob("*") if p.is_file()), key=lambda p: p.relative_to(OUT).as_posix()):
    rel = path.relative_to(OUT).as_posix()
    if rel in EXCLUDED:
        continue
    raw = path.read_bytes()
    rows.append({"path": rel, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})

receipt = {
    "schemaVersion": 1,
    "candidate": "FINISH-B1-R6",
    "baseCommit": "a5ebcc88170703751a5f504f67aed637d2f7d8e9",
    "selfExcluded": sorted(EXCLUDED),
    "files": rows,
    "totalBytes": sum(row["bytes"] for row in rows),
}
(OUT / "output-hashes.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": "PASS", "files": len(rows), "bytes": receipt["totalBytes"]}, indent=2))
