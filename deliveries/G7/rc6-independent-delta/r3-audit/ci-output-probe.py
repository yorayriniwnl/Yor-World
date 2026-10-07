"""Read-only reproduction of the frozen source CI strict-receipt output incompatibility."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = "71737a61c52d1bb887e5cdfc65201666daee5a1d"
workflow = subprocess.check_output(["git", "show", SOURCE + ":.github/workflows/ci.yml"], cwd=ROOT)
guard = subprocess.check_output(["git", "show", SOURCE + ":scripts/release/release-lib.mjs"], cwd=ROOT)
assert guard == (ROOT / "scripts/release/release-lib.mjs").read_bytes().replace(b"\r\n", b"\n")
command = ["node", "scripts/release/validate-release.mjs", "--strict", "--receipt", ".rc6-ci/release-manifest-validation.receipt.json"]
assert " ".join(command).encode() in workflow
output = ROOT / command[-1]
before = output.read_bytes() if output.is_file() else None
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
result = subprocess.run(command, cwd=ROOT, capture_output=True)
after = output.read_bytes() if output.is_file() else None
raw = result.stdout + b"\n--- STDERR ---\n" + result.stderr
(HERE / "ci-output-probe.log").write_bytes(raw)
confirmed = result.returncode == 1 and b"Release output must stay inside the policy deliveryRoot" in result.stderr and before == after
receipt = {"createdAt": started, "sourceCommit": SOURCE, "command": command, "cwd": str(ROOT),
           "exitCode": result.returncode, "stdout": result.stdout.decode(), "stderr": result.stderr.decode(),
           "workflowGitBlobSha256": hashlib.sha256(workflow).hexdigest(), "guardGitBlobSha256": hashlib.sha256(guard).hexdigest(),
           "outputUnchanged": before == after, "existingReceiptBefore": before is not None,
           "confirmedDefect": "Mandatory hosted CI validation uses a receipt path forbidden by the final source output guard",
           "defectSeverity": "P2; blocks required hosted release gate", "reproductionStatus": "PASS" if confirmed else "FAIL",
           "productionOrAcceptedWrites": False}
(HERE / "ci-output-probe.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps(receipt, indent=2))
if not confirmed:
    raise SystemExit(1)
