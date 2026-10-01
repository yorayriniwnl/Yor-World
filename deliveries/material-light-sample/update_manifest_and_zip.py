#!/usr/bin/env python3
"""
Calculate cryptographic SHA-256 digests, package material-light-sample.zip,
and generate the authoritative manifest.json.
"""

import os
import hashlib
import json
import zipfile

SAMPLE_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_NAME = "material-light-sample.zip"
MANIFEST_NAME = "manifest.json"

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    file_records = []
    
    # 1. Collect all files except zip and manifest
    for root, dirs, files in os.walk(SAMPLE_DIR):
        dirs.sort()
        for f in sorted(files):
            if f in [ZIP_NAME, MANIFEST_NAME]:
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, SAMPLE_DIR).replace("\\", "/")
            size_bytes = os.path.getsize(full_path)
            digest = sha256_file(full_path)
            file_records.append({
                "path": rel_path,
                "sizeBytes": size_bytes,
                "sha256": digest
            })
            
    print(f"Collected {len(file_records)} files.")
    
    # 2. Package into zip archive
    zip_path = os.path.join(SAMPLE_DIR, ZIP_NAME)
    if os.path.exists(zip_path):
        os.remove(zip_path)
        
    print(f"Packaging {ZIP_NAME}...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rec in file_records:
            full_path = os.path.join(SAMPLE_DIR, rec["path"].replace("/", os.sep))
            zf.write(full_path, rec["path"])
            
    zip_size = os.path.getsize(zip_path)
    zip_sha = sha256_file(zip_path)
    print(f"Archive packaged: {zip_size} bytes, SHA-256: {zip_sha}")
    
    # 3. Create manifest structure
    manifest = {
        "delivery": "workstation-material-light-sample",
        "packet": "B3-P1",
        "worker": "Gemini-2 (World/Art Maker)",
        "mandate": "PARENT-RECON-03",
        "generatedAt": "2026-10-01T09:25:00Z",
        "packageFile": ZIP_NAME,
        "packageSizeBytes": zip_size,
        "packageSha256": zip_sha,
        "totalFiles": len(file_records),
        "files": file_records
    }
    
    manifest_path = os.path.join(SAMPLE_DIR, MANIFEST_NAME)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
        
    print(f"Authoritative manifest written to: {manifest_path}")

if __name__ == "__main__":
    main()
