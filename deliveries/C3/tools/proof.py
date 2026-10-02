"""Run C3 mobile, adaptive quality, accessibility, and failure recovery proof in an external temp directory; preserve command evidence.

Usage:
  python tools/proof.py prepare
  python tools/proof.py sync
  python tools/proof.py install
  python tools/proof.py lint
  python tools/proof.py typecheck
  python tools/proof.py test:unit
  python tools/proof.py build
  python tools/proof.py test:e2e
  python tools/proof.py test:performance
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
evidence = Path(os.environ.get("C3_EVIDENCE_DIR", str(root / "evidence"))).resolve()
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
    prior_scratch = Path(r"C:\Users\yoray\AppData\Local\Temp\yor-world-c2-proof-qkortug2")
    scratch = Path(tempfile.mkdtemp(prefix="yor-world-c3-proof-")).resolve()
    if scratch.is_relative_to(repo_root):
        raise SystemExit("Scratch must be outside the workspace.")
    app = scratch / "app"
    shutil.copytree(root / "source", app)
    (scratch / "empty.npmrc").write_text("", encoding="utf-8")

    # If prior store and node_modules exist, reuse them
    try:
        prior_ok = prior_scratch.exists() and (prior_scratch / "store").exists()
    except (PermissionError, OSError):
        prior_ok = False

    if prior_ok:
        store_dir = prior_scratch / "store"
        cache_dir = prior_scratch / "cache"
        # Fast junction for node_modules on Windows
        prior_nm = prior_scratch / "app" / "node_modules"
        if prior_nm.exists() and not (app / "node_modules").exists():
            try:
                subprocess.run(
                    ["cmd", "/c", "mklink", "/J", str(app / "node_modules"), str(prior_nm)],
                    check=False,
                    capture_output=True,
                    creationflags=hidden,
                )
            except Exception as e:
                print("Junction creation note:", e)
    else:
        store_dir = scratch / "store"
        cache_dir = scratch / "cache"

    pnpm = Path(shutil.which("pnpm.cmd") or shutil.which("pnpm") or "")
    pnpm_js = pnpm.parent / "node_modules/pnpm/bin/pnpm.cjs"
    if not pnpm_js.is_file():
        raise SystemExit(f"Cannot find installed pnpm CLI: {pnpm_js}")
    state = {
        "createdAt": now(),
        "provider": "Google",
        "model": "Gemini 3.8 Flash (High)",
        "lane": "Mobile, adaptive quality, accessibility and failure recovery / C3",
        "scratch": str(scratch),
        "app": str(app),
        "store": str(store_dir),
        "cache": str(cache_dir),
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
store_dir = Path(state.get("store", str(scratch / "store")))
cache_dir = Path(state.get("cache", str(scratch / "cache")))

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
    "PORT": "3199",
    "C3_EVIDENCE_DIR": str(evidence),
    "C2_EVIDENCE_DIR": str(evidence),
    "C1_EVIDENCE_DIR": str(evidence),
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
    elif action == "install":
        opts = ["--store-dir", str(store_dir), f"--config.cache-dir={cache_dir}"]
        code = run("frozen-install", ["install", "--frozen-lockfile", *opts])
        if code: raise SystemExit(code)
    elif action == "lint":
        code = run("lint", ["lint"])
        if code: raise SystemExit(code)
    elif action == "typecheck":
        code = run("typecheck", ["typecheck"])
        if code: raise SystemExit(code)
    elif action == "test:unit":
        code = run("unit-tests", ["test:unit"])
        if code: raise SystemExit(code)
    elif action == "build":
        code = run("build", ["build"])
        if code: raise SystemExit(code)
    elif action == "test:e2e":
        # Run playwright e2e tests (accessibility, renderer-recovery, and room-project navigation)
        code = run("e2e-tests", ["test:e2e", "tests/e2e/accessibility.spec.ts", "tests/e2e/renderer-recovery.spec.ts", "tests/e2e/room-project-navigation.spec.ts"])
        rec_dir = evidence / "recordings"
        rec_dir.mkdir(parents=True, exist_ok=True)
        trace_dir = evidence / "traces"
        trace_dir.mkdir(parents=True, exist_ok=True)
        if (app / "test-results").exists():
            for vid in (app / "test-results").rglob("*.webm"):
                dest_name = f"{vid.parent.name}_{vid.name}"
                shutil.copy2(vid, rec_dir / dest_name)
            for trc in (app / "test-results").rglob("*.zip"):
                dest_name = f"{trc.parent.name}_{trc.name}"
                shutil.copy2(trc, trace_dir / dest_name)
        if code: raise SystemExit(code)
    elif action == "test:performance":
        code = run("performance-benchmarks", ["test:performance"])
        if code: raise SystemExit(code)
    elif action == "package":
        archive = root / "c3-mobile-resilience.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
            for base, dirs, files in os.walk(root / "source"):
                p = Path(base)
                if ".next" in p.parts or "node_modules" in p.parts or ".turbo" in p.parts:
                    continue
                for f in files:
                    full = p / f
                    rel = full.relative_to(root)
                    z.write(full, str(rel))
            for base, dirs, files in os.walk(root / "evidence"):
                p = Path(base)
                for f in files:
                    full = p / f
                    rel = full.relative_to(root)
                    z.write(full, str(rel))
            for meta in ["accepted-inputs.json", "accepted-input-manifest.json", "device-matrix.md", "renderer-recovery.md", "report.md", "manifest.json"]:
                f = root / meta
                if f.is_file():
                    z.write(f, meta)
        h = hashlib.sha256(archive.read_bytes()).hexdigest()
        (root / "c3-mobile-resilience.zip.sha256").write_text(f"{h}  c3-mobile-resilience.zip\n", encoding="utf-8")
        print("Packaged archive:", archive, "SHA256:", h)
    else:
        raise SystemExit(f"Unknown action: {action}")
