"""
YOR WORLD - W1-F1-r2 Packaging and Manifest Generation Script
Script: package-revision.py
Author: W1 Room/Blockout Maker (Gemini-1)
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
    zip_path = rev_dir / "w1-f1-r2-proof.zip"
    manifest_path = rev_dir / "manifest.json"

    # Files to include in zip
    files_to_pack = []
    for root, dirs, files in os.walk(rev_dir):
        # Exclude zip itself and manifest.json if they already exist
        for f in sorted(files):
            if f.endswith(".zip") or f == "manifest.json":
                continue
            full_p = Path(root) / f
            rel_p = full_p.relative_to(rev_dir)
            files_to_pack.append((full_p, rel_p))

    print(f"Creating ZIP archive {zip_path} with {len(files_to_pack)} members...")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for full_p, rel_p in files_to_pack:
            zf.write(full_p, arcname=str(rel_p).replace("\\", "/"))

    print(f"Created {zip_path} ({zip_path.stat().st_size} bytes)")

    # Build manifest for all files in rev_dir
    manifest_members = []
    for root, dirs, files in os.walk(rev_dir):
        for f in sorted(files):
            if f == "manifest.json":
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

    manifest = {
        "revision": "W1-F1-r2",
        "generatedAt": "2026-10-01T02:40:00Z",
        "packageFile": "w1-f1-r2-proof.zip",
        "packageSizeBytes": zip_path.stat().st_size,
        "packageSha256": get_sha256(zip_path),
        "totalFiles": len(manifest_members),
        "files": manifest_members
    }

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote manifest with {len(manifest_members)} members to {manifest_path}")

if __name__ == "__main__":
    main()
