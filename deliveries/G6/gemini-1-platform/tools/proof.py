"""YOR WORLD Gate G6 Release Candidate: Platform / Backend RC Verification Harness

Runs reproducible build and verification checks in an isolated scratch environment outside the repository.
Preserves forensic command evidence, execution logs, exit codes, and test receipts.

Usage:
  python deliveries/G6/gemini-1-platform/tools/proof.py prepare
  python deliveries/G6/gemini-1-platform/tools/proof.py install
  python deliveries/G6/gemini-1-platform/tools/proof.py lint
  python deliveries/G6/gemini-1-platform/tools/proof.py typecheck
  python deliveries/G6/gemini-1-platform/tools/proof.py test:unit
  python deliveries/G6/gemini-1-platform/tools/proof.py test:integration
  python deliveries/G6/gemini-1-platform/tools/proof.py build
  python deliveries/G6/gemini-1-platform/tools/proof.py test:e2e
  python deliveries/G6/gemini-1-platform/tools/proof.py verify:auth
  python deliveries/G6/gemini-1-platform/tools/proof.py verify:contact
  python deliveries/G6/gemini-1-platform/tools/proof.py rehearse:restore
  python deliveries/G6/gemini-1-platform/tools/proof.py audit:config
  python deliveries/G6/gemini-1-platform/tools/proof.py verify:content
  python deliveries/G6/gemini-1-platform/tools/proof.py all
"""

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
repo_root = root
while repo_root.parent != repo_root:
  if (repo_root / ".git").exists() or (repo_root / "START_HERE.md").exists():
    break
  repo_root = repo_root.parent

evidence = Path(os.environ.get("G6_PROOF_EVIDENCE", str(root / "evidence"))).resolve()
evidence.mkdir(parents=True, exist_ok=True)
state_file = evidence / "execution.json"
hidden = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

def now():
  return datetime.now(timezone.utc).isoformat()

def save(state):
  state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")

def sync_rc_tests(app_dir: Path):
  rc_tests_src = root / "tools/tests"
  rc_tests_dest = app_dir / "tests/integration"
  rc_tests_dest.mkdir(parents=True, exist_ok=True)
  if rc_tests_src.exists():
    for f in rc_tests_src.glob("*.test.ts"):
      dest_file = rc_tests_dest / f"rc-{f.name}"
      shutil.copy2(f, dest_file)
  # Remove old tests/rc if present
  old_rc = app_dir / "tests/rc"
  if old_rc.exists():
    shutil.rmtree(old_rc)

if sys.argv[1:] == ["prepare"]:
  scratch = Path(tempfile.mkdtemp(prefix="yor-world-g6-platform-rc-")).resolve()
  if scratch.is_relative_to(repo_root):
    raise SystemExit("Scratch must be outside the workspace.")
  app = scratch / "app"

  # Copy accepted candidate source from deliveries/A6/source
  candidate_source = repo_root / "deliveries/A6/source"
  shutil.copytree(candidate_source, app)

  # Copy G6 RC verification tests into app/tests/integration/rc-*.test.ts
  sync_rc_tests(app)

  (scratch / "empty.npmrc").write_text("", encoding="utf-8")

  pnpm = Path(shutil.which("pnpm.cmd") or shutil.which("pnpm") or "")
  pnpm_js = pnpm.parent / "node_modules/pnpm/bin/pnpm.cjs"
  if not pnpm_js.is_file():
    pnpm_candidates = list(Path(os.environ.get("APPDATA", "")).glob("npm/node_modules/pnpm/bin/pnpm.cjs"))
    if pnpm_candidates:
      pnpm_js = pnpm_candidates[0]
    else:
      raise SystemExit(f"Cannot find installed pnpm CLI: {pnpm_js}")

  git_head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=str(repo_root)).decode().strip()

  state = {
    "createdAt": now(),
    "worker": "Gemini #1 — Platform / Backend Release-Candidate Evidence Maker",
    "gate": "Gate G6 (Release Candidate Verification)",
    "packet": "G6-PLATFORM-RC",
    "candidateCommit": git_head,
    "scratch": str(scratch),
    "app": str(app),
    "node": shutil.which("node"),
    "pnpmJs": str(pnpm_js),
    "commands": [],
  }
  save(state)
  print(json.dumps(state, indent=2))
  raise SystemExit(0)

if not state_file.exists():
  raise SystemExit("State file missing. Run 'python deliveries/G6/gemini-1-platform/tools/proof.py prepare' first.")

state = json.loads(state_file.read_text(encoding="utf-8"))
scratch, app = Path(state["scratch"]), Path(state["app"])

