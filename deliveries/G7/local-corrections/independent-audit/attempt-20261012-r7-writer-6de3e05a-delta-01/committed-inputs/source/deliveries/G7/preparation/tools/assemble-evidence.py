"""Bind actually executed successor release evidence; detached receipt avoids circular hashes."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess

BASE = "eb1ff201391334d6041b35c59eb350fcd012a79c"
RC5_SOURCE = "c34e01bb5bff210d924f42d5266e2fa1ed13288e"
RC5_TREE = "88a65e85d1f120a9aa4397efa8cc779bdfe5cf08"
RC5_BUNDLE = "4380cab7f5211c836fe5bb97c68d67137c1b0fd7a2e4789bb29d0157ab5faa0f"
DEFAULT_POLICY = "scripts/release/rc6-policy.json"
TEXT = re.compile(r"\.(?:[cm]?[jt]sx?|json|jsonl|ya?ml|md|txt|log|css|html|sql|svg|patch|toml|example)$")


PRESERVED_OUTPUTS = [
    "deliveries/C4", "deliveries/G6/full-stack-integration",
    "deliveries/G6/rc4-candidate", "deliveries/G6/rc5-candidate",
    "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
    "deliveries/G7/rc6-candidate-r3", "deliveries/G7/rc6-candidate-r4", "deliveries/G7/rc6-candidate-r5",
    "deliveries/G7/rc6-candidate-r6",
    "deliveries/G7/rc6-candidate-r7/release-composition.json",
    "deliveries/G7/rc6-candidate-r7/gltf-validation-receipt.json",
    "deliveries/G7/rc6-independent-delta/r6-audit",
    "deliveries/G7/rc6-independent-delta/gate-advice/final-r6",
    "docs/planning/reviews/2026-10-08-rc6-r1",
    "docs/planning/reviews/2026-10-08-rc6-r1.md",
    "docs/planning/reviews/2026-10-06-g6-r1",
    "docs/planning/reviews/2026-10-06-g6-r1.md",
    "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
    *[f"docs/releases/v1.0.0-rc{number}.md" for number in range(1, 6)],
]


def path_key(path: Path) -> str:
    return os.path.normcase(os.path.abspath(path))


def inside(parent: Path, target: Path) -> bool:
    try:
        return os.path.commonpath([path_key(parent), path_key(target)]) == path_key(parent)
    except ValueError:
        return False


def safe_relative(name: str, label: str) -> tuple[str, ...]:
    if (not isinstance(name, str) or not name or re.search(r'[\\\x00-\x1f:<>"|?*]', name)
            or name.startswith("/") or name.startswith("\\") or re.match(r"^[a-zA-Z]:", name)):
        raise ValueError(f"Unsafe {label} path: {name}")
    parts = tuple(name.split("/"))
    if any(part in ["", ".", ".."] or part.endswith((".", " "))
           or re.match(r"^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)", part, re.I) for part in parts):
        raise ValueError(f"Unsafe {label} path: {name}")
    return parts


def safe_repo_path(root: Path, name: str, *, output: bool = False) -> Path:
    parts = safe_relative(name, "repository output" if output else "repository")
    target = root.joinpath(*parts)
    current = root
    for index, part in enumerate(parts):
        current = current / part
        if current.is_symlink() or (hasattr(current, "is_junction") and current.is_junction()):
            raise ValueError(f"Filesystem alias is forbidden: {name}")
        try:
            current.lstat()
        except FileNotFoundError:
            break
        resolved = current.resolve(strict=True)
        if path_key(resolved) != path_key(current) or not inside(root, resolved):
            raise ValueError(f"Filesystem alias escapes or changes the repository path: {name}")
        if index < len(parts) - 1 and not current.is_dir():
            raise ValueError(f"Non-directory path component: {current}")
    if not inside(root, target):
        raise ValueError(f"Repository path escapes root: {name}")
    if output:
        resolved = target.resolve(strict=False)
        if not inside(root, resolved) or path_key(resolved) != path_key(target):
            raise ValueError(f"Output path must not use a filesystem alias: {name}")
        for reserved in PRESERVED_OUTPUTS:
            protected = root.joinpath(*safe_relative(reserved, "preserved"))
            resolved_protected = protected.resolve(strict=False)
            if inside(protected, target) or inside(resolved_protected, resolved):
                raise ValueError(f"Preserved release proof cannot be written: {name}")
        try:
            stat = target.lstat()
        except FileNotFoundError:
            stat = None
        if stat is not None:
            if stat.st_nlink > 1 and target.is_file():
                raise ValueError(f"Hard-linked release output is forbidden: {name}")
            raise ValueError(f"Output already exists; preserve the prior attempt: {name}")
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--policy", default=DEFAULT_POLICY)
    parser.add_argument("--source", required=True)
    parser.add_argument("--inventory-only", action="store_true")
    args = parser.parse_args()
    root_input = args.repository.absolute()
    root = root_input.resolve()
    if path_key(root_input) != path_key(root) or not root.is_dir():
        raise ValueError("Repository root must be a real directory without filesystem aliases")
    policy_path = safe_repo_path(root, args.policy)
    policy = json.loads(policy_path.read_text(encoding="utf-8"))
    DELIVERY = policy["deliveryRoot"]
    delivery = safe_repo_path(root, DELIVERY)
    if not DELIVERY.startswith("deliveries/G7/"):
        raise ValueError(f"Successor inventory must use a new G7 delivery root: {DELIVERY}")
    resolved_delivery = delivery.resolve(strict=False)
    for reserved in PRESERVED_OUTPUTS:
        protected = root.joinpath(*safe_relative(reserved, "preserved"))
        if inside(protected, delivery) or inside(protected.resolve(strict=False), resolved_delivery):
            raise ValueError(f"Successor inventory cannot rewrite accepted delivery roots: {DELIVERY}")

    inputs: set[str] = {path_key(policy_path)}
    staged: dict[str, bytes] = {}

    def git(*arguments):
        return subprocess.check_output(["git", *arguments], cwd=root, text=True, encoding="utf-8").strip()

    def read(path):
        target = safe_repo_path(root, path)
        inputs.add(path_key(target))
        return json.loads(target.read_text(encoding="utf-8"))

    def write(name, data):
        relative = f"{DELIVERY}/{name}"
        safe_relative(relative, "release output")
        staged[relative] = (json.dumps(data, indent=2) + "\n").encode("utf-8")

    def digest(path):
        if path in staged:
            content = staged[path]
        else:
            target = safe_repo_path(root, path)
            inputs.add(path_key(target))
            content = target.read_bytes()
        if TEXT.search(path) or PurePosixPath(path).name in [".gitignore", ".npmrc"]:
            content = content.replace(b"\r\n", b"\n")
        return hashlib.sha256(content).hexdigest()

    def digest_mode(path, mode):
        if mode not in ["lf", "raw"]:
            raise RuntimeError(f"Unsupported evidence hash mode: {mode}")
        if path in staged:
            content = staged[path]
        else:
            target = safe_repo_path(root, path)
            inputs.add(path_key(target))
            content = target.read_bytes()
        if mode == "lf":
            content = content.replace(b"\r\n", b"\n")
        return hashlib.sha256(content).hexdigest()

    if not re.fullmatch(r"[0-9a-f]{40}", args.source) or args.source == "0" * 40:
        raise ValueError("--source must be a full non-placeholder Git commit SHA")
    if git("cat-file", "-t", args.source) != "commit":
        raise ValueError("--source does not identify an existing Git commit")

    exec_path = delivery / "evidence/execution.jsonl"
    if not exec_path.is_file():
        raise RuntimeError(f"Missing execution log: {exec_path}")
    exec_relative = exec_path.relative_to(root).as_posix()
    safe_exec = safe_repo_path(root, exec_relative)
    inputs.add(path_key(safe_exec))
    records = [json.loads(line) for line in exec_path.read_text(encoding="utf-8").splitlines()]
    latest = {}
    id_spellings = {}
    for record in records:
        if not isinstance(record, dict) or not re.fullmatch(r"[0-9a-f]{40}", record.get("sourceCommit", "")):
            raise RuntimeError("Execution inventory contains a malformed source identity")
        if record["sourceCommit"] != args.source:
            continue
        check_id = record.get("id")
        if not isinstance(check_id, str) or not check_id.strip():
            raise RuntimeError("Exact-source execution inventory contains an empty check ID")
        folded_id = check_id.casefold()
        if folded_id in id_spellings and id_spellings[folded_id] != check_id:
            raise RuntimeError(f"Execution inventory contains case-alias check IDs: {check_id}")
        id_spellings[folded_id] = check_id
        if (not isinstance(record.get("attempt"), (int, str)) or isinstance(record.get("attempt"), bool)
                or not isinstance(record.get("exitCode"), int) or isinstance(record.get("exitCode"), bool)
                or not isinstance(record.get("durationSeconds"), (int, float))
                or not isinstance(record.get("command"), list)
                or not all(isinstance(part, str) for part in record["command"])):
            raise RuntimeError(f"Execution record is incomplete: {check_id}")
        evidence_path = record.get("evidencePath")
        evidence_sha = record.get("evidenceSha256")
        if (not isinstance(evidence_path, str) or not evidence_path.startswith(DELIVERY + "/")
                or not re.fullmatch(r"[0-9a-f]{64}", evidence_sha or "")):
            raise RuntimeError(f"Execution record has unsafe evidence identity: {check_id}")
        evidence_file = safe_repo_path(root, evidence_path)
        if not inside(delivery, evidence_file) or not evidence_file.is_file():
            raise RuntimeError(f"Execution record evidence is absent or outside delivery: {check_id}")
        if hashlib.sha256(evidence_file.read_bytes()).hexdigest() != evidence_sha:
            raise RuntimeError(f"Execution log hash differs from exact-source record: {check_id}")
        if evidence_file.stat().st_nlink > 1:
            raise RuntimeError(f"Hard-linked execution evidence is forbidden: {evidence_path}")
        inputs.add(path_key(evidence_file))
        latest[check_id] = record
    if not latest:
        raise RuntimeError(f"Execution inventory is empty or contains no records matching sourceCommit {args.source}")
    policy = read(args.policy)
    source_tree = git("rev-parse", f"{args.source}:app")
    if args.inventory_only:
        existing_manifest_path = f"{DELIVERY}/release-manifest.json"
        existing_binding_path = f"{DELIVERY}/source-binding.json"
        existing_manifest = read(existing_manifest_path)
        existing_binding = read(existing_binding_path)
        for key in ["releaseId", "canonicalApplicationRoot", "assetRevision", "publicationRevision", "schemaRevision", "contactAmendment"]:
            if existing_manifest.get(key) != policy.get(key):
                raise RuntimeError(f"Existing release manifest differs from exact-source policy: {key}")
        if (existing_manifest.get("sourceCommit") != args.source
                or existing_manifest.get("sourceAppTree") != source_tree
                or existing_binding.get("sourceCommit") != args.source
                or existing_binding.get("sourceAppTree") != source_tree):
            raise RuntimeError("Inventory-only mode requires an exact-source manifest and source binding")
        archive_path = existing_manifest.get("releaseBundlePath")
        if (not isinstance(archive_path, str) or not archive_path.startswith(DELIVERY + "/")
                or existing_manifest.get("releaseBundleSha256") != digest(archive_path)):
            raise RuntimeError("Inventory-only mode requires the actual bound release archive")
        binding_ref = existing_manifest.get("sourceBinding", {})
        if (binding_ref.get("path") != existing_binding_path
                or binding_ref.get("sha256") != digest(existing_binding_path)
                or binding_ref.get("hashMode") != "lf"):
            raise RuntimeError("Inventory-only source-binding reference is stale or invalid")
    if not args.inventory_only:
        bundle = read(f"{DELIVERY}/bundle-receipt.json")
        if bundle["sourceCommit"] != args.source or bundle["releaseId"] != policy["releaseId"]:
            raise RuntimeError("Bundle receipt does not bind the exact successor source")
        if digest(bundle["archivePath"]) != bundle["sha256"]:
            raise RuntimeError("Actual archive hash differs from bundle receipt")
        if bundle.get("sourceAppTree") != source_tree:
            raise RuntimeError("Bundle receipt app tree differs from exact source app tree")
        historical = read(f"{DELIVERY}/evidence/historical-immutability.json")
        if historical["sourceCommit"] != args.source or historical["overallStatus"] != "PASS":
            raise RuntimeError("Protected history/production evidence is not exact-source PASS")
        fields = ["releaseId", "canonicalApplicationRoot", "assetRevision", "publicationRevision", "schemaRevision", "contactAmendment"]
        binding = {key: policy[key] for key in fields}
        binding.update(
            sourceCommit=args.source, sourceAppTree=source_tree, coordinationBaseCommit=BASE,
            releaseBundlePath=bundle["archivePath"], releaseBundleSha256=bundle["sha256"],
            supersedes={"releaseId": "v1.0.0-rc5", "sourceCommit": RC5_SOURCE, "sourceAppTree": RC5_TREE,
                        "releaseBundleSha256": RC5_BUNDLE, "disposition": "Accepted immutable RC5 baseline under G6-R1. RC6 successor awaits separate independent delta review/adjudication."},
            changedPathsFromBase=git("diff", "--name-only", BASE, args.source).splitlines(),
            protectedHistory={"path": f"{DELIVERY}/evidence/historical-immutability.json", "sha256": digest(f"{DELIVERY}/evidence/historical-immutability.json"), "hashMode": "lf"},
            limits="Maker source binding only; no independent delta audit, successor acceptance or G7 gate acceptance.",
        )
        write("source-binding.json", binding)
        checks = []
        for check_id in policy["requiredChecks"]:
            if check_id == "release-manifest-validation":
                evidence = f"{DELIVERY}/release-manifest-validation.receipt.json"
            else:
                record = latest.get(check_id)
                if not record or record["exitCode"] != 0 or digest(record["evidencePath"]) != record["evidenceSha256"]:
                    raise RuntimeError(f"Missing, failed or changed exact-source execution: {check_id}")
                evidence = record["evidencePath"]
                if check_id == "release-composition":
                    evidence = f"{DELIVERY}/release-composition.json"
                if check_id == "budget-regression":
                    evidence = f"{DELIVERY}/budget-validation-receipt.json"
            check = {"id": check_id, "status": "pass", "blocking": True,
                     "verificationCategory": "AUTOMATED PASS", "sourceCommit": args.source, "evidencePath": evidence}
            if check_id != "release-manifest-validation":
                check.update(evidenceSha256=digest(evidence), evidenceHashMode="lf")
            checks.append(check)
        counts = read(f"{DELIVERY}/evidence/browser-counts.json")
        if counts["sourceCommit"] != args.source or counts["overallStatus"] != "PASS":
            raise RuntimeError("Authoritative discovery/execution count verification is missing")
        for bucket, filename in [("e2e", "browser-results.json"), ("accessibility", "browser-results.json"), ("performance", "performance-results.json")]:
            stats = read(f"{DELIVERY}/evidence/{bucket}/{filename}")["stats"]
            if stats["expected"] != counts["discoveredCounts"][bucket] or any(stats[key] for key in ["unexpected", "flaky", "skipped"]):
                raise RuntimeError(f"Browser execution has missing/failed/skipped/flaky cases: {bucket}")
        cleanup = read(f"{DELIVERY}/evidence/performance/enter-exit-stability.json")
        if cleanup.get("memoryLeakDetected") is False or cleanup.get("heapLeakAbsence") != "UNKNOWN" or cleanup.get("gpuMemoryLeakAbsence") != "UNKNOWN":
            raise RuntimeError("Unmeasured heap/GPU leak absence must remain UNKNOWN in new successor evidence")
        if cleanup.get("domAndRenderCleanupObserved") is not True or len(cleanup.get("cycles", [])) != 4:
            raise RuntimeError("Four actual rendered SPA teardown cycles must prove DOM/render cleanup")
        for cycle in cleanup["cycles"]:
            active = cycle.get("activeDiagnostics", {})
            after = cycle.get("afterExit", {})
            if not (active.get("renderCalls", 0) > 0 and active.get("renderedTriangles", 0) > 0
                    and cycle.get("canvasCount") == 0 and after.get("canvasConnected") is False
                    and after.get("renderedFrames") == cycle.get("stoppedFrames") and after.get("contextLost") is True):
                raise RuntimeError("A SPA cycle lacks actual connected rendering and stopped/disposed renderer proof")
        supplemental = {f"{DELIVERY}/{path}" for path in policy.get("requiredEvidencePaths", [])}
        supplemental.update(f"{DELIVERY}/{name}" for name in ["source-binding.json", "asset-validation.json",
                            "evidence/versions.json", "evidence/session.json", "evidence/historical-immutability.json",
                            "evidence/browser-counts.json", "evidence/e2e-discovery.json", "evidence/accessibility-discovery.json",
                            "evidence/performance-discovery.json", "evidence/e2e-inventory.json", "evidence/accessibility-inventory.json", "evidence/performance-inventory.json", "evidence/e2e/browser-results.json",
                            "evidence/accessibility/browser-results.json", "evidence/performance/performance-results.json"])
        supplemental.update(path.relative_to(root).as_posix() for path in (delivery / "evidence/performance").glob("*.json"))
        for path in supplemental:
            if not path.startswith(DELIVERY + "/"):
                raise RuntimeError(f"Mandatory successor evidence path is absent or outside delivery: {path}")
            evidence_file = safe_repo_path(root, path)
            present = path in staged or evidence_file.is_file()
            if not inside(delivery, evidence_file) or not present:
                raise RuntimeError(f"Mandatory successor evidence path is absent or outside delivery: {path}")
            if evidence_file.is_file() and evidence_file.stat().st_nlink > 1:
                raise RuntimeError(f"Hard-linked mandatory evidence is forbidden: {path}")
            digest(path)
        manifest = {key: policy[key] for key in fields}
        manifest.update(
            sourceCommit=args.source, gitCommit=args.source, sourceAppTree=source_tree,
            releaseBundlePath=bundle["archivePath"], releaseBundleSha256=bundle["sha256"],
            bundleMetadata={"fileCount": bundle["fileCount"], "bytes": bundle["bytes"]},
            sourceBinding={"path": f"{DELIVERY}/source-binding.json", "sha256": digest(f"{DELIVERY}/source-binding.json"), "hashMode": "lf"},
            governance=policy.get("candidateGovernance", {"status": "candidate", "selfApproved": False, "g6Status": "ACCEPTED (G6-R1); RC6 AWAITING DELTA REVIEW", "g7Status": "AUTHORIZED / PREPARATION"}),
            composition={"path": f"{DELIVERY}/release-composition.json", "sha256": digest(f"{DELIVERY}/release-composition.json"), "hashMode": "lf"},
            requiredChecks=checks,
            evidenceHashes=[{"path": path, "sha256": digest(path), "hashMode": "lf"} for path in sorted(supplemental)],
        )
        write("release-manifest.json", manifest)

    lines = [f"# Fresh {policy['releaseId']} commands and exit codes", "", f"Implementation sourceCommit: `{args.source}`. Canonical root: `app/`. Runs use a fresh detached checkout with CI=true and the pinned full Chromium channel. Dependencies and build output started absent; the host pnpm download store may be reused.", "",
             "| Check | Exact command | Exit | Duration (s) | Evidence |", "| --- | --- | ---: | ---: | --- |"]
    for record in records:
        if record["sourceCommit"] != args.source:
            continue
        path = PurePosixPath(record["evidencePath"]).relative_to(DELIVERY)
        lines.append(f"| {record['id']} (attempt {record['attempt']}) | `{subprocess.list2cmdline(record['command'])}` | {record['exitCode']} | {record['durationSeconds']} | [{path}]({path}) |")
    lines += ["", "Discovery and actual execution counts are bound in `evidence/browser-counts.json`; unit/integration counts are recorded in execution records and logs. Build ID, actual browser version/path and tool versions are in `evidence/versions.json`. Raw frame samples, renderer identity, explicit LOW preference, observed tiers and failure diagnostics are in `evidence/performance/active-route-frame-pacing.json`.", "",
              "Fixture configuration is used only for E2E/accessibility. Build and performance commands have no synthetic fixture configuration. File-backed embedded PostgreSQL evidence does not prove hosted PostgreSQL sessions, real Supabase MFA/Storage or mail delivery. Physical devices, screen readers, hosted restore/rollback and production operations remain NOT RUN. Heap/GPU leak absence remains UNKNOWN unless separately measured. Maker evidence does not supply independent delta review, successor acceptance or G7 acceptance.", ""]
    def write_text_file(filename, text_content):
        relative = f"{DELIVERY}/{filename}"
        safe_relative(relative, "release output")
        staged[relative] = text_content.encode("utf-8")

    output_prefix = "" if args.inventory_only else "package-"
    commands_name = output_prefix + "commands-and-exit-codes.md"
    omissions_name = output_prefix + "inventory-omissions.json"
    checksums_name = output_prefix + "SHA256SUMS.txt"
    write_text_file(commands_name, "\n".join(lines) + "\n")
    inventory = []
    omissions = []
    if args.inventory_only:
        final_manifest = existing_manifest
    else:
        final_manifest = json.loads(staged[f"{DELIVERY}/release-manifest.json"].decode("utf-8"))
    for reference in final_manifest.get("evidenceHashes", []):
        evidence_path = reference.get("path")
        if not isinstance(evidence_path, str) or not evidence_path.startswith(DELIVERY + "/"):
            raise RuntimeError("Manifest evidence reference is outside the successor delivery")
        target = safe_repo_path(root, evidence_path)
        present = evidence_path in staged or target.is_file()
        if (not inside(delivery, target) or not present
                or digest_mode(evidence_path, reference.get("hashMode")) != reference.get("sha256")):
            raise RuntimeError(f"Manifest evidence is missing, aliased or changed: {evidence_path}")
    for check in final_manifest.get("requiredChecks", []):
        evidence_path = check.get("evidencePath")
        if not isinstance(evidence_path, str) or not evidence_path.startswith(DELIVERY + "/"):
            raise RuntimeError("Required check evidence reference is outside the successor delivery")
        evidence_target = safe_repo_path(root, evidence_path)
        if check.get("id") == "release-manifest-validation":
            if evidence_target.exists() and (not inside(delivery, evidence_target) or not evidence_target.is_file()):
                raise RuntimeError(f"Detached manifest validation receipt is invalid: {evidence_path}")
            continue
        expected_hash = check.get("evidenceSha256")
        if (not inside(delivery, evidence_target) or not evidence_target.is_file()
                or not isinstance(expected_hash, str)
                or digest_mode(evidence_path, check.get("evidenceHashMode")) != expected_hash):
            raise RuntimeError(f"Required check evidence is missing or changed: {evidence_path}")
    mandatory_evidence = {item["path"] for item in final_manifest["evidenceHashes"]}
    mandatory_evidence.update(item["evidencePath"] for item in final_manifest["requiredChecks"])
    portable_names = set()
    for path in sorted(delivery.rglob("*")):
        name = path.relative_to(root).as_posix()
        checked = safe_repo_path(root, name)
        if checked.is_symlink() or (hasattr(checked, "is_junction") and checked.is_junction()):
            raise RuntimeError(f"Filesystem aliases are forbidden in successor inventory: {name}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise RuntimeError(f"Non-regular file is forbidden in successor inventory: {name}")
        if path.stat().st_nlink > 1:
            raise RuntimeError(f"Hard-linked file is forbidden in successor inventory: {name}")
        portable = name.casefold()
        if portable in portable_names:
            raise RuntimeError(f"Case-alias path is forbidden in portable successor inventory: {name}")
        portable_names.add(portable)
        if path.name in ["SHA256SUMS.txt", "inventory-omissions.json"] or "__pycache__" in path.parts:
            continue
        if path.name == ".last-run.json":
            if name in mandatory_evidence:
                raise RuntimeError("Ephemeral .last-run.json cannot be required portable manifest evidence")
            omissions.append({"path": name, "reason": "Ephemeral Playwright runner state; not required portable evidence."})
            continue
        ignored = subprocess.run(["git", "check-ignore", "-q", "--", name], cwd=root).returncode == 0
        if ignored:
            if name in mandatory_evidence:
                raise RuntimeError(f"Required manifest evidence cannot be omitted from portable inventory: {name}")
            omissions.append({"path": name, "reason": "Git-ignored generated output; excluded from clean-checkout inventory."})
            continue
        inventory.append(f"{digest(name)}  {name}")
    for name in staged:
        portable = name.casefold()
        if portable in portable_names:
            raise RuntimeError(f"Output case-aliases an existing portable inventory path: {name}")
        portable_names.add(portable)
        if name not in {f"{DELIVERY}/SHA256SUMS.txt", f"{DELIVERY}/inventory-omissions.json"}:
            ignored = subprocess.run(["git", "check-ignore", "-q", "--", name], cwd=root).returncode == 0
            if ignored:
                if name in mandatory_evidence:
                    raise RuntimeError(f"Required manifest evidence cannot be omitted from portable inventory: {name}")
                omissions.append({"path": name, "reason": "Git-ignored generated output; excluded from clean-checkout inventory."})
            else:
                inventory.append(f"{digest(name)}  {name}")
    write(omissions_name, {"sourceCommit": args.source, "releaseId": policy["releaseId"], "omittedFiles": omissions,
          "rule": "Required manifest evidence is mandatory; only optional ephemeral/Git-ignored artifacts are omitted from the portable checksum inventory."})
    inventory.append(f"{digest(DELIVERY + '/' + omissions_name)}  {DELIVERY}/{omissions_name}")
    inventory.sort(key=lambda line: line.split("  ", 1)[1])
    write_text_file(checksums_name, "\n".join(inventory) + "\n")

    output_paths = []
    input_keys = inputs.copy()
    for relative in staged:
        target = safe_repo_path(root, relative, output=True)
        if path_key(target) in input_keys:
            raise ValueError(f"Release output collides with an input: {relative}")
        if not target.parent.is_dir():
            raise ValueError(f"Release output parent directory is missing: {relative}")
        output_paths.append((target, staged[relative]))
    # Every destination and input collision is checked before the first write.
    for target, content in output_paths:
        with target.open("xb") as stream:
            stream.write(content)
    print(f"Bound {len(latest)} exact-source command identities; inventoried {len(inventory)} artifacts. LF hashes apply to text; raw hashes to binary artifacts.")


if __name__ == "__main__":
    main()
