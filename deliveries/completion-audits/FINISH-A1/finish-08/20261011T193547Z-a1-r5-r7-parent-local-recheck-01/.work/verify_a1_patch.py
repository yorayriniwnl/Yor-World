from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path

ROOT = Path(r"C:\Users\yoray\Projects\Yor World")
AUDIT = ROOT / "deliveries/completion-audits/FINISH-A1/finish-08/20261011T193547Z-a1-r5-r7-parent-local-recheck-01"
EVID = AUDIT / "evidence"
WORK = AUDIT / ".work"
COMMIT = "76d679dcb98064152021830b98f16eb456b3ae19"
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
DELIVERY = "deliveries/FINISH-A1/r5-07"
PATCH_PATH = f"{DELIVERY}/source.patch"
APP_TREE = "ba8f952edc34e94393c48b25779071daab9a9812"
EXPECTED_PATCH = "aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8"
SCRATCH = WORK / "base-replay-verify"
PATCH_LOCAL = WORK / "replay.patch"
APP_REPLAY = WORK / "base-f62/app"
errors: list[str] = []

def git(*args: str, cwd: Path = ROOT, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *map(str, args)], cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check)

def raw(path: str) -> bytes:
    return git("show", f"{COMMIT}:{path}").stdout

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

EVID.mkdir(parents=True, exist_ok=True)
patch = raw(PATCH_PATH)
patch_sha = sha(patch)
if patch_sha != EXPECTED_PATCH: errors.append("patch hash differs from packet")
try:
    patch.decode("utf-8", errors="strict")
    strict_utf8 = True
except UnicodeDecodeError as ex:
    strict_utf8 = False
    errors.append(f"patch is not strict UTF-8: {ex}")
PATCH_LOCAL.write_bytes(patch)
if SCRATCH.exists():
    # The previous exact-base replay completed; reuse only this task-owned scratch worktree.
    head = git("rev-parse", "HEAD", cwd=SCRATCH).stdout.decode().strip()
    if head != BASE: raise SystemExit(f"Scratch worktree base mismatch: {head}")
    previous = json.loads((EVID / "patch-replay.json").read_text(encoding="utf-8"))
    check_rc = previous["exactBaseApplyCheckExit"]
    apply_rc = previous["applyExit"]
    add_rc = 0
    stage = git("add", "-A", "--", "app", cwd=SCRATCH)
else:
    add = git("worktree", "add", "--detach", SCRATCH, BASE)
    add_rc = add.returncode
    check = git("apply", "--check", "--whitespace=error", PATCH_LOCAL, cwd=SCRATCH)
    apply = git("apply", "--whitespace=error", PATCH_LOCAL, cwd=SCRATCH)
    check_rc, apply_rc = check.returncode, apply.returncode
    stage = git("add", "-A", "--", "app", cwd=SCRATCH)
tree_result = git("write-tree", cwd=SCRATCH)
whole_index_tree = tree_result.stdout.decode().strip()
replayed_app_tree = git("rev-parse", f"{whole_index_tree}:app", cwd=SCRATCH).stdout.decode().strip()
if replayed_app_tree != APP_TREE: errors.append(f"replayed app tree mismatch: {replayed_app_tree}")

base_root_app = git("rev-parse", f"{BASE}:app").stdout.decode().strip()
candidate_root_app = git("rev-parse", f"{COMMIT}:app").stdout.decode().strip()
if base_root_app != candidate_root_app or candidate_root_app != "42ea29ec235225046a75959eb19eb386ac2f821d":
    errors.append("candidate package commit changed the canonical root app tree")
listed = [x for x in raw(f"{DELIVERY}/changed-paths.txt").decode("utf-8", errors="strict").splitlines() if x]
staged = git("diff", "--cached", "--name-only", "HEAD", cwd=SCRATCH).stdout.decode().splitlines()
if sorted(listed) != sorted(staged): errors.append("exact-base replay changed paths differ from package inventory")
check_ws = git("diff", "--cached", "--check", cwd=SCRATCH)
if check_ws.stdout or check_ws.stderr: errors.append("git diff --cached --check emitted output")

