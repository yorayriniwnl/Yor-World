"""Capture a fresh verifier execution; fail before running if audited source differs."""
import argparse, datetime, hashlib, json, os, pathlib, subprocess, sys, time

AUDITED_HEAD = "2a1864a0648146462b45ba25e0bbc797cf37f3cd"
APP_TREE = "3586e0c8674faac3f73bcab4d17f646e3b2e9191"
parser = argparse.ArgumentParser()
parser.add_argument("--cwd", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("command", nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command
if command and command[0] == "--":
    command = command[1:]
if not command:
    parser.error("missing command")
cwd = pathlib.Path(args.cwd).resolve()
repository = cwd.parent
output = pathlib.Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)

def identity():
    def git(*argv):
        return subprocess.check_output(["git", *argv], cwd=repository).decode().strip()
    value = {
        "head": git("rev-parse", "HEAD"),
        "appTree": git("rev-parse", "HEAD:app"),
        "sourceDelta": git("diff", "--name-only", AUDITED_HEAD, "--", "app").splitlines(),
        "indexListingSha256": hashlib.sha256(subprocess.check_output(
            ["git", "ls-files", "--stage", "--", "app"], cwd=repository)).hexdigest(),
    }
    if value["head"] != AUDITED_HEAD or value["appTree"] != APP_TREE or value["sourceDelta"]:
        raise RuntimeError(f"Audited source mismatch: {value}")
    return value

before = identity()
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
tick = time.monotonic()
environment = dict(os.environ)
environment["CI"] = "true"
process = subprocess.run(command, cwd=cwd, env=environment,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
log = output.with_suffix(".log")
log.write_bytes(process.stdout)
receipt = {
    "command": command, "cwd": str(cwd), "startedAtUtc": started,
    "endedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "seconds": round(time.monotonic() - tick, 3), "exitCode": process.returncode,
    "log": log.name, "logSha256": hashlib.sha256(process.stdout).hexdigest(),
    "logEncoding": "raw subprocess bytes; commands emit UTF-8",
    "identityBefore": before, "identityAfter": identity(),
    "environmentOverrides": {"CI": "true"},
}
output.with_suffix(".json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt), flush=True)
sys.exit(process.returncode)
