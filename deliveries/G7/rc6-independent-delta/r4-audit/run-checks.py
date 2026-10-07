"""Bounded independent checks; logs and receipts stay in this new audit directory."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = "30240b672ae31537d8090b11b60f8bf808a27670"


def run(name, command):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = subprocess.run(command, cwd=ROOT, capture_output=True)
    raw = result.stdout + b"\n--- STDERR ---\n" + result.stderr
    file = HERE / (name + ".log")
    file.write_bytes(raw)
    receipt = {"id": name, "command": command, "cwd": str(ROOT), "startedAt": started,
               "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "exitCode": result.returncode,
               "log": file.relative_to(ROOT).as_posix(), "logRawSha256": hashlib.sha256(raw).hexdigest(),
               "executionClass": "Own targeted read-only check or isolated fixture execution; no full-suite/live/physical claim",
               "status": "PASS" if result.returncode == 0 else "FAIL"}
    print(json.dumps(receipt), flush=True)
    return receipt


if __name__ == "__main__":
    tasks = [("source-review", [sys.executable, "-B", str(HERE / "source-review.py")]),
             ("release-guard-tests", ["node", "--test", "scripts/release/tests/immutable-output.test.mjs", "scripts/release/tests/policy-output.test.mjs"]),
             ("loading-visibility-probe", ["node", str(HERE / "loading-visibility-probe.cjs"), SOURCE]),
             ("immutable-path-probe", ["node", str(HERE / "immutable-path-probe.mjs"), SOURCE])]
    results = [run(name, command) for name, command in tasks]
    (HERE / "executed-checks.json").write_text(json.dumps({"auditedSource": SOURCE, "checks": results,
        "overallStatus": "PASS" if all(item["exitCode"] == 0 for item in results) else "FAIL"}, indent=2) + "\n",
        encoding="utf-8", newline="\n")
    if any(item["exitCode"] for item in results):
        raise SystemExit(1)
