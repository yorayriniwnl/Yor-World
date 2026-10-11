from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
CANDIDATE_COMMIT = "e2670d4152c461005da86b392dbcea12cec740bf"
RECEIPT_FILES = (
    "source-binding.json",
    "candidate-input-provenance.json",
    "predecessor-output-git-blobs.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    source_receipt = ROOT / "candidate-input-provenance.json"
    before_hash = sha256(source_receipt)
    scratch_parent = REPO_ROOT / ".finish-c1-r8-cli"
    created_parent = not scratch_parent.exists()
    scratch_parent.mkdir(exist_ok=True)
    parent_resolved = scratch_parent.resolve(strict=True)
    if parent_resolved.parent != REPO_ROOT.resolve(strict=True):
        raise SystemExit("negative CLI scratch escaped the repository root")

    try:
        with tempfile.TemporaryDirectory(dir=scratch_parent) as directory:
            case_root = Path(directory).resolve(strict=True)
            case_root.relative_to(parent_resolved)
            (case_root / "source").mkdir()
            for name in RECEIPT_FILES:
                shutil.copyfile(ROOT / name, case_root / name)
            script = case_root / "source" / "verify-input-provenance.py"
            shutil.copyfile(ROOT / "source" / "verify-input-provenance.py", script)

            receipt_path = case_root / "candidate-input-provenance.json"
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            receipt["sourceManifest"]["sha256"] = "0" * 64
            receipt_path.write_text(
                json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n"
            )
            command = [
                sys.executable,
                "-B",
                str(script),
                "--json",
                "--check-output-manifest",
                "--commit",
                CANDIDATE_COMMIT,
            ]
            process = subprocess.run(
                command, cwd=REPO_ROOT, capture_output=True, text=True, check=False
            )
            try:
                result = json.loads(process.stdout)
            except json.JSONDecodeError as error:
                raise SystemExit(f"negative verifier stdout was not JSON: {error}\n{process.stdout}\n{process.stderr}")
            passed = (
                process.returncode == 1
                and result.get("status") == "FAIL"
                and bool(result.get("errors"))
                and "sourceManifest sha256" in result["errors"][0]
                and process.stderr == ""
            )
            record = {
                "schemaVersion": 1,
                "status": "PASS" if passed else "FAIL",
                "case": "uncached CLI rejects zeroed sourceManifest.sha256",
                "candidateCommit": CANDIDATE_COMMIT,
                "mutation": {
                    "receipt": "candidate-input-provenance.json",
                    "field": "sourceManifest.sha256",
                    "value": "0" * 64,
                    "disposableCopyOnly": True,
                },
                "command": command,
                "exitCode": process.returncode,
                "stdout": process.stdout,
                "stderr": process.stderr,
                "parsedResult": result,
                "cache": "new Python process; verifier Git reads are uncached",
                "scratchPath": str(case_root),
                "scratchContainedIn": str(parent_resolved),
                "originalReceiptSha256BeforeAndAfter": {
                    "before": before_hash,
                    "after": sha256(source_receipt),
                },
            }
            out = ROOT / "evidence" / "cli-negative-false-pass.json"
            out.write_text(
                json.dumps(record, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
                newline="\n",
            )
            if not passed:
                print(json.dumps(record, indent=2))
                return 1
            print("PASS: uncached verifier CLI rejected the zeroed manifest SHA-256 (exit 1)")
            return 0
    finally:
        if created_parent and not any(scratch_parent.iterdir()):
            scratch_parent.rmdir()


if __name__ == "__main__":
    raise SystemExit(main())
