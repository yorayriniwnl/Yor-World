"""Capture maker checks and read-only preservation evidence for PRE-G7-06."""
import ast
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
output = Path(__file__).resolve().parent
preserved = ["deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2"]
owned = [
    "scripts/release/rc6-policy.json", "scripts/release/release-lib.mjs",
    "scripts/release/build-release-bundle.mjs", "scripts/release/validate-release.mjs",
    "scripts/release/tests/immutable-output.test.mjs", "scripts/release/tests/policy-output.test.mjs",
    "deliveries/G7/preparation/tools/candidate-driver.py",
]
def snapshot():
    return {path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
            for name in preserved for path in (root / name).rglob("*") if path.is_file()}
before = snapshot()
command = ["node", "--test", "scripts/release/tests/immutable-output.test.mjs", "scripts/release/tests/policy-output.test.mjs"]
result = subprocess.run(command, cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace")
(output / "regression-tests.log").write_text(result.stdout + result.stderr, encoding="utf-8")
after = snapshot()
ast.parse((root / owned[-1]).read_text(encoding="utf-8"))
diff = subprocess.run(["git", "diff", "--check", "--", *owned], cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace")
(output / "diff-check.log").write_text(diff.stdout + diff.stderr, encoding="utf-8")
report = {
    "packet": "PRE-G7-06", "role": "maker", "baseCommit": "80c9ae9173bee27b18a066dd84fb6ab3c9919581",
    "acceptanceClaim": False,
    "checks": [
        {"name": "immutable and policy-output regressions", "status": "PASS" if result.returncode == 0 else "FAIL", "command": command, "exitCode": result.returncode, "evidence": "regression-tests.log"},
        {"name": "original RC6 and rejected R2 proof preservation", "status": "PASS" if before == after else "FAIL", "fileCount": len(before)},
        {"name": "candidate driver Python syntax", "status": "PASS", "method": "ast.parse; no bytecode outputs"},
        {"name": "scoped git diff --check", "status": "PASS" if diff.returncode == 0 else "FAIL", "exitCode": diff.returncode, "evidence": "diff-check.log"},
        {"name": "fresh exact-source all-13 R3 proof and strict primary validation", "status": "NOT RUN", "reason": "Parent owns source freeze and complete fresh proof after scoped integration commit."},
        {"name": "independent audit and acceptance", "status": "NOT RUN", "reason": "Separate reviewer and Parent authority; maker does not accept itself."},
    ],
    "ownedFileSha256": {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in owned},
    "preservedProofBefore": before, "preservedProofAfter": after,
    "limits": "No application, contract, asset, CI or preserved proof edits. No provider or account action. Parent owns scoped commits/pushes under the packet.",
}
(output / "maker-evidence.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"checks": report["checks"], "preservedFiles": len(before)}, indent=2))
raise SystemExit(0 if result.returncode == 0 and diff.returncode == 0 and before == after else 1)
