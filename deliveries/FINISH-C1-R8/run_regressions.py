#!/usr/bin/env python3
"""Capture the deterministic FINISH-C1-R8 disposable regression run."""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import subprocess
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
command=[sys.executable,"-B",str(ROOT/"test_verifier_regressions.py")]
started=dt.datetime.now(dt.timezone.utc).isoformat()
process=subprocess.run(command,cwd=ROOT.parents[1],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
evidence=ROOT/"evidence"
(evidence/"regression-run.stdout.log").write_bytes(process.stdout)
(evidence/"regression-run.stderr.log").write_bytes(process.stderr)
record={"command":command,"cwd":str(ROOT.parents[1]),"startedUtc":started,"exit":process.returncode,"stdoutPath":"evidence/regression-run.stdout.log","stdoutSha256":hashlib.sha256(process.stdout).hexdigest(),"stdoutBytes":len(process.stdout),"stderrPath":"evidence/regression-run.stderr.log","stderrSha256":hashlib.sha256(process.stderr).hexdigest(),"stderrBytes":len(process.stderr)}
(evidence/"regression-command.json").write_text(json.dumps(record,indent=2,sort_keys=True)+"\n",encoding="utf-8",newline="\n")
print(json.dumps({"exit":process.returncode,"stdoutBytes":len(process.stdout),"stderrBytes":len(process.stderr),"evidence":"evidence/regression-command.json"},sort_keys=True))
raise SystemExit(process.returncode)
