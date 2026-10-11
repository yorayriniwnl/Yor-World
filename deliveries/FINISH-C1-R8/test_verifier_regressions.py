#!/usr/bin/env python3
"""Run disposable fail-closed regressions for the FINISH-C1-R8 verifier."""
from __future__ import annotations

import copy
import datetime as dt
import functools
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[1]
R7_COMMIT = "e2670d4152c461005da86b392dbcea12cec740bf"
R6_COMMIT = "9188b413d37da0ec3381b5430e25dc375a45bb18"
THREE_PHYSICAL = REPO_ROOT / "app" / "node_modules" / ".pnpm" / "three@0.180.0" / "node_modules" / "three"
INPUT_NAMES = (
    "source-binding.json",
    "candidate-input-provenance.json",
    "predecessor-output-git-blobs.json",
)
PACKAGE_FILES = {
    "candidate-app/node_modules/three/build/three.module.js": "build/three.module.js",
    "candidate-app/node_modules/three/build/three.core.js": "build/three.core.js",
}


def load_json(directory: Path, name: str) -> dict[str, Any]:
    return json.loads((directory / name).read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


def make_junction(link: Path, target: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    if link.exists():
        raise RuntimeError(f"refusing occupied package link: {link}")
    command = f"New-Item -ItemType Junction -Path '{link}' -Target '{target}' | Out-Null"
    subprocess.run(["powershell.exe", "-NoProfile", "-Command", command], check=True, capture_output=True)


def make_package_layout(repo: Path, source: Path) -> Path:
    physical = repo / "app" / "node_modules" / ".pnpm" / "three@0.180.0" / "node_modules" / "three"
    physical.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, physical)
    link = repo / "app" / "node_modules" / "three"
    make_junction(link, physical)
    return physical


def get_docs(source_dir: Path) -> dict[str, Any]:
    return {name: load_json(source_dir, name) for name in INPUT_NAMES}


def find_input(documents: dict[str, Any], alias: str) -> dict[str, Any]:
    return next(row for row in documents["candidate-input-provenance.json"]["inputs"] if row["alias"] == alias)


def find_package_input(documents: dict[str, Any], package_file: str) -> dict[str, Any]:
    alias = next(alias for alias, path in PACKAGE_FILES.items() if path == package_file)
    return find_input(documents, alias)


def cases() -> list[tuple[str, Callable[[dict[str, Any]], None] | None, str | None, str | None]]:
    direct_alias = "docs/planning/reconciliation-packets/2026-10-11-finish-09-c1-r6.md"
    module_alias = "candidate-app/node_modules/three/build/three.module.js"
    core_alias = "candidate-app/node_modules/three/build/three.core.js"

    def edit_candidate(name: str, fn: Callable[[dict[str, Any]], None]):
        def apply(docs: dict[str, Any]) -> None:
            fn(docs["candidate-input-provenance.json"])
        return apply

    def edit_binding(name: str, fn: Callable[[dict[str, Any]], None]):
        def apply(docs: dict[str, Any]) -> None:
            fn(docs["source-binding.json"])
        return apply

    def edit_predecessor(name: str, fn: Callable[[dict[str, Any]], None]):
        def apply(docs: dict[str, Any]) -> None:
            fn(docs["predecessor-output-git-blobs.json"])
        return apply

    result: list[tuple[str, Callable[[dict[str, Any]], None] | None, str | None, str | None]] = []
    def add(name: str, mutator: Callable[[dict[str, Any]], None] | None = None, package_file: str | None = None, package_action: str | None = None):
        result.append((name, mutator, package_file, package_action))

    # All 30 previously passing negative cases from FINISH-26.
    add("missing receipt file", lambda docs: None)
    add("missing R6 input row", edit_candidate("", lambda x: x["inputs"].pop()))
    add("duplicate R6 input alias", edit_candidate("", lambda x: x["inputs"].append(copy.deepcopy(x["inputs"][0]))))
    add("wrong direct Git path", edit_candidate("", lambda x: x["inputs"][0]["provenance"].update(path="app/not-the-pinned-path")))
    add("wrong direct Git commit", edit_candidate("", lambda x: x["inputs"][0]["provenance"].update(commit="0" * 40)))
    add("wrong corrected Git hash", edit_candidate("", lambda x: x["inputs"][0]["corrected"].update(sha256="0" * 64)))
    add("missing corrected Git hash", edit_candidate("", lambda x: x["inputs"][0]["corrected"].pop("sha256")))
    add("wrong corrected Git byte count", edit_candidate("", lambda x: x["inputs"][0]["corrected"].update(bytes=x["inputs"][0]["corrected"]["bytes"] + 1)))
    add("wrong input counts", edit_candidate("", lambda x: x["counts"].update(total=28)))
    add("original historical expected hash altered", edit_candidate("", lambda x: x["inputs"][0]["originalExpected"].update(sha256="0" * 64)))
    add("wrong source binding tree", edit_binding("", lambda x: x["commits"]["R6"].update(tree="0" * 40)))
    add("wrong source binding manifest hash", edit_binding("", lambda x: x["r6InputManifest"].update(sha256="0" * 64)))
    add("wrong package integrity", edit_binding("", lambda x: x["threeDependencyEvidence"].update(threeIntegrity="sha512-invalid")))
    add("wrong corrected installed file hash", edit_candidate("", lambda x: find_package_input({"candidate-input-provenance.json": x}, "build/three.module.js")["corrected"].update(sha256="0" * 64)))
    add("package mislabeled as Git-backed", edit_candidate("", lambda x: find_package_input({"candidate-input-provenance.json": x}, "build/three.module.js")["provenance"].update(kind="direct-git-blob")))
    add("duplicate R5 output path", edit_predecessor("", lambda x: x["outputs"][1].update(path=x["outputs"][0]["path"])))
    add("wrong R5 manifest receipt hash", edit_predecessor("", lambda x: x["sourceManifest"].update(sha256="0" * 64)))
    add("wrong R5 output commit", edit_predecessor("", lambda x: x["outputs"][0].update(commit="0" * 40)))
    add("wrong R5 output hash", edit_predecessor("", lambda x: x["outputs"][0].update(sha256="0" * 64)))
    add("wrong R5 output count", edit_predecessor("", lambda x: x.update(count=31)))
    add("wrong source binding package integrity", edit_binding("", lambda x: x["threeDependencyEvidence"].update(threeIntegrity="sha512-invalid")))
    add("wrong package source file hash", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][0].update(sha256="0" * 64)))
    add("wrong package source file byte count", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][0].update(bytes=1)))
    add("wrong package source file relative path", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][0].update(packageFile="build/not-three.js")))
    add("wrong source binding package name", edit_binding("", lambda x: x["threeDependencyEvidence"].update(packageName="three-fork")))
    add("wrong source binding package version", edit_binding("", lambda x: x["threeDependencyEvidence"].update(packageVersion="0.0.0")))
    add("missing installed package manifest", None, "package.json", "missing")
    add("missing installed three.module.js", None, "build/three.module.js", "missing")
    add("missing installed three.core.js", None, "build/three.core.js", "missing")
    add("installed three.module.js bytes corrupted", None, "build/three.module.js", "corrupt")
    add("installed three.core.js bytes corrupted", None, "build/three.core.js", "corrupt")
    add("installed package version corrupted", None, "package.json", "wrong-version")
    add("installed package name corrupted", None, "package.json", "wrong-name")

    # E-02 regressions: each previously false-passing duplicate is independently rejected.
    add("candidate sourceManifest commit mismatch", edit_candidate("", lambda x: x["sourceManifest"].update(commit="0" * 40)))
    add("candidate sourceManifest path mismatch", edit_candidate("", lambda x: x["sourceManifest"].update(path="deliveries/not-pinned/input-hashes.json")))
    add("candidate sourceManifest sha256 mismatch", edit_candidate("", lambda x: x["sourceManifest"].update(sha256="0" * 64)))
    add("candidate sourceManifest bytes mismatch", edit_candidate("", lambda x: x["sourceManifest"].update(bytes=x["sourceManifest"]["bytes"] + 1)))
    add("candidate sourceManifest blob OID mismatch", edit_candidate("", lambda x: x["sourceManifest"].update(blobOid="0" * 40)))
    add("candidate sourceManifest field missing", edit_candidate("", lambda x: x["sourceManifest"].pop("sha256")))
    add("candidate sourceManifest extra field", edit_candidate("", lambda x: x["sourceManifest"].update(unbound="unexpected")))
    add("packageFiles list missing", edit_binding("", lambda x: x["threeDependencyEvidence"].pop("packageFiles")))
    add("packageFiles list missing second file", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"].pop()))
    add("packageFiles list has an extra entry", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"].append(copy.deepcopy(x["threeDependencyEvidence"]["packageFiles"][0]))))
    add("packageFiles list has duplicate alias", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][1].update(alias=x["threeDependencyEvidence"]["packageFiles"][0]["alias"])))
    add("packageFiles alias mismatch", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][0].update(alias="candidate-app/node_modules/three/build/other.js")))
    add("packageFiles entry extra field", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][0].update(note="not allowed")))
    add("packageFiles entry field missing", edit_binding("", lambda x: x["threeDependencyEvidence"]["packageFiles"][0].pop("bytes")))
    return result


