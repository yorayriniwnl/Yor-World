"""Bind actually executed RC5 evidence; detached receipt avoids circular hashes."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

BASE = "8d9a8ac11eb748261f9c2ae6b59a5d9f66f3d4c4"
RC4_SOURCE = "74954fbd963537a852c1899820da14bff6bd2615"
RC4_TREE = "bdc75f27d7462bae708cf3ba2aaec3e42937157c"
RC4_BUNDLE = "8d841ce6ec4ecdc9ee3af16ac265b3aca93f25979d7952fac3d47b608f4e721a"
DELIVERY = "deliveries/G6/rc5-candidate"
TEXT = re.compile(r"\.(?:[cm]?[jt]sx?|json|jsonl|ya?ml|md|txt|log|css|html|sql|svg|patch|toml|example)$")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--source", required=True)
    parser.add_argument("--inventory-only", action="store_true")
    args = parser.parse_args()
    root = args.repository.resolve()
    delivery = root / DELIVERY

    def git(*arguments):
        return subprocess.check_output(["git", *arguments], cwd=root, text=True, encoding="utf-8").strip()

    def read(path):
        return json.loads((root / path).read_text(encoding="utf-8"))

    def write(name, data):
        (delivery / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")

    def digest(path):
        content = (root / path).read_bytes()
        if TEXT.search(path) or PurePosixPath(path).name in [".gitignore", ".npmrc"]:
            content = content.replace(b"\r\n", b"\n")
        return hashlib.sha256(content).hexdigest()

    records = [json.loads(line) for line in (delivery / "evidence/execution.jsonl").read_text(encoding="utf-8").splitlines()]
    latest = {record["id"]: record for record in records if record["sourceCommit"] == args.source}
    policy = read("scripts/release/rc5-policy.json")
    if not args.inventory_only:
        bundle = read(f"{DELIVERY}/bundle-receipt.json")
        if bundle["sourceCommit"] != args.source or bundle["releaseId"] != policy["releaseId"]:
            raise RuntimeError("Bundle receipt does not bind the exact RC5 source")
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
            supersedes={"releaseId": "v1.0.0-rc4", "sourceCommit": RC4_SOURCE, "sourceAppTree": RC4_TREE,
                        "releaseBundleSha256": RC4_BUNDLE, "disposition": "Historical immutable candidate; local PASS; GitHub release gate FAIL from active benchmark contract mismatch."},
            changedPathsFromBase=git("diff", "--name-only", BASE, args.source).splitlines(),
            protectedHistory={"path": f"{DELIVERY}/evidence/historical-immutability.json", "sha256": digest(f"{DELIVERY}/evidence/historical-immutability.json"), "hashMode": "lf"},
            limits="Maker source binding only; no independent audit, G6 acceptance, deployment or G7 authority.",
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
        supplemental = {f"{DELIVERY}/{path}" for path in policy.get("requiredEvidencePaths", [])}
        supplemental.update(f"{DELIVERY}/{name}" for name in ["source-binding.json", "asset-validation.json",
                            "evidence/versions.json", "evidence/session.json", "evidence/historical-immutability.json",
                            "evidence/browser-counts.json", "evidence/e2e-discovery.json", "evidence/accessibility-discovery.json",
                            "evidence/performance-discovery.json", "evidence/e2e/browser-results.json",
                            "evidence/accessibility/browser-results.json", "evidence/performance/performance-results.json"])
        supplemental.update(path.relative_to(root).as_posix() for path in (delivery / "evidence/performance").glob("*.json"))
        for path in supplemental:
            if not path.startswith(DELIVERY + "/") or not (root / path).is_file():
                raise RuntimeError(f"Mandatory RC5 evidence path is absent or outside delivery: {path}")
        manifest = {key: policy[key] for key in fields}
        manifest.update(
            sourceCommit=args.source, gitCommit=args.source, sourceAppTree=source_tree,
            releaseBundlePath=bundle["archivePath"], releaseBundleSha256=bundle["sha256"],
            bundleMetadata={"fileCount": bundle["fileCount"], "bytes": bundle["bytes"]},
            sourceBinding={"path": f"{DELIVERY}/source-binding.json", "sha256": digest(f"{DELIVERY}/source-binding.json"), "hashMode": "lf"},
            governance={"status": "candidate", "selfApproved": False, "g6Status": "ACTIVE / REWORK", "g7Status": "LOCKED"},
            composition={"path": f"{DELIVERY}/release-composition.json", "sha256": digest(f"{DELIVERY}/release-composition.json"), "hashMode": "lf"},
            requiredChecks=checks,
            evidenceHashes=[{"path": path, "sha256": digest(path), "hashMode": "lf"} for path in sorted(supplemental)],
        )
        write("release-manifest.json", manifest)

    lines = ["# Fresh RC5 commands and exit codes", "", f"Implementation sourceCommit: `{args.source}`. Canonical root: `app/`. Runs use a fresh detached checkout with CI=true and the pinned full Chromium channel. Dependencies and build output started absent; the host pnpm download store may be reused.", "",
             "| Check | Exact command | Exit | Duration (s) | Evidence |", "| --- | --- | ---: | ---: | --- |"]
    for record in records:
        if record["sourceCommit"] != args.source:
            continue
        path = PurePosixPath(record["evidencePath"]).relative_to(DELIVERY)
        lines.append(f"| {record['id']} (attempt {record['attempt']}) | `{subprocess.list2cmdline(record['command'])}` | {record['exitCode']} | {record['durationSeconds']} | [{path}]({path}) |")
    lines += ["", "Discovery and actual execution counts are bound in `evidence/browser-counts.json`; unit/integration counts are recorded in execution records and logs. Build ID, actual browser version/path and tool versions are in `evidence/versions.json`. Raw frame samples, renderer identity, explicit LOW preference, observed tiers and failure diagnostics are in `evidence/performance/active-route-frame-pacing.json`.", "",
              "Fixture configuration is used only for E2E/accessibility. Build and performance commands have no synthetic fixture configuration. File-backed embedded PostgreSQL evidence does not prove hosted PostgreSQL sessions, real Supabase MFA/Storage or mail delivery. Physical devices, screen readers, hosted restore/rollback and production operations remain NOT RUN. Maker evidence is not an independent audit or G6 acceptance; G7 remains LOCKED.", ""]
    (delivery / "commands-and-exit-codes.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    inventory = []
    for path in sorted(delivery.rglob("*")):
        if not path.is_file() or path.name == "SHA256SUMS.txt" or "__pycache__" in path.parts:
            continue
        name = path.relative_to(root).as_posix()
        inventory.append(f"{digest(name)}  {name}")
    (delivery / "SHA256SUMS.txt").write_text("\n".join(inventory) + "\n", encoding="utf-8", newline="\n")
    print(f"Bound {len(latest)} exact-source command identities; inventoried {len(inventory)} artifacts. LF hashes apply to text; raw hashes to binary artifacts.")


if __name__ == "__main__":
    main()