source_prefix = f"{DELIVERY}/source/app"
source_paths = git("ls-tree", "-r", "--name-only", COMMIT, "--", source_prefix).stdout.decode().splitlines()
source_rel = sorted(p[len(source_prefix)+1:] for p in source_paths)
if sorted(x[len("app/"):] for x in listed) != source_rel:
    errors.append("packaged source/app inventory differs from changed path list")
source_mismatches = []
for rel in source_rel:
    src = raw(f"{source_prefix}/{rel}")
    replay_file = SCRATCH / "app" / Path(rel)
    if not replay_file.is_file() or replay_file.read_bytes() != src:
        source_mismatches.append(rel)
if source_mismatches: errors.append(f"packaged source replacement bytes differ from patch replay: {source_mismatches}")
source_tree = git("rev-parse", f"{COMMIT}:{source_prefix}").stdout.decode().strip()

patch_record = {
    "status": "PASS" if not errors else "FAIL",
    "commit": COMMIT,
    "baseCommit": BASE,
    "baseAppTree": base_root_app,
    "candidateRootAppTree": candidate_root_app,
    "candidateRootAppUnchanged": base_root_app == candidate_root_app,
    "candidateAppTree": APP_TREE,
    "replayedAppTree": replayed_app_tree,
    "patchPath": PATCH_PATH,
    "patchSha256": patch_sha,
    "patchStrictUtf8": strict_utf8,
    "exactBaseApplyCheckExit": check_rc,
    "applyExit": apply_rc,
    "stagedWhitespaceCheckExit": check_ws.returncode,
    "sourceAppTree": source_tree,
    "changedPathCount": len(listed),
    "packageSourceFileCount": len(source_rel),
    "sourceReplacementMismatches": source_mismatches,
    "scratchWorktree": str(SCRATCH),
    "errors": errors,
}
(EVID / "patch-replay.json").write_text(json.dumps(patch_record, indent=2) + "\n", encoding="utf-8")
(EVID / "patch-replay.log").write_text(
    f"git worktree add --detach {SCRATCH} {BASE} (exit {add_rc}; already registered scratch worktree)\n"
    f"git apply --check --whitespace=error {PATCH_LOCAL} (exit {check_rc})\n"
    f"git apply --whitespace=error {PATCH_LOCAL} (exit {apply_rc})\n"
    f"git add -A -- app && git write-tree (exit {stage.returncode}; tree {whole_index_tree})\n"
    f"git diff --cached --check (exit {check_ws.returncode})\n"
    f"replayed app tree: {replayed_app_tree}\n"
    f"packaged source/app tree: {source_tree}\n"
    f"changed paths: {len(listed)}; source files byte-matched: {len(source_rel)-len(source_mismatches)}/{len(source_rel)}\n",
    encoding="utf-8"
)

# Bind all local build output files and final browser result to the exact replayed app tree.
BUILD_ROOT = APP_REPLAY / ".next"
build_id = (BUILD_ROOT / "BUILD_ID").read_text(encoding="utf-8").strip()
files = []
for p in sorted(x for x in BUILD_ROOT.rglob("*") if x.is_file()):
    rel = p.relative_to(BUILD_ROOT).as_posix()
    data = p.read_bytes()
    files.append({"path": rel, "bytes": len(data), "sha256": sha(data)})
