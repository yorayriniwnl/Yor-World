"""Capture bounded maker checks and a before/after working-source fingerprint."""
import argparse, datetime, hashlib, json, os, pathlib, subprocess, sys, time

parser = argparse.ArgumentParser()
parser.add_argument("--cwd", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--allow-source-change", action="store_true")
parser.add_argument("command", nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command
if command and command[0] == "--": command = command[1:]
if not command: parser.error("missing command")
cwd = pathlib.Path(args.cwd).resolve()
repo = cwd.parent
output = pathlib.Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
def source_snapshot():
    paths = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", "app"], cwd=repo).decode().splitlines()
    items = []
    for path in sorted(set(paths)):
        file = repo / path
        items.append({"path": path, "sha256": hashlib.sha256(file.read_bytes()).hexdigest() if file.exists() else "MISSING"})
    return hashlib.sha256(json.dumps(items, separators=(",", ":")).encode()).hexdigest()
before = source_snapshot()
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
tick = time.monotonic()
env = dict(os.environ, CI="true", NEXT_TELEMETRY_DISABLED="1")
proc = subprocess.run(command, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
output.with_suffix(".log").write_bytes(proc.stdout)
after = source_snapshot()
receipt = {"command": command, "cwd": str(cwd), "startedAtUtc": started,
    "endedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "seconds": round(time.monotonic()-tick, 3),
    "exitCode": proc.returncode, "workingSourceBefore": before, "workingSourceAfter": after,
    "sourceUnchanged": before == after, "allowedSourceChangeDuringCommand": args.allow_source_change,
    "log": output.with_suffix(".log").name, "logSha256": hashlib.sha256(proc.stdout).hexdigest(),
    "environmentOverrides": {"CI": "true", "NEXT_TELEMETRY_DISABLED": "1"},
    "baseHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo).decode().strip()}
output.with_suffix(".json").write_text(json.dumps(receipt, indent=2)+"\n", encoding="utf-8")
print(json.dumps(receipt), flush=True)
sys.exit(proc.returncode if before == after or args.allow_source_change else 91)
