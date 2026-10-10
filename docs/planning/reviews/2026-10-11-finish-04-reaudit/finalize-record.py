"""Finalize audit records from saved executions; never modifies maker/app inputs."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
REVISION = "20261010T211756Z-reaudit"
LANES = {
    "FINISH-A1": "deliveries/FINISH-A1/r2",
    "FINISH-B1": "deliveries/FINISH-B1-R2",
    "FINISH-C1": "deliveries/FINISH-C1-R2",
}


def digest(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


platform = ROOT / "deliveries/completion-audits/FINISH-A1/finish-04" / REVISION
platform_summary = read(platform / "unique-test-summary.json")
findings = [
    {"id": "A3-01", "severity": "HIGH", "status": "OPEN", "title": "Patch applicability and exhaustive path ownership fail", "locations": ["source.patch", "source/src/contracts/content.ts", "source/tests/unit/completion-authoring-blocks.test.ts"], "evidence": ["identity-verification.json", "identity-command-receipts.json"]},
    {"id": "A3-02", "severity": "HIGH", "status": "OPEN", "title": "Omitted or mismatched review permits publication", "locations": ["source/src/server/content/publish.ts:219", "source/src/server/content/publish.ts:448", "source/src/app/api/admin/publish/route.ts:52"], "evidence": ["requirement-results.json", "requirement-delta-results.json", "observations-delta.json"]},
    {"id": "A3-03", "severity": "HIGH", "status": "OPEN", "title": "Durable review, canonical hash and complete approved-media byte identity fail", "locations": ["source/src/server/content/preview.ts:97", "source/src/server/content/preview.ts:122", "source/src/server/content/preview.ts:289", "source/src/server/content/publish.ts:448"], "evidence": ["requirement-results.json", "requirement-delta-results.json", "observations.json", "observations-delta.json"]},
    {"id": "A3-04", "severity": "HIGH", "status": "OPEN", "title": "Actual approved picker, save and private image validation are disconnected", "locations": ["source/src/features/admin/project-editor.tsx:53", "source/src/app/api/admin/preview/media/[id]/route.ts:81"], "evidence": ["requirement-results.json", "observations.json"]},
    {"id": "A3-05", "severity": "HIGH", "status": "OPEN", "title": "Private review, truthful authoring, rollback and required execution evidence remain incomplete", "locations": ["source/src/features/admin/project-editor.tsx:164", "source/src/features/portfolio/case-study.tsx:31", "source/src/server/content/preview.ts:10"], "evidence": ["requirement-results.json", "execution-receipts.json", "report.md"]},
]
write(platform / "findings.json", {"advice": "REWORK", "implementationAcceptance": False, "sourceLocationBase": "deliveries/FINISH-A1/r2", "findings": findings, "narrativeProvenance": "Parent compiled from independent reviewer saved source/identity/behavioral results after reviewer usage limit."})
matrix = []
for line in (platform / "report.md").read_text(encoding="utf-8").splitlines():
    if line.startswith("| ") and not line.startswith("| FINISH-04") and not line.startswith("| ---"):
        fields = [x.strip() for x in line.strip("|").split("|")]
        if len(fields) == 4:
            matrix.append(dict(zip(["clause", "requirement", "result", "scope"], fields)))
write(platform / "requirement-matrix.json", matrix)

verification = {"createdAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "makerChecks": {}, "auditOutputChecks": {}, "testCounts": {"platform": {k: platform_summary[k] for k in ["uniqueExecutedCases", "passed", "failed", "overlap"]}}}
runtime = ROOT / "deliveries/completion-audits/FINISH-C1/finish-04" / REVISION
verification["testCounts"]["runtime"] = read(runtime / "diagnostic-summary.json")
for lane, candidate in LANES.items():
    audit = ROOT / "deliveries/completion-audits" / lane / "finish-04" / REVISION
    candidate_root = ROOT / candidate
    checks = []
    for rel, expected in read(candidate_root / "output-hashes.json").items():
        observed = digest(candidate_root / rel)
        if isinstance(expected, str):
            ok = observed["sha256"] == expected
        else:
            ok = observed["sha256"] == expected["sha256"] and observed["bytes"] == expected["bytes"]
        checks.append({"path": rel, "matches": ok})
    verification["makerChecks"][lane] = {"candidate": candidate, "outputManifest": digest(candidate_root / "output-hashes.json"), "count": len(checks), "allMatch": all(row["matches"] for row in checks), "checks": checks}
    provenance = {
        "independentExecution": "Actual gpt-6.1-sol / ultra collaboration assignment; saved tool results, diagnostic sources and raw result files retained.",
        "workerLimit": "Reviewer reached a usage limit after saved diagnostic execution; no continuation or external account invocation is inferred.",
        "parentCompletion": {"FINISH-A1": "Compiled narrative/findings/matrix from independent saved results; verified 24 unique cases and current maker identities.", "FINISH-B1": "Executed the already saved reviewer-authored write-report.py (exit 0) to compile its report/findings/matrix from saved browser/export results; no new asset/browser execution.", "FINISH-C1": "Retained reviewer-authored completed report/findings/matrix and final 29-case results; checked packaging and maker identities."}[lane],
        "implementationWrites": [],
        "implementationAcceptance": False,
        "resultScope": "Refer to report and raw results; mocks/native/browser/physical scopes are not interchangeable.",
    }
    write(audit / "report-provenance.json", provenance)
    # No recursive traversal: all committed audit artifacts are direct files;
    # candidate, scratch and dependency directories remain excluded.
    files = {p.name: digest(p) for p in sorted(audit.iterdir()) if p.is_file() and p.name != "output-hashes.json"}
    write(audit / "output-hashes.json", {"policy": "Raw SHA-256 of direct audit files, including provenance. Excludes self, candidate/scratch/dependency directories. .gitattributes preserves raw bytes.", "files": files})
    checks = [{"path": rel, "matches": digest(audit / rel) == expected} for rel, expected in files.items()]
    verification["auditOutputChecks"][lane] = {"count": len(checks), "allMatch": all(x["matches"] for x in checks), "report": digest(audit / "report.md"), "manifest": digest(audit / "output-hashes.json")}
    if not verification["makerChecks"][lane]["allMatch"]:
        raise RuntimeError("Maker identity drift: " + lane)

canonical = subprocess.run(["git", "diff", "--name-only", "--", "app"], cwd=ROOT, capture_output=True, text=True)
verification["canonicalTrackedApplication"] = {"command": "git diff --name-only -- app", "exitCode": canonical.returncode, "changedPaths": canonical.stdout.splitlines()}
if canonical.returncode or canonical.stdout:
    raise RuntimeError("Canonical application changed")
verification["reportingNote"] = "Living START_HERE/delegation status was updated after audit intake; frozen contract and all maker outputs are unchanged. Input manifests record original observations. This finalization runs no application/browser tests."
write(OUT / "verification.json", verification)
write(OUT / "output-hashes.json", {"policy": "Raw direct evidence files, excludes self; outer living Markdown summary is tracked separately by Git.", "files": {p.name: digest(p) for p in sorted(OUT.iterdir()) if p.is_file() and p.name != "output-hashes.json"}})
print(json.dumps({"makerChecks": {k: {"count": v["count"], "allMatch": v["allMatch"]} for k, v in verification["makerChecks"].items()}, "auditOutputChecks": verification["auditOutputChecks"], "testCounts": verification["testCounts"], "canonicalUnchanged": not canonical.stdout}, indent=2))
