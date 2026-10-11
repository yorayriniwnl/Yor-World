from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = Path(r"C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-B1\finish-06\20261011T063200Z-b1-r3-independent-review-02-f6a91d")
if ROOT != EXPECTED:
    raise SystemExit(f"Unexpected audit root: {ROOT}")
verification = json.loads((ROOT / "candidate-package-verification.json").read_text(encoding="utf-8"))
manifest = {row["path"]: row["actual"]["sha256"] for row in verification["files"]}
copy_root = ROOT / "inherited-evidence/candidate"
checks = []
for path in sorted(p for p in copy_root.rglob("*") if p.is_file()):
    rel = path.relative_to(copy_root).as_posix()
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    checks.append({"path": rel, "sha256": digest,
                   "candidatePackageMatch": rel in manifest and manifest[rel] == digest})
extra = [row["path"] for row in checks if row["path"] not in manifest]
failed = [row["path"] for row in checks if not row["candidatePackageMatch"]]
result = {
    "scope": "Verify copied maker-evidence subset remains byte-identical to the exact candidate package; subset is labeled inherited unless a separate reviewer rerun exists.",
    "candidateCommit": verification["candidateCommit"],
    "candidatePackageFiles": len(manifest), "copiedMakerEvidenceFiles": len(checks),
    "matched": len(checks) - len(failed), "failed": len(failed), "unexpected": extra,
    "checks": checks
}
out = ROOT / "reviewer-rerun/validator-logs/inherited-copy-verification.json"
out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"copied": len(checks), "matched": result["matched"], "failed": len(failed), "unexpected": len(extra)}, indent=2))
if failed or extra:
    raise SystemExit(1)
