"""Run a local verification command and retain argv, output, times and exit code."""
import datetime
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
label, *argv = sys.argv[1:]
if argv and argv[0] == "--":
    argv.pop(0)
if not label.replace("-", "").replace("_", "").isalnum() or not argv:
    raise SystemExit("usage: python capture-command.py LABEL -- EXECUTABLE ARGS...")
evidence = root / "evidence" / "r2"
evidence.mkdir(parents=True, exist_ok=True)
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
result = subprocess.run(argv, cwd=root, capture_output=True, creationflags=flags)
output = result.stdout.decode("utf-8", "replace") + result.stderr.decode("utf-8", "replace")
(evidence / (label + ".log")).write_text(output, encoding="utf-8")
record = {"argv": argv, "cwd": str(root), "startedAtUtc": started,
          "endedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "exitCode": result.returncode, "log": "evidence/r2/" + label + ".log"}
(evidence / (label + ".command.json")).write_text(json.dumps(record, indent=2), encoding="utf-8")
print(json.dumps(record))
print(output[-4500:])
sys.exit(result.returncode)
