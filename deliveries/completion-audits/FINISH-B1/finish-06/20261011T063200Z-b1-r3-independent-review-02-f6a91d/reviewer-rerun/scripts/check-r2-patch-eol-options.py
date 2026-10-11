#!/usr/bin/env python3
"""Find whether standard Git whitespace options apply the R3 patch to raw R2 files."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[4]
R2 = REPO / "deliveries" / "FINISH-B1-R2"
CANDIDATE = "1753b9278c4537b5377c3893172b2a0f26d13b10"
SCRATCH = ROOT / ".work" / "r2-patch-eol-options"
NAMES = ["build-environment.py", "build-resident-fixture.py"]


def candidate_bytes(path):
    return subprocess.run(["git", "-C", str(REPO), "show", f"{CANDIDATE}:deliveries/FINISH-B1-R3/{path}"], check=True, stdout=subprocess.PIPE).stdout


if SCRATCH.exists():
    raise SystemExit(f"scratch already exists; refusing overwrite: {SCRATCH}")
SCRATCH.mkdir(parents=True)
(SCRATCH / "source.patch").write_bytes(candidate_bytes("source.patch"))
for name in NAMES:
    dst = SCRATCH / "source" / "blender" / "scripts" / name
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes((R2 / "source" / "blender" / "scripts" / name).read_bytes())
commands = [
    ["git", "apply", "--check", "source.patch"],
    ["git", "apply", "--check", "--ignore-space-change", "source.patch"],
    ["git", "apply", "--check", "--ignore-whitespace", "source.patch"],
    ["git", "-c", "core.whitespace=cr-at-eol", "apply", "--check", "source.patch"],
]
results = []
for command in commands:
    run = subprocess.run(command, cwd=SCRATCH, text=True, capture_output=True)
    results.append({"command": " ".join(command), "exit": run.returncode, "stderr": run.stderr})
summary = {
    "rawR2ResidentSourceHasCRLF": b"\r\n" in (R2 / "source" / "blender" / "scripts" / "build-resident-fixture.py").read_bytes(),
    "checks": results,
    "scope": "All operations were check-only against reviewer-owned scratch copied from raw, hash-bound R2 builder sources.",
}
out = ROOT / "reviewer-rerun" / "validator-logs" / "r2-patch-eol-options.json"
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