# Ensure rc tests are synced to scratch app
sync_rc_tests(app)

env = {
  k: v
  for k, v in os.environ.items()
  if k.upper() in {
    "PATH", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "TEMP", "TMP",
    "LOCALAPPDATA", "APPDATA", "USERPROFILE", "NUMBER_OF_PROCESSORS",
    "PROCESSOR_ARCHITECTURE", "PROGRAMFILES", "PROGRAMFILES(X86)",
    "COMMONPROGRAMFILES",
  }
}
env.update({
  "NEXT_TELEMETRY_DISABLED": "1",
  "CI": "1",
  "NPM_CONFIG_USERCONFIG": str(scratch / "empty.npmrc"),
  "NPM_CONFIG_GLOBALCONFIG": str(scratch / "empty.npmrc"),
  "PORT": "3196",
  "G6_EVIDENCE_DIR": str(evidence),
  "G1_EVIDENCE_DIR": str(evidence),
})

def run(step_num, label, args):
  command = [state["node"], state["pnpmJs"], *args]
  log = evidence / f"{step_num:02d}-{label}.log"
  rec = {
    "step": step_num,
    "label": label,
    "argv": command,
    "cwd": str(app),
    "startedAt": now(),
    "log": log.relative_to(root).as_posix(),
  }
  with log.open("w", encoding="utf-8") as stream:
    stream.write("COMMAND: " + subprocess.list2cmdline(command) + "\nCWD: " + str(app) + "\n")
    stream.flush()
    process = subprocess.run(
      command,
      cwd=app,
      env=env,
      stdout=stream,
      stderr=subprocess.STDOUT,
      creationflags=hidden,
    )
    rec.update({"exitCode": process.returncode, "endedAt": now()})
    stream.write(f"\nEXIT: {process.returncode}\n")
  state["commands"].append(rec)
  save(state)
  print(f"[{step_num:02d}] {label} -> exit {process.returncode} (log: {log.name})", flush=True)
  return process.returncode

actions = sys.argv[1:]
if "all" in actions:
  actions = [
    "install",
    "lint",
    "typecheck",
    "test:unit",
    "test:integration",
    "build",
    "test:e2e",
    "verify:auth",
    "verify:contact",
    "rehearse:restore",
    "audit:config",
    "verify:content",
  ]

for action in actions:
  opts = ["--store-dir", str(scratch / "store"), "--config.cache-dir=" + str(scratch / "cache")]
  if action == "install":
    code = run(1, "frozen-install", ["install", "--frozen-lockfile", *opts])
    if code: raise SystemExit(code)
  elif action == "lint":
    code = run(2, "lint", ["lint"])
    if code: raise SystemExit(code)
  elif action == "typecheck":
    code = run(3, "typecheck", ["typecheck"])
    if code: raise SystemExit(code)
  elif action == "test:unit":
    code = run(4, "test-unit", ["test:unit"])
    if code: raise SystemExit(code)
  elif action == "test:integration":
    code = run(5, "test-integration", ["test:integration"])
    if code: raise SystemExit(code)
  elif action == "build":
    code = run(6, "build", ["build"])
    if code: raise SystemExit(code)
  elif action == "test:e2e":
    code = run(7, "test-e2e", ["test:e2e"])
    if code: raise SystemExit(code)
  elif action == "verify:auth":
    code = run(8, "auth-policy-verification", ["exec", "vitest", "run", "--config", "vitest.integration.config.ts", "tests/integration/rc-auth-matrix.test.ts"])
    if code: raise SystemExit(code)
  elif action == "verify:contact":
    code = run(9, "contact-release-verification", ["exec", "vitest", "run", "--config", "vitest.integration.config.ts", "tests/integration/rc-contact-checks.test.ts"])
    if code: raise SystemExit(code)
  elif action == "rehearse:restore":
    code = run(10, "operations-recovery-rehearsal", ["exec", "vitest", "run", "--config", "vitest.integration.config.ts", "tests/integration/rc-restore-rehearsal.test.ts"])
    if code: raise SystemExit(code)
  elif action == "audit:config":
    code = run(11, "configuration-audit", ["exec", "vitest", "run", "--config", "vitest.integration.config.ts", "tests/integration/rc-configuration-audit.test.ts"])
    if code: raise SystemExit(code)
  elif action == "verify:content":
    code = run(12, "content-snapshot-verification", ["exec", "vitest", "run", "--config", "vitest.integration.config.ts", "tests/integration/rc-content-snapshot.test.ts"])
    if code: raise SystemExit(code)
  else:
    raise SystemExit(f"Unknown action: {action}")
