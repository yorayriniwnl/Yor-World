"""Rerun and capture the bounded G7 evidence-output audit checks."""

from pathlib import Path
import json
import subprocess
import sys


ROOT = Path.cwd()
AUDIT = ROOT / "deliveries/G7/local-corrections/independent-audit/attempt-20261012-g7-output-isolation"
SOURCES = [
    "deliveries/G7/preparation/tools/g7-evidence.py",
    "deliveries/G7/preparation/tools/test_g7_evidence.py",
]


def run(name, command):
    result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output = result.stdout.decode("utf-8", errors="replace").replace("\r\n", "\n").replace("\r", "\n")
    (AUDIT / f"{name}.log").write_text(output, encoding="utf-8", newline="")
    (AUDIT / f"{name}.exit").write_text(f"{result.returncode}\n", encoding="ascii", newline="")
    return {"name": name, "command": command, "exitCode": result.returncode}


syntax_code = (
    "import pathlib; "
    "[compile(pathlib.Path(p).read_text(encoding='utf-8'), p, 'exec') for p in "
    f"{SOURCES!r}]; print('syntax=PASS')"
)
checks = [
    run("g7-evidence-tests", [sys.executable, "-B", SOURCES[1]]),
    run("python-syntax", [sys.executable, "-B", "-c", syntax_code]),
    run("commit-check", [
        "git", "show", "--check", "--oneline", "608f3ade", "--", *SOURCES,
    ]),
]
evidence = {
    "auditHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "auditedCommit": "608f3ade99b0e307e5a3c164cb09caa3b89642eb",
    "python": sys.version,
    "checks": checks,
    "sourceFiles": [
        {"path": path, "sha256": __import__("hashlib").sha256((ROOT / path).read_bytes()).hexdigest()}
        for path in SOURCES
    ],
    "logEncoding": "UTF-8 with LF line endings",
}
(AUDIT / "evidence.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8", newline="")
for check in checks:
    print(f"{check['name']}: exit={check['exitCode']}")
sys.exit(any(check["exitCode"] for check in checks))
