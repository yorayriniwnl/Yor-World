"""
YOR WORLD - W1-F1-r3 Packaging and Manifest Generation Script
Script: package-revision.py
Author: W1 Room/Blockout Maker (Gemini Pro)
"""

import os
import zipfile
import hashlib
import json
from pathlib import Path

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    rev_dir = Path(__file__).resolve().parent.parent
    zip_path = rev_dir / "w1-f1-r3-proof.zip"
    manifest_path = rev_dir / "manifest.json"

    # Remove any existing zip or manifest before building
    if zip_path.exists():
        zip_path.unlink()
    if manifest_path.exists():
        manifest_path.unlink()

    # Files to include in zip
    files_to_pack = []
    for root, dirs, files in os.walk(rev_dir):
        if "__pycache__" in root:
            continue
        for f in sorted(files):
            if f.endswith(".zip") or f.endswith(".blend1") or f == "manifest.json":
                continue
            full_p = Path(root) / f
            rel_p = full_p.relative_to(rev_dir)
            files_to_pack.append((full_p, rel_p))

    files_to_pack.sort(key=lambda x: str(x[1]).replace("\\", "/"))

    print(f"Creating ZIP archive {zip_path.name} with {len(files_to_pack)} members...")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for full_p, rel_p in files_to_pack:
            zf.write(full_p, arcname=str(rel_p).replace("\\", "/"))

    print(f"Created {zip_path.name} ({zip_path.stat().st_size} bytes, SHA-256: {get_sha256(zip_path)})")

    # Build manifest for all files in rev_dir except manifest.json itself
    manifest_members = []
    for root, dirs, files in os.walk(rev_dir):
        if "__pycache__" in root:
            continue
        for f in sorted(files):
            if f == "manifest.json" or f.endswith(".blend1"):
                continue
            full_p = Path(root) / f
            rel_p = full_p.relative_to(rev_dir).as_posix()
            size = full_p.stat().st_size
            sha = get_sha256(full_p)
            manifest_members.append({
                "path": rel_p,
                "sizeBytes": size,
                "sha256": sha
            })

    manifest_members.sort(key=lambda x: x["path"])

    manifest = {
        "revision": "W1-F1-r3",
        "workOrder": "W1-CORR-02",
        "parentAuditAddressed": "docs/planning/reviews/2026-10-01-correction-delta-audit/report.md",
        "generatedAt": "2026-10-01T10:10:00Z",
        "packageFile": "w1-f1-r3-proof.zip",
        "packageSizeBytes": zip_path.stat().st_size,
        "packageSha256": get_sha256(zip_path),
        "totalFiles": len(manifest_members),
        "files": manifest_members
    }

    manifest_content = json.dumps(manifest, indent=2) + "\n"
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(manifest_content)

    print(f"Wrote manifest with {len(manifest_members)} members to {manifest_path.name}")

if __name__ == "__main__":
    main()
