from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
zip_path = root / "a4-publishing-rollback.zip"
sha_path = root / "a4-publishing-rollback.zip.sha256"
manifest_path = root / "manifest.json"

pub_zip = root / "a4-publishing.zip"
pub_sha = root / "a4-publishing.zip.sha256"

# First remove old zip and manifest if present so they aren't included in file scan
for f in [manifest_path, zip_path, sha_path, pub_zip, pub_sha]:
  if f.exists():
    f.unlink()

excluded_files = {zip_path, sha_path, pub_zip, pub_sha, manifest_path}

files_info = []
for p in sorted(root.rglob("*")):
  if not p.is_file() or p in excluded_files or ".git" in p.parts:
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
  "delivery": "yor-world-a4-publishing-rollback",
  "milestone": "A4",
  "worker": "Gemini #1 — Drafts, Approved Media, Publishing & Rollback Maker",
  "mandate": "A4 DRAFTS, APPROVED MEDIA, PUBLISHING & ROLLBACK",
  "baselineRevision": "ac56097",
  "totalFiles": len(files_info) + 1,
  "files": files_info,
}

manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()

manifest["files"].append({
  "path": "manifest.json",
  "sizeBytes": manifest_path.stat().st_size,
  "sha256": manifest_hash
})
manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

print(f"Packaging {zip_path}...")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
  for p in sorted(root.rglob("*")):
    if p == zip_path or p == sha_path or ".git" in p.parts or not p.is_file():
      continue
    rel = p.relative_to(root).as_posix()
    zf.write(p, rel)

final_sha = hashlib.sha256(zip_path.read_bytes()).hexdigest()
sha_path.write_text(f"{final_sha} *a4-publishing-rollback.zip\n", encoding="utf-8")
print(f"Archive packaged: {zip_path.stat().st_size} bytes, SHA-256: {final_sha}")

# Also produce a4-publishing.zip alias for compatibility
pub_zip = root / "a4-publishing.zip"
pub_sha = root / "a4-publishing.zip.sha256"
import shutil
shutil.copy2(zip_path, pub_zip)
pub_sha.write_text(f"{final_sha} *a4-publishing.zip\n", encoding="utf-8")
print(f"Mirrored alias packaged: {pub_zip.stat().st_size} bytes, SHA-256: {final_sha}")
