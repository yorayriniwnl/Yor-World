#!/usr/bin/env python3
"""
Package production-environment.zip and generate SHA-256 checksum for Milestone B2/B3-P2.
"""

import os
import hashlib
import zipfile
from pathlib import Path

DELIVERY_DIR = Path(__file__).parent.parent.resolve()
ZIP_NAME = "production-environment.zip"
ZIP_PATH = DELIVERY_DIR / ZIP_NAME
SHA_PATH = DELIVERY_DIR / f"{ZIP_NAME}.sha256"

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    if SHA_PATH.exists():
        SHA_PATH.unlink()

    files_to_zip = []
    for root, dirs, files in os.walk(DELIVERY_DIR):
        dirs.sort()
        for f in sorted(files):
            if f in [ZIP_NAME, f"{ZIP_NAME}.sha256"] or f.endswith(".blend1"):
                continue
            full_path = Path(root) / f
            rel_path = full_path.relative_to(DELIVERY_DIR).as_posix()
            files_to_zip.append((full_path, rel_path))

    print(f"Packaging {len(files_to_zip)} files into {ZIP_NAME}...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for full_path, rel_path in files_to_zip:
            zf.write(full_path, rel_path)

    zip_size = ZIP_PATH.stat().st_size
    zip_sha = sha256_file(ZIP_PATH)

    with open(SHA_PATH, "w", encoding="utf-8") as f:
        f.write(f"{zip_sha}  {ZIP_NAME}\n")

    print(f"Archive packaged successfully!")
    print(f"Size: {zip_size:,} bytes")
    print(f"SHA-256: {zip_sha}")

if __name__ == "__main__":
    main()