def mutate_installed(package_root: Path, relative: str, action: str) -> None:
    path = package_root / relative
    if action == "missing":
        path.unlink()
        return
    if action == "corrupt":
        path.write_bytes(path.read_bytes() + b"\x00")
        return
    value = json.loads(path.read_text(encoding="utf-8"))
    if action == "wrong-version":
        value["version"] = "0.0.0"
    elif action == "wrong-name":
        value["name"] = "three-fork"
    else:
        raise AssertionError(action)
    write_json(path, value)


def make_module():
    path = ROOT / "verify-input-provenance.py"
    spec = importlib.util.spec_from_file_location("c1_r8_verifier_under_test", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import verifier: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    real_git = subprocess.run

    @functools.lru_cache(maxsize=None)
    def cached_git_bytes(*args: str) -> bytes:
        process = real_git(["git", *args], cwd=REPO_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if process.returncode != 0:
            detail = process.stderr.decode("utf-8", errors="replace").strip()
            raise module.VerificationError(f"git {' '.join(args)} failed with exit {process.returncode}: {detail}")
        return process.stdout

    module.git_bytes = cached_git_bytes
    return module


def copy_receipts(source: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for name in INPUT_NAMES:
        (destination / name).write_bytes((source / name).read_bytes())


def run_exact_positive() -> dict[str, Any]:
    command = [sys.executable, "-B", str(ROOT / "verify-input-provenance.py"), "--json", "--check-output-manifest", "--commit", R7_COMMIT]
    process = subprocess.run(command, cwd=REPO_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    label = "exact-r8-positive-r7-inputs"
    evidence = ROOT / "evidence"
    (evidence / f"{label}.stdout.log").write_bytes(process.stdout)
    (evidence / f"{label}.stderr.log").write_bytes(process.stderr)
    try:
        payload = json.loads(process.stdout.decode("utf-8"))
    except Exception:
        payload = None
    okay = process.returncode == 0 and isinstance(payload, dict) and payload.get("status") == "PASS"
    return {"case": label, "command": command, "cwd": str(REPO_ROOT), "actualExit": process.returncode, "expectedExit": 0, "returnedStatus": payload.get("status") if isinstance(payload, dict) else None, "expectedStatus": "PASS", "stdoutPath": f"evidence/{label}.stdout.log", "stderrPath": f"evidence/{label}.stderr.log", "cacheUsed": False, "outputManifest": payload.get("outputManifest") if isinstance(payload, dict) else None, "status": "PASS" if okay else "FAIL"}


def run_cli(cli_repo: Path, package_dir: Path, git_dir: str, *, corrupt_hash: bool) -> dict[str, Any]:
    package_dir.mkdir(parents=True, exist_ok=True)
    for name in ("verify-input-provenance.py", *INPUT_NAMES):
        (package_dir / name).write_bytes((ROOT / name).read_bytes())
    if corrupt_hash:
        data = load_json(package_dir, "candidate-input-provenance.json")
        data["sourceManifest"]["sha256"] = "0" * 64
        write_json(package_dir / "candidate-input-provenance.json", data)
    make_package_layout(cli_repo, THREE_PHYSICAL)
    env = dict(__import__("os").environ)
    env["GIT_DIR"] = git_dir
    env["GIT_WORK_TREE"] = str(cli_repo)
    command = [sys.executable, "-B", str(package_dir / "verify-input-provenance.py"), "--json", "--check-output-manifest", "--commit", R7_COMMIT]
    process = subprocess.run(command, cwd=cli_repo, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    label = "cli-negative-zero-source-manifest-sha256" if corrupt_hash else "cli-positive-exact-r7-inputs"
    evidence = ROOT / "evidence"
    (evidence / f"{label}.stdout.log").write_bytes(process.stdout)
    (evidence / f"{label}.stderr.log").write_bytes(process.stderr)
    try:
        payload = json.loads(process.stdout.decode("utf-8"))
    except Exception:
        payload = None
    expected_status = "FAIL" if corrupt_hash else "PASS"
    expected_exit = 1 if corrupt_hash else 0
    return {
        "case": label,
        "command": command,
        "cwd": str(cli_repo),
        "gitEnvironment": {"GIT_DIR": git_dir, "GIT_WORK_TREE": str(cli_repo)},
        "actualExit": process.returncode,
        "expectedExit": expected_exit,
        "returnedStatus": payload.get("status") if isinstance(payload, dict) else None,
        "expectedStatus": expected_status,
        "stdoutPath": f"evidence/{label}.stdout.log",
        "stderrPath": f"evidence/{label}.stderr.log",
        "cacheUsed": False,
        "status": "PASS" if process.returncode == expected_exit and isinstance(payload, dict) and payload.get("status") == expected_status else "FAIL",
    }


def main() -> int:
    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    scratch = ROOT / ".work" / f"regressions-{run_id}"
    scratch.mkdir(parents=True, exist_ok=False)
    base_repo = scratch / "base-repo"
    base_package = make_package_layout(base_repo, THREE_PHYSICAL)
    module = make_module()
    results: list[dict[str, Any]] = []
    exact_positive = run_exact_positive()
    results.append({**exact_positive, "expectedRejection": False, "rejected": False})

    for index, (name, mutator, package_file, package_action) in enumerate(cases(), start=1):
        case_dir = scratch / f"case-{index:02d}"
        copy_receipts(ROOT, case_dir)
        docs = get_docs(case_dir)
        if mutator is not None:
            mutator(docs)
            for file_name, value in docs.items():
                write_json(case_dir / file_name, value)
        if name == "missing receipt file":
            (case_dir / "candidate-input-provenance.json").unlink()
        repo_for_case = base_repo
        if package_file is not None:
            repo_for_case = case_dir / "repo"
            case_physical = make_package_layout(repo_for_case, base_package)
            mutate_installed(case_physical, package_file, package_action or "missing")
        module.PACKAGE_DIR = case_dir
        module.REPO_ROOT = repo_for_case
        try:
            module.run_verification(None)
        except (module.VerificationError, OSError, KeyError, TypeError, ValueError) as error:
            rejected = True
            message = f"{type(error).__name__}: {error}"
        else:
            rejected = False
            message = "Verifier returned PASS"
        results.append({"case": name, "expectedRejection": True, "rejected": rejected, "status": "PASS" if rejected else "FAIL", "result": message, "disposableInput": str(case_dir.relative_to(ROOT)).replace("\\", "/")})

    # Preserve the helper-level malformed-object and pin guards from the earlier audit.
    helper_cases = [
        ("missing Git object path", lambda: module.resolve_git_blob(R6_COMMIT, "app/no-such-file.fin28")),
        ("unpinned Git commit", lambda: module.verify_commit_pin("0" * 40)),
        ("duplicate authoritative path", lambda: module.validate_unique_rows([{"path":"same"},{"path":"same"}], "path", 2, "audit-probe")),
    ]
    for name, action in helper_cases:
        try:
            action()
        except (module.VerificationError, OSError, KeyError, TypeError, ValueError) as error:
            rejected=True; message=f"{type(error).__name__}: {error}"
        else:
            rejected=False; message="Verifier returned PASS"
        results.append({"case":name,"expectedRejection":True,"rejected":rejected,"status":"PASS" if rejected else "FAIL","result":message,"disposableInput":"no receipt mutation; direct verifier guard"})

    git_dir = subprocess.check_output(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], cwd=REPO_ROOT, text=True).strip()
    cli_repo = scratch / "cli-repo"
    cli_positive_dir = cli_repo / "deliveries" / "FINISH-C1-R8"
    cli_positive = run_cli(cli_repo, cli_positive_dir, git_dir, corrupt_hash=False)
    results.append({**cli_positive, "expectedRejection": False, "rejected": False})
    cli_negative_repo = scratch / "cli-negative-repo"
    cli_negative_dir = cli_negative_repo / "deliveries" / "FINISH-C1-R8"
    cli_negative = run_cli(cli_negative_repo, cli_negative_dir, git_dir, corrupt_hash=True)
    results.append({**cli_negative, "expectedRejection": True, "rejected": cli_negative["status"] == "PASS"})

    failed = [item for item in results if item["status"] != "PASS"]
    receipt_cases = [item for item in results if item.get("expectedRejection") is True]
    output = {
        "schemaVersion": 1,
        "candidateCommit": R7_COMMIT,
        "method": "Imported corrected verifier probes use cached raw immutable Git reads for speed and fresh disposable receipt/package copies. The two exact CLI cases are separate Python -B processes with cacheUsed=false; the negative CLI probe enables --check-output-manifest and corrupts only a copied sourceManifest.sha256.",
        "scratchRoot": str(scratch.relative_to(ROOT)).replace("\\", "/"),
        "productionDependenciesModified": False,
        "candidateAndHistoricalReceiptsModified": False,
        "negativeCaseCount": len(receipt_cases),
        "negativePassed": sum(item["status"] == "PASS" for item in receipt_cases),
        "failedCount": len(failed),
        "cases": results,
        "cli": {"exactPackagePositive": exact_positive, "positive": cli_positive, "zeroHashNegative": cli_negative},
    }
    evidence_path = ROOT / "evidence" / "negative-regression-results.json"
    write_json(evidence_path, output)
    print(json.dumps(output, indent=2, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
