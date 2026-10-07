"""Adversarial isolated ledger ingestion reproduction. No network/provider actions."""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
TOOL = ROOT / "deliveries/G7/preparation/tools/g7-evidence.py"
MANIFEST = ROOT / "deliveries/G7/rc6-candidate/release-manifest.json"


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    spec = importlib.util.spec_from_file_location("inspected_g7_ledger", TOOL)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fixture = HERE / "ledger-probe-fixtures"
    fixture.mkdir(exist_ok=True)
    raw = fixture / "synthetic-artifact.txt"
    raw.write_text("SYNTHETIC AUDIT FIXTURE: no live or manual test was performed.\n", encoding="utf-8")
    artifact = {"path": raw.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(raw.read_bytes()).hexdigest(), "hashMode": "raw"}
    cases = []
    for ident, wrong_source, complete, all_requirements in [
        ("wrong-source-complete-subcriteria", True, True, False),
        ("matching-source-partial-subcriteria", False, False, False),
        ("wrong-source-partial-all-requirements-and-manual", True, False, True),
    ]:
        receipt = {"auditFixture": True, "evidenceCategory": "ACTUAL PHYSICAL OR ASSISTIVE SESSION" if all_requirements else "LIVE PRODUCTION",
                   "sourceCommit": "f" * 40 if wrong_source else manifest["sourceCommit"],
                   "sourceAppTree": "e" * 40, "releaseBundleSha256": "d" * 64, "manifestSha256": "c" * 64,
                   "deploymentId": "synthetic-mismatched-deployment", "targetOrigin": "https://synthetic-mismatched.invalid",
                   "executedAt": "1999-01-01T00:00:00Z", "requirements": []}
        for number, name, criteria in module.CRITERIA if all_requirements else module.CRITERIA[:1]:
            receipt["requirements"].append({"id": number, "name": name, "status": "PASS", "artifactHashes": [artifact],
                "observations": [{"criterion": criterion, "status": "PASS", "method": "SYNTHETIC AUDIT FIXTURE; NOT EXECUTED"}
                                 for criterion in criteria if complete or criterion == criteria[0]]})
        if all_requirements:
            receipt["physicalAndAssistiveSessions"] = [{"id": number, "status": "PASS", "deviceModel": "SYNTHETIC FIXTURE",
                "os": "SYNTHETIC FIXTURE", "browserOrAssistiveToolVersion": "SYNTHETIC FIXTURE", "operator": "NO ACTUAL OPERATOR",
                "startedAt": "1999-01-01T00:00:00Z", "completedAt": "1999-01-01T00:00:01Z", "artifactHashes": [artifact]}
                for number, name, details in module.MANUAL]
        supplied = fixture / (ident + "-receipt.json")
        supplied.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        output = fixture / (ident + "-output.json")
        command = [sys.executable, str(TOOL), "--repository", str(ROOT), "--manifest", str(MANIFEST),
                   "--receipts", str(supplied), "--output", str(output)]
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        observed = json.loads(output.read_text(encoding="utf-8")) if output.exists() else None
        cases.append({"id": ident, "command": command, "exitCode": result.returncode, "stdout": result.stdout, "stderr": result.stderr,
            "expectedSafeBehavior": "Reject mismatched source/bindings or retain NOT RUN for missing mandatory subcriteria",
            "manifestSourceCommit": manifest["sourceCommit"], "receiptSourceCommit": receipt["sourceCommit"],
            "toolOutputSourceCommit": observed.get("sourceCommit") if observed else None,
            "providedSubcriteriaCount": len(receipt["requirements"][0]["observations"]),
            "requiredSubcriteriaCount": len(module.CRITERIA[0][2]),
            "firstRequirementStatus": observed["requirements"][0]["status"] if observed else None,
            "overallStatus": observed.get("overallStatus") if observed else None,
            "acceptanceClaim": observed.get("acceptanceClaim") if observed else None,
            "inputReceiptPath": supplied.relative_to(ROOT).as_posix(), "outputPath": output.relative_to(ROOT).as_posix()})
    finding = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "auditedToolGitCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "toolPath": TOOL.relative_to(ROOT).as_posix(), "toolSha256Lf": hashlib.sha256(TOOL.read_bytes().replace(b"\r\n", b"\n")).hexdigest(),
        "executionClass": "Own adversarial isolated JSON/raw-artifact fixtures; no actual production or manual checks; writes only r2-audit",
        "cases": cases,
        "confirmedDefects": ["PASS receipt identities are not compared with the supplied manifest/ledger identity",
                             "A partial provided subcriterion inventory replaces the full required inventory and marks the requirement PASS",
                             "All ten requirements and six synthetic manual sessions can produce overall PASS despite wrong source and partial criteria"],
        "recommendedSeverity": "P2 evidence integrity/completeness defect in preparation ledger; no direct gate acceptance or bundled-app mutation",
        "acceptanceClaimWasAlwaysFalse": all(item["acceptanceClaim"] is False for item in cases),
        "productionEvidence": "NOT RUN; all payloads are clearly synthetic audit fixtures"}
    (HERE / "g7-ledger-probe.json").write_text(json.dumps(finding, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(finding, indent=2))


if __name__ == "__main__":
    main()
