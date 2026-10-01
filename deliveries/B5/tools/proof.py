"""Run B5 lifecycle foundation proof only in a fresh external temp directory; preserve command evidence.

Usage:
  python tools/proof.py prepare
  python tools/proof.py sync
  python tools/proof.py install
  python tools/proof.py lint
  python tools/proof.py typecheck
  python tools/proof.py test:unit
  python tools/proof.py build
  python tools/proof.py test:e2e
  python tools/proof.py package
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
import zipfile

root = Path(__file__).resolve().parents[1]
evidence = Path(os.environ.get("B5_PROOF_EVIDENCE", str(root / "evidence"))).resolve()
evidence.mkdir(parents=True, exist_ok=True)
state_file = evidence / "execution.json"
hidden = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

def now():
    return datetime.now(timezone.utc).isoformat()

def save(state):
    state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")

repo_root = root
while repo_root.parent != repo_root:
    if (repo_root / ".git").exists() or (repo_root / "START_HERE.md").exists():
        break
    repo_root = repo_root.parent

if sys.argv[1:] == ["prepare"]:
    scratch = Path(tempfile.mkdtemp(prefix="yor-world-b5-proof-")).resolve()
    if scratch.is_relative_to(repo_root):
        raise SystemExit("Scratch must be outside the workspace.")
    app = scratch / "app"
    shutil.copytree(root / "source", app)
    (scratch / "empty.npmrc").write_text("", encoding="utf-8")
    pnpm = Path(shutil.which("pnpm.cmd") or shutil.which("pnpm") or "")
    pnpm_js = pnpm.parent / "node_modules/pnpm/bin/pnpm.cjs"
    if not pnpm_js.is_file():
        raise SystemExit(f"Cannot find installed pnpm CLI: {pnpm_js}")
    state = {
        "createdAt": now(),
        "provider": "Google",
        "model": "Gemini 3.8 Flash (High)",
        "lane": "Production Runtime Lifecycle Maker / B5",
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
    raise SystemExit("State file missing. Run 'python tools/proof.py prepare' first.")

state = json.loads(state_file.read_text(encoding="utf-8"))
scratch, app = Path(state["scratch"]), Path(state["app"])
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
    "PORT": "3195",
    "B5_EVIDENCE_DIR": str(evidence),
    "G1_EVIDENCE_DIR": str(evidence),
    "W3_EVIDENCE_DIR": str(evidence),
})

def run(label, args):
    command = [state["node"], state["pnpmJs"], *args]
    number = len(state["commands"]) + 1
    log = evidence / f"{number:02}-{label}.log"
    rec = {
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
    print(label, "exit", process.returncode, "log", log, flush=True)
    return process.returncode

for action in sys.argv[1:]:
    if action == "sync":
        shutil.copytree(root / "source", app, dirs_exist_ok=True)
        print("Source synchronized to", app)
    elif action == "resolve":
        opts = ["--store-dir", str(scratch / "store"), "--config.cache-dir=" + str(scratch / "cache")]
        (app / "pnpm-lock.yaml").unlink(missing_ok=True)
        code = run("generate-lockfile", ["install", "--lockfile-only", *opts])
        if code: raise SystemExit(code)
        shutil.copy2(app / "pnpm-lock.yaml", root / "source/pnpm-lock.yaml")
    elif action == "install":
        opts = ["--store-dir", str(scratch / "store"), "--config.cache-dir=" + str(scratch / "cache")]
        code = run("frozen-install", ["install", "--frozen-lockfile", *opts])
        if code: raise SystemExit(code)
    elif action == "lint":
        code = run("lint", ["lint"])
        if code: raise SystemExit(code)
    elif action == "typecheck":
        code = run("typecheck", ["typecheck"])
        if code: raise SystemExit(code)
    elif action == "test:unit":
        code = run("test-unit", ["test:unit"])
        if code: raise SystemExit(code)
    elif action == "build":
        code = run("build", ["build"])
        if code: raise SystemExit(code)
    elif action == "test:e2e":
        code = run("test-e2e", ["test:e2e"])
        rec_dir = evidence / "recordings"
        rec_dir.mkdir(parents=True, exist_ok=True)
        if (app / "test-results").exists():
            for vid in (app / "test-results").rglob("*.webm"):
                dest_name = f"{vid.parent.name}_{vid.name}"
                shutil.copy2(vid, rec_dir / dest_name)
        if code: raise SystemExit(code)
    elif action == "package":
        zip_path = root / "b5-lifecycle-proof.zip"
        print(f"Creating archive {zip_path}...")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in root.rglob("*"):
                if p == zip_path or p.name == "b5-lifecycle-proof.zip.sha256" or ".git" in p.parts:
                    continue
                if p.is_file():
                    arcname = p.relative_to(root).as_posix()
                    zf.write(p, arcname)
        sha = hashlib.sha256(zip_path.read_bytes()).hexdigest()
        (root / "b5-lifecycle-proof.zip.sha256").write_text(f"{sha} *b5-lifecycle-proof.zip\n", encoding="utf-8")
        print(f"Packaged {zip_path} ({zip_path.stat().st_size} bytes, SHA-256: {sha})")
    else:
        raise SystemExit(f"Unknown action: {action}")
