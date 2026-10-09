"""Bind actually executed successor release evidence; detached receipt avoids circular hashes."""
from __future__ import annotations

import argparse
import hashlib
import json
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
    "deliveries/G7/rc6-independent-delta/r6-audit",
    "deliveries/G7/rc6-independent-delta/gate-advice/final-r6",
    "docs/planning/reviews/2026-10-08-rc6-r1",
    "docs/planning/reviews/2026-10-08-rc6-r1.md",
    "docs/planning/reviews/2026-10-06-g6-r1",
    "docs/planning/reviews/2026-10-06-g6-r1.md",
    "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
    *[f"docs/releases/v1.0.0-rc{number}.md" for number in range(1, 6)],
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--policy", default=DEFAULT_POLICY)
    parser.add_argument("--source", required=True)
    parser.add_argument("--inventory-only", action="store_true")
    args = parser.parse_args()
    root = args.repository.resolve()
    policy = json.loads((root / args.policy).read_text(encoding="utf-8"))
    DELIVERY = policy["deliveryRoot"]
    if (not isinstance(DELIVERY, str) or not DELIVERY or re.search(r'[\\\x00-\x1f:<>"|?*]', DELIVERY)
            or DELIVERY.startswith("/") or any(part in ["", ".", ".."] or part.endswith((".", " "))
            for part in DELIVERY.split("/"))):
        raise ValueError(f"Unsafe delivery root path: {DELIVERY}")
    delivery = root.joinpath(*PurePosixPath(DELIVERY).parts)
    resolved_delivery = delivery.resolve()
    if not resolved_delivery.is_relative_to(root):
        raise ValueError(f"Delivery path escapes repository: {DELIVERY}")
    for reserved in PRESERVED_OUTPUTS:
        protected = root / reserved
        if delivery.is_relative_to(protected) or resolved_delivery.is_relative_to(protected.resolve()):
            raise ValueError(f"Successor inventory cannot rewrite accepted delivery roots: {DELIVERY}")

    def git(*arguments):
        return subprocess.check_output(["git", *arguments], cwd=root, text=True, encoding="utf-8").strip()

    def read(path):
        return json.loads((root / path).read_text(encoding="utf-8"))

    def write(name, data):
        target = delivery / name
        try:
            stat = target.stat()
            if target.is_file() and stat.st_nlink > 1:
                raise ValueError(f"Hard-linked release output is forbidden: {target}")
        except FileNotFoundError:
            pass
        target.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")

    def digest(path):
        content = (root / path).read_bytes()
        if TEXT.search(path) or PurePosixPath(path).name in [".gitignore", ".npmrc"]:
            content = content.replace(b"\r\n", b"\n")
        return hashlib.sha256(content).hexdigest()

    records = [json.loads(line) for line in (delivery / "evidence/execution.jsonl").read_text(encoding="utf-8").splitlines()]
    latest = {record["id"]: record for record in records if record["sourceCommit"] == args.source}
    policy = read(args.policy)
    if not args.inventory_only:
        bundle = read(f"{DELIVERY}/bundle-receipt.json")
        if bundle["sourceCommit"] != args.source or bundle["releaseId"] != policy["releaseId"]:
            raise RuntimeError("Bundle receipt does not bind the exact successor source")
        if digest(bundle["archivePath"]) != bundle["sha256"]:
            raise RuntimeError("Actual archive hash differs from bundle receipt")
        source_tree = git("rev-parse", f"{args.source}:app")
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
            if not path.startswith(DELIVERY + "/") or not (root / path).is_file():
                raise RuntimeError(f"Mandatory successor evidence path is absent or outside delivery: {path}")
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
        target = delivery / filename
        try:
            stat = target.stat()
            if target.is_file() and stat.st_nlink > 1:
                raise ValueError(f"Hard-linked release output is forbidden: {target}")
        except FileNotFoundError:
            pass
        target.write_text(text_content, encoding="utf-8", newline="\n")

    write_text_file("commands-and-exit-codes.md", "\n".join(lines) + "\n")
    inventory = []
    omissions = []
    final_manifest = read(DELIVERY + "/release-manifest.json")
    mandatory_evidence = {item["path"] for item in final_manifest["evidenceHashes"]}
    mandatory_evidence.update(item["evidencePath"] for item in final_manifest["requiredChecks"])
    for path in sorted(delivery.rglob("*")):
        if not path.is_file() or path.name in ["SHA256SUMS.txt", "inventory-omissions.json"] or "__pycache__" in path.parts:
            continue
        name = path.relative_to(root).as_posix()
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
    write("inventory-omissions.json", {"sourceCommit": args.source, "releaseId": policy["releaseId"], "omittedFiles": omissions,
          "rule": "Required manifest evidence is mandatory; only optional ephemeral/Git-ignored artifacts are omitted from the portable checksum inventory."})
    inventory.append(f"{digest(DELIVERY + '/inventory-omissions.json')}  {DELIVERY}/inventory-omissions.json")
    inventory.sort(key=lambda line: line.split("  ", 1)[1])
    write_text_file("SHA256SUMS.txt", "\n".join(inventory) + "\n")
    print(f"Bound {len(latest)} exact-source command identities; inventoried {len(inventory)} artifacts. LF hashes apply to text; raw hashes to binary artifacts.")


if __name__ == "__main__":
    main()
