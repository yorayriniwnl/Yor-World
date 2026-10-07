"""Execute bounded independent checks and archive only within the assigned audit root."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = "71737a61c52d1bb887e5cdfc65201666daee5a1d"


def run(name, command):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = subprocess.run(command, cwd=ROOT, capture_output=True)
    raw = result.stdout + b"\n--- STDERR ---\n" + result.stderr
    file = HERE / (name + ".log")
    file.write_bytes(raw)
    item = {"id": name, "command": command, "cwd": str(ROOT), "startedAt": started,
            "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "exitCode": result.returncode, "log": file.relative_to(ROOT).as_posix(),
            "rawLogSha256": hashlib.sha256(raw).hexdigest(),
            "executionClass": "Own targeted execution; no full-suite or live/physical claim",
            "status": "PASS" if result.returncode == 0 else "FAIL"}
    print(json.dumps(item), flush=True)
    return item


if __name__ == "__main__":
    checks = [
        ("audit-bindings", [sys.executable, "-B", str(HERE / "audit-bindings.py"), SOURCE,
                            "deliveries/G7/rc6-candidate-r3"]),
        ("loading-visibility-probe", ["node", str(HERE / "loading-visibility-probe.cjs"), SOURCE]),
        ("immutable-path-probe", ["node", str(HERE / "immutable-path-probe.mjs"), SOURCE]),
        ("release-guard-tests", ["node", "--test", "scripts/release/tests/immutable-output.test.mjs",
                                 "scripts/release/tests/policy-output.test.mjs"]),
        ("ledger-tests", [sys.executable, "-B", "deliveries/G7/preparation/tools/test_g7_evidence.py"]),
    ]
    receipts = [run(name, command) for name, command in checks]
    (HERE / "executed-checks.json").write_text(json.dumps({"source": SOURCE, "checks": receipts,
        "overallStatus": "PASS" if all(item["exitCode"] == 0 for item in receipts) else "FAIL"}, indent=2) + "\n",
        encoding="utf-8", newline="\n")
    if any(item["exitCode"] for item in receipts):
        raise SystemExit(1)
