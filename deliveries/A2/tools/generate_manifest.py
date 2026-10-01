from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
zip_path = root / "a2-verified-portfolio.zip"
sha_path = root / "a2-verified-portfolio.zip.sha256"
manifest_path = root / "manifest.json"

# First remove old zip and manifest if present so they aren't included in file scan
if manifest_path.exists():
    manifest_path.unlink()

files_info = []
for p in sorted(root.rglob("*")):
    if not p.is_file() or p == zip_path or p == sha_path or ".git" in p.parts:
        continue
    rel = p.relative_to(root).as_posix()
    size = p.stat().st_size
    sha256 = hashlib.sha256(p.read_bytes()).hexdigest()
    files_info.append({
        "path": rel,
        "sizeBytes": size,
        "sha256": sha256
    })

manifest = {
    "delivery": "yor-world-a2-verified-portfolio",
    "milestone": "A2",
    "worker": "Verified Content & Project Routes Maker",
    "mandate": "PARENT-RECON-03 / A2-OWNERSHIP",
    "baselineRevision": "e763e4256a70f8bc0358bde16995079780cf850c",
    "totalFiles": len(files_info) + 1,  # including manifest.json itself
    "files": files_info,
}

manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()

# Add manifest.json to files list in memory
manifest["files"].append({
    "path": "manifest.json",
    "sizeBytes": manifest_path.stat().st_size,
    "sha256": manifest_hash
})
manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

# Package archive
print(f"Packaging {zip_path}...")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for p in sorted(root.rglob("*")):
        if p == zip_path or p == sha_path or ".git" in p.parts or not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        zf.write(p, rel)

final_sha = hashlib.sha256(zip_path.read_bytes()).hexdigest()
sha_path.write_text(f"{final_sha} *a2-verified-portfolio.zip\n", encoding="utf-8")
print(f"Archive packaged: {zip_path.stat().st_size} bytes, SHA-256: {final_sha}")
