"""Capture one actual RC4 command, exit status and canonical LF log bytes."""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")
parser = argparse.ArgumentParser()
parser.add_argument("--id", required=True)
parser.add_argument("--log", required=True)
parser.add_argument("--cwd", default="app")
parser.add_argument("command", nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ["--"] else args.command
root = pathlib.Path(__file__).resolve().parents[4]
delivery = root / "deliveries/G6/rc4-candidate"
log = delivery / "evidence" / args.log
log.parent.mkdir(parents=True, exist_ok=True)
env = os.environ.copy()
env["NEXT_TELEMETRY_DISABLED"] = "1"
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
source_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root / args.cwd, text=True).strip()
t0 = time.monotonic()
with log.open("w", encoding="utf-8", newline="\n") as output:
    output.write(f"COMMAND: {subprocess.list2cmdline(command)}\nCWD: {args.cwd}\nSTARTED: {started}\n")
    result = subprocess.Popen(command, cwd=root / args.cwd, env=env, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
    for line in result.stdout:
        output.write(line)
        output.flush()
        print(line, end="", flush=True)
    result.wait()
    output.write(f"\nEXIT CODE: {result.returncode}\n")
record = {"id": args.id, "command": command, "cwd": args.cwd, "startedAt": started,
          "sourceCommit": source_commit, "fixtureMode": env.get("YOR_E2E_FIXTURE") == "1",
          "durationSeconds": round(time.monotonic() - t0, 3), "exitCode": result.returncode,
          "evidencePath": log.relative_to(root).as_posix(),
          "evidenceSha256": hashlib.sha256(log.read_bytes()).hexdigest()}
history = delivery / "evidence" / "execution.jsonl"
with history.open("a", encoding="utf-8", newline="\n") as output:
    output.write(json.dumps(record) + "\n")
print(json.dumps(record))
sys.exit(result.returncode)
