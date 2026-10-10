"""Bind received candidates and read-only applicability observations; no app tests."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"


def digest(path: Path) -> dict:
    data = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def command(args: list[str]) -> dict:
    result = subprocess.run(args, cwd=ROOT, capture_output=True)
    return {"command": args, "exitCode": result.returncode,
            "stdout": result.stdout.decode("utf-8", errors="replace"),
            "stderr": result.stderr.decode("utf-8", errors="replace")}


def write(name: str, value: object) -> None:
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8", newline="\n")


paths = {"docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json",
         "docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json"}
checks = []
for rel in ["deliveries/FINISH-A1/r2", "deliveries/FINISH-B1-R2", "deliveries/FINISH-C1-R2"]:
    folder = ROOT / rel
    for filename in ["input-hashes.json", "output-hashes.json", "report.md", "source.patch"]:
        if (folder / filename).is_file():
            paths.add(f"{rel}/{filename}")
    manifest = json.loads((folder / "output-hashes.json").read_text(encoding="utf-8-sig"))
    failures = []
    if "outputs" in manifest:
        rows = {item["path"]: item for item in manifest["outputs"]}
    else:
        rows = manifest
    for relative, expected in rows.items():
        source = folder / relative
        if not source.is_file():
            failures.append(f"Missing declared output: {relative}")
            continue
        paths.add(source.relative_to(ROOT).as_posix())
        actual = digest(source)
        wanted = expected if isinstance(expected, str) else expected["sha256"]
        if actual["sha256"] != wanted or (isinstance(expected, dict) and "bytes" in expected and actual["bytes"] != expected["bytes"]):
            failures.append(f"Raw declared identity mismatch: {relative}")
    checks.append({"deliveryRoot": rel, "declaredOutputCount": len(rows), "failures": failures,
                   "scope": "Declared raw output identities only; unlisted files are not implied to be bound"})

paths.update([
    "deliveries/completion-audits/FINISH-A1/r2/report.md",
    "deliveries/completion-audits/FINISH-B1/2026-10-10-r2/report.md",
    "deliveries/completion-audits/FINISH-C1/2026-10-10-r2/report.md",
    "deliveries/FINISH-B1-R2/scripts/test-browser-playback.mjs",
    "deliveries/FINISH-B1-R2/scripts/generate-manifest-and-metadata.py",
    "deliveries/FINISH-B1-R2/scripts/build-resident-fixture.py",
    "deliveries/FINISH-B1-R2/validator-logs/browser-playback-evidence.json",
    "deliveries/FINISH-B1-R2/validator-logs/dimensions-anchors-check.json",
    "deliveries/FINISH-B1-R2/captures/index.json",
])
observations = [command(["git", "rev-parse", "HEAD"]),
                command(["git", "rev-parse", "HEAD:app"]),
                command(["git", "diff", BASE, "--", "app"])]
for rel in ["deliveries/FINISH-A1/r2/source.patch", "deliveries/FINISH-C1-R2/source.patch"]:
    observations.append(command(["git", "apply", "--check", rel]))
if observations[1]["stdout"].strip() != APP_TREE or observations[2]["stdout"]:
    raise ValueError("Canonical source differs from bound maker base")
for rel in ["deliveries/FINISH-A1/r3", "deliveries/FINISH-B1-R3", "deliveries/FINISH-C1-R3"]:
    if (ROOT / rel).exists():
        raise ValueError(f"New correction root collision: {rel}")
write("input-hashes.json", {"packet": "FINISH-04", "hashPolicy": "SHA-256 of raw received bytes",
      "inspectionScope": "Identity inventory and named Parent readiness observations; not a full source or behavioral audit",
      "inputs": [digest(ROOT / path) for path in sorted(paths)]})
write("candidate-identity-checks.json", {"packet": "FINISH-04", "declaredIdentityChecks": checks,
      "readOnlyCommandReceipts": observations, "applicationTestsRun": 0,
      "newDeliveryRoots": "Absent at packet preparation; fresh roots allocated by Parent",
      "scope": "No implementation acceptance, application/browser/provider/device tests or maker edits"})
failures = [message for check in checks for message in check["failures"]]
print(json.dumps({"rawInputBindings": len(paths), "candidateDeclaredOutputs": sum(x["declaredOutputCount"] for x in checks),
                  "identityFailures": failures, "expectedPatchCheckExitCodes": [x["exitCode"] for x in observations[-2:]],
                  "canonicalAppUnchanged": True}, indent=2))
raise SystemExit(1 if failures else 0)
