"""Independent read-only source, artifact, inventory and raw benchmark verification."""
from pathlib import Path
import argparse
import datetime
import hashlib
import io
import json
import math
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
ACCEPTED_SOURCE = "c34e01bb5bff210d924f42d5266e2fa1ed13288e"
COORDINATION = "eb1ff201391334d6041b35c59eb350fcd012a79c"


def git(*args, binary=False):
    output = subprocess.check_output(["git", *args], cwd=ROOT)
    return output if binary else output.decode("utf-8").strip()


def digest(data, mode="raw"):
    if mode == "lf":
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("candidate")
    args = parser.parse_args()
    source = git("rev-parse", args.source + "^{commit}")
    candidate = ROOT / args.candidate
    policy = json.loads(git("show", source + ":scripts/release/rc6-policy.json"))
    old_policy = json.loads(git("show", ACCEPTED_SOURCE + ":scripts/release/rc5-policy.json"))
    protected = [
        "deliveries/C4", "deliveries/G6/full-stack-integration", "deliveries/G6/rc4-candidate",
        "deliveries/G6/rc5-candidate", "docs/releases/v1.0.0-rc5.md",
        "docs/planning/reviews/2026-10-06-g6-r1.md", "docs/planning/reviews/2026-10-06-g6-r1",
        "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
        "references", "deliveries/production-environment", "deliveries/interaction-assets",
    ]
    frozen = ["app/public", "app/supabase", "app/src/contracts", "app/src/content",
              "app/src/server/auth", "app/src/server/contact", "app/src/server/jobs",
              "app/src/server/telemetry", "app/src/server/integrations", "app/pnpm-lock.yaml"]
    defects = []
    protected_changes = git("diff", "--name-only", COORDINATION, source, "--", *protected).splitlines()
    frozen_changes = git("diff", "--name-only", ACCEPTED_SOURCE, source, "--", *frozen).splitlines()
    if protected_changes or frozen_changes:
        defects.append("Immutable/frozen paths changed")
    contract_keys = ["assetRevision", "publicationRevision", "schemaRevision", "contactAmendment",
                     "acceptedAssets", "requiredProductionModels", "requiredChecks"]
    contracts = {key: policy[key] == old_policy[key] for key in contract_keys}
    if not all(contracts.values()):
        defects.append("Frozen policy contracts differ")
    changed = git("diff", "--name-only", ACCEPTED_SOURCE, source, "--", "app", "scripts/release", ".github/workflows").splitlines()
    hashes = [{"path": item, "gitBlobSha256": digest(git("show", source + ":" + item, binary=True)),
               "workingLfMatchesSource": digest((ROOT / item).read_bytes(), "lf") == digest(git("show", source + ":" + item, binary=True), "lf")}
              for item in changed]
    inputs = ["START_HERE.md", "AGENTS.md", "docs/planning/delegation-and-work-orders.md",
              "docs/superpowers/specs/2026-09-30-yor-world-design.md",
              "docs/planning/reconciliation-packets/2026-10-06-pre-g7-01.md",
              "docs/planning/reconciliation-packets/2026-10-06-pre-g7-02.md",
              "docs/planning/reconciliation-packets/2026-10-06-pre-g7-03.md",
              "docs/planning/reconciliation-packets/2026-10-07-pre-g7-04.md",
              "docs/operations/pre-g7-prerequisites.md", "docs/releases/v1.0.0-rc6.md"]
    receipt = {
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "reviewer": "Maker-independent local Codex audit worker /root/rc6_r3_independent_audit; GPT-6.1 Sol requested by parent; exact backend/session model identifier not independently attested",
        "executionClass": "Own read-only Git/hash/archive/raw-measurement analysis; maker and hosted test execution reviewed separately",
        "acceptedSource": ACCEPTED_SOURCE, "coordinationBase": COORDINATION,
        "auditedSource": source, "sourceAppTree": git("rev-parse", source + ":app"),
        "observedHead": git("rev-parse", "HEAD"), "candidate": args.candidate,
        "protectedPaths": protected, "changedProtectedPaths": protected_changes,
        "frozenPaths": frozen, "changedFrozenPaths": frozen_changes,
        "contractPreservation": contracts, "sourceHashes": hashes,
        "inputHashes": [{"path": item, "sha256Lf": digest((ROOT / item).read_bytes(), "lf")} for item in inputs],
        "productionServiceChecks": "NOT RUN", "physicalAndManualChecks": "NOT RUN",
        "heapLeakAbsence": "UNKNOWN", "gpuMemoryLeakAbsence": "UNKNOWN",
    }
    manifest = json.loads((candidate / "release-manifest.json").read_text(encoding="utf-8"))
    binding = json.loads((candidate / "source-binding.json").read_text(encoding="utf-8"))
    versions = json.loads((candidate / "evidence/versions.json").read_text(encoding="utf-8"))
    receipt["bindings"] = {"manifestSource": manifest["sourceCommit"], "bindingSource": binding["sourceCommit"],
                           "versionSource": versions["sourceCommit"], "bundleSha256": manifest["releaseBundleSha256"],
                           "buildId": versions.get("buildId"), "browser": versions.get("browser")}
    if any(value != source for value in [manifest["sourceCommit"], binding["sourceCommit"], versions["sourceCommit"]]):
        defects.append("Candidate source identities differ from audited source")
    evidence_checks = []
    for item in manifest["requiredChecks"] + manifest["evidenceHashes"]:
        pathname = item.get("path", item.get("evidencePath"))
        expected = item.get("sha256", item.get("evidenceSha256"))
        if expected:
            passed = digest((ROOT / pathname).read_bytes(), item.get("hashMode", item.get("evidenceHashMode", "raw"))) == expected
            evidence_checks.append({"path": pathname, "matches": passed})
            if not passed:
                defects.append("Evidence hash mismatch: " + pathname)
    receipt["manifestHashChecks"] = evidence_checks
    archive = (ROOT / manifest["releaseBundlePath"]).read_bytes()
    archive_matches = digest(archive) == manifest["releaseBundleSha256"]
    members = []
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
        for member in bundle.getmembers():
            if not member.isfile():
                defects.append("Nonfile archive entry: " + member.name)
                continue
            actual = bundle.extractfile(member).read()
            expected = git("show", source + ":" + member.name, binary=True)
            passed = actual == expected
            members.append({"path": member.name, "bytes": len(actual), "gitBlobMatches": passed})
            if not passed:
                defects.append("Archive Git blob mismatch: " + member.name)
    receipt["archiveVerification"] = {"sha256Matches": archive_matches, "memberCount": len(members),
                                       "archiveBytes": len(archive), "members": members}
    if not archive_matches:
        defects.append("Archive hash mismatch")
    inventory_checks = []
    for line in (candidate / "SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
        expected, pathname = line.split("  ", 1)
        file = ROOT / pathname
        # Inventory tool declares LF for text and raw for binary.
        raw = file.read_bytes() if file.exists() else b""
        text = bool(re.search(r"\.(?:[cm]?[jt]sx?|json|jsonl|ya?ml|md|txt|log|css|html|sql|svg|patch|toml|example)$", pathname)) or file.name in [".gitignore", ".npmrc"]
        mode = "lf" if text else "raw"
        passed = file.exists() and digest(raw, mode) == expected
        inventory_checks.append({"path": pathname, "present": file.exists(), "matches": passed, "hashMode": mode})
        if not passed:
            defects.append("Portable checksum inventory failure: " + pathname)
    receipt["inventoryVerification"] = {"count": len(inventory_checks), "checks": inventory_checks}
    browser_checks = {}
    for bucket, filename in [("e2e", "browser-results.json"), ("accessibility", "browser-results.json"), ("performance", "performance-results.json")]:
        report = json.loads((candidate / "evidence" / bucket / filename).read_text(encoding="utf-8"))
        stats = report["stats"]
        outcomes = []
        def walk(suites):
            for suite in suites:
                for spec in suite.get("specs", []):
                    for case in spec.get("tests", []):
                        outcomes.append({"outcome": case.get("status"), "results": [result["status"] for result in case.get("results", [])]})
                walk(suite.get("suites", []))
        walk(report["suites"])
        valid = stats["expected"] == policy["expectedBrowserChecks"][bucket] and not any(stats[key] for key in ["unexpected", "flaky", "skipped"])
        valid = valid and len(outcomes) == stats["expected"] and all(item["results"] == ["passed"] for item in outcomes)
        browser_checks[bucket] = {"stats": stats, "cases": len(outcomes), "exactlyOnePassEach": valid}
        if not valid:
            defects.append("Browser stats/case result mismatch: " + bucket)
    receipt["inspectedBrowserExecution"] = browser_checks
    raw = json.loads((candidate / "evidence/performance/active-route-frame-pacing.json").read_text(encoding="utf-8"))
    receipt["rawPerformanceKeys"] = list(raw)
    # Keep the independent calculation compatible with the explicit report schema.
    data = raw.get("framePacingData", raw)
    times = sorted(data.get("rawSamples", data.get("frameTimes", [])))
    frames = data.get("rawFrames", [])
    actions = data.get("actions", [])
    if times:
        receipt["recomputedPerformance"] = {
            "durationMs": data["routeDurationMs"], "frameCount": len(frames), "actionCount": len(actions),
            "medianMs": round((times[(len(times)-1)//2] + times[len(times)//2]) / 2, 2), "p95Ms": round(times[math.floor(len(times)*0.95)], 2),
            "minimumRenderCalls": min(frame["renderCalls"] for frame in frames),
            "minimumRenderedTriangles": min(frame["renderedTriangles"] for frame in frames),
            "maximumActionLatencyMs": max(action["latencyMs"] for action in actions),
            "qualityTiers": sorted({frame["qualityTier"] for frame in frames}),
            "requestedUserPreference": data.get("requestedUserPreference"), "failureReason": data.get("failureReason"),
            "rendererIdentity": data.get("rendererIdentity"),
        }
        calculated = receipt["recomputedPerformance"]
        if abs(calculated["medianMs"] - data["medianFrameTimeMs"]) > 0.000001 or abs(calculated["p95Ms"] - data["p95FrameTimeMs"]) > 0.000001:
            defects.append("Recomputed raw percentiles differ from reported measurements")
        if not (calculated["durationMs"] >= 60000 and calculated["actionCount"] == 60
                and calculated["medianMs"] <= 33.3 and calculated["p95Ms"] <= 45
                and calculated["minimumRenderCalls"] > 0 and calculated["minimumRenderedTriangles"] > 0
                and calculated["maximumActionLatencyMs"] <= 900 and calculated["qualityTiers"] == ["low"]
                and calculated["requestedUserPreference"] == "low" and calculated["failureReason"] is None):
            defects.append("Raw LOW benchmark contract failed")
    else:
        defects.append("Raw performance samples missing; inspect schema before drawing conclusion")
    receipt["confirmedBindingDefects"] = defects
    receipt["overallStatus"] = "FAIL" if defects else "PASS"
    (HERE / "audit-bindings.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: value for key, value in receipt.items() if key not in ["sourceHashes", "inputHashes", "manifestHashChecks", "archiveVerification", "inventoryVerification"]}, indent=2))
    if defects:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
