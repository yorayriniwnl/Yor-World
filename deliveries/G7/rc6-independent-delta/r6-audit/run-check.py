"""Preserve every own audit command/exit/raw output attempt under the owned root."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--archive-json")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command and args.command[0] == "--" else args.command
    if not command or not args.name.replace("-", "").isalnum():
        raise SystemExit("An exact command and safe name are required")
    receipt_file = HERE / "execution.jsonl"
    history = [json.loads(line) for line in receipt_file.read_text(encoding="utf-8").splitlines()] if receipt_file.exists() else []
    attempt = sum(item["name"] == args.name for item in history) + 1
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = subprocess.run(command, cwd=ROOT, capture_output=True)
    completed = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw = b"STDOUT\n" + result.stdout + b"\nSTDERR\n" + result.stderr
    log = HERE / "logs" / f"{args.name}-attempt-{attempt:02d}.log"
    log.parent.mkdir(exist_ok=True)
    log.write_bytes(raw)
    record = {"name": args.name, "attempt": attempt, "sourceCommit": args.source, "command": command,
              "cwd": str(ROOT), "startedAt": started, "completedAt": completed, "exitCode": result.returncode,
              "rawLogPath": log.relative_to(ROOT).as_posix(), "rawLogSha256": hashlib.sha256(raw).hexdigest()}
    if args.archive_json:
        input_path = HERE / args.archive_json
        if input_path.is_file():
            archived = HERE / f"{args.name}-attempt-{attempt:02d}.json"
            archived.write_bytes(input_path.read_bytes())
            record["archivedReceipt"] = archived.relative_to(ROOT).as_posix()
            record["archivedReceiptSha256"] = hashlib.sha256(archived.read_bytes()).hexdigest()
    with receipt_file.open("a", encoding="utf-8", newline="\n") as output:
        output.write(json.dumps(record) + "\n")
    print(json.dumps(record, indent=2))
    raise SystemExit(result.returncode)
