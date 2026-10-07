"""Local residual maker evidence only; no source acceptance or production claims."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[2]
evidence = Path(__file__).resolve().parent
owned = [
    "scripts/release/rc6-policy.json", "scripts/release/release-lib.mjs",
    "scripts/release/build-release-bundle.mjs", "scripts/release/validate-release.mjs",
    "scripts/release/tests/immutable-output.test.mjs", "scripts/release/tests/policy-output.test.mjs",
    "deliveries/G7/preparation/tools/candidate-driver.py",
]
commands = [
    ("guard-tests-final", ["node", "--test", *owned[4:6]]),
    *[("syntax-" + Path(name).stem, ["node", "--check", name]) for name in owned[1:6]],
    ("python-syntax", [sys.executable, "-B", "-c", "import ast; from pathlib import Path; ast.parse(Path('deliveries/G7/preparation/tools/candidate-driver.py').read_text()); print('PASS Python syntax')"]),
]
results = []
for name, command in commands:
    started = time.monotonic()
    result = subprocess.run(command, cwd=root, capture_output=True)
    log = evidence / f"{name}.log"
    log.write_bytes(result.stdout + result.stderr)
    record = {"command": command, "cwd": str(root), "exitCode": result.returncode,
              "durationSeconds": round(time.monotonic() - started, 3), "log": str(log.relative_to(root)),
              "status": "PASS" if result.returncode == 0 else "FAIL"}
    results.append(record)
    print(json.dumps(record), flush=True)
receipt = {"executionClass": "Maker residual regressions in isolated temporary fixtures; not independent audit or acceptance",
           "baseCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
           "versions": {program: subprocess.check_output([program, "--version"], cwd=root, text=True).strip() for program in ["node", "python", "git"]},
           "ownedFileSha256": {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in owned},
           "checks": results, "overallStatus": "PASS" if all(item["exitCode"] == 0 for item in results) else "FAIL",
           "fullFreshR6Proof": "NOT RUN; Parent owns fresh source freeze/all-thirteen/primary/hosted proof",
           "g7ServicesAndDevices": "NOT RUN"}
(evidence / "checks.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
diff = subprocess.run(["git", "diff", "--", *owned], cwd=root, capture_output=True, check=True)
(evidence / "owned-source.diff").write_bytes(diff.stdout)
sys.exit(0 if receipt["overallStatus"] == "PASS" else 1)