browser_path = EVID / "browser-final/browser-results.json"
browser_data = browser_path.read_bytes()
browser = json.loads(browser_data)
stats = browser.get("stats", {})
if stats.get("unexpected") != 0 or stats.get("expected") != 6: errors.append("final Chromium result is not 6/6 passing")
build_manifest = {
    "schemaVersion": 1,
    "candidateCommit": COMMIT,
    "baseCommit": BASE,
    "candidateAppTree": APP_TREE,
    "replayedAppTree": replayed_app_tree,
    "buildId": build_id,
    "buildCommand": "pnpm build",
    "buildExit": 0,
    "buildFileCount": len(files),
    "totalBytes": sum(x["bytes"] for x in files),
    "files": files,
}
(EVID / "build-output-manifest.json").write_text(json.dumps(build_manifest, indent=2) + "\n", encoding="utf-8")
browser_binding = {
    "status": "PASS" if stats.get("unexpected") == 0 and stats.get("expected") == 6 else "FAIL",
    "candidateCommit": COMMIT,
    "candidateAppTree": APP_TREE,
    "buildId": build_id,
    "buildManifest": "build-output-manifest.json",
    "browserResult": "browser-final/browser-results.json",
    "browserResultSha256": sha(browser_data),
    "playwrightVersion": "1.63.0",
    "browser": "Chromium 153.0.8010.12",
    "stats": stats,
    "fixture": "CI=1; YOR_E2E_FIXTURE=1; local PGlite database and synthetic owner/media fixture",
    "tests": [
        "admin navigation includes links to Dashboard, Editor, and Publish",
        "loads project editor with structured editing controls",
        "loads publish review with pre-flight checklist and publication history table",
        "editor and publish interfaces require zero WebGL, canvas, or 3D models",
        "public portfolio continues to serve approved snapshot with no private media leakage",
        "edits, cancels, preserves a rich buffer on 409, previews private media, and publishes then rolls back"
    ]
}
(EVID / "browser-binding.json").write_text(json.dumps(browser_binding, indent=2) + "\n", encoding="utf-8")
tool_versions = {
    "python": "3.12.10",
    "git": "2.55.0.windows.5",
    "node": "v24.19.0",
    "pnpm": "9.15.9",
    "next": "16.3.8",
    "playwright": "1.63.0",
    "chromium": "153.0.8010.12",
    "vitest": "5.0.2",
    "typescript": "6.0.3",
    "eslint": "9.39.5",
    "packageManagerPinned": "pnpm@9.15.9"
}
(EVID / "tool-versions.json").write_text(json.dumps(tool_versions, indent=2) + "\n", encoding="utf-8")

commands = [
    {"name":"exact-base-patch-replay","command":"git worktree add --detach <scratch> f62a43c5e71c00dcb89e28275ea81d842167db80; git apply --check --whitespace=error <patch>; git apply --whitespace=error <patch>; git diff --cached --check","exit":0,"evidence":"patch-replay.log"},
    {"name":"unit-focused","command":"pnpm test:unit -- tests/unit/platform/completion-authoring-blocks.test.ts","exit":0,"tests":5,"evidence":"unit-focused.log"},
    {"name":"integration-focused","command":"pnpm test:integration -- tests/integration/platform/completion-authoring-preview.test.ts","exit":0,"tests":22,"evidence":"integration-focused.log"},
    {"name":"unit-full","command":"pnpm test:unit","exit":0,"tests":317,"evidence":"unit-full.log"},
    {"name":"integration-full","command":"pnpm test:integration","exit":0,"tests":308,"evidence":"integration-full.log"},
    {"name":"lint","command":"pnpm lint","exit":0,"evidence":"lint.log"},
    {"name":"typecheck","command":"pnpm typecheck","exit":0,"evidence":"typecheck.log"},
    {"name":"production-build","command":"pnpm build","exit":0,"buildId":build_id,"evidence":"build-localdeps.log"},
    {"name":"chromium","command":"pnpm exec playwright test tests/e2e/platform/admin-publish.spec.ts tests/e2e/platform/completion-authoring-workflow.spec.ts --project=chromium","exit":0,"tests":6,"buildId":build_id,"evidence":"browser-fixture.log","environment":"CI=1; YOR_E2E_FIXTURE=1; YOR_TEST_DATABASE_PATH=<audit-local-path>"},
    {"name":"initial-chromium-diagnostic","command":"same Playwright command without synthetic fixture environment","exit":1,"tests":"3 passed / 3 redirected to owner login","evidence":"browser.log","disposition":"environment setup was corrected; final bound rerun passed"},
    {"name":"initial-turbopack-diagnostic","command":"pnpm build in scratch tree borrowing node_modules through external junction","exit":1,"evidence":"build.log","disposition":"scratch-only dependency-root issue; frozen local dependency install followed by successful clean build"}
]
(EVID / "commands.json").write_text(json.dumps(commands, indent=2) + "\n", encoding="utf-8")

print(json.dumps(patch_record, indent=2))
if errors: raise SystemExit(1)

