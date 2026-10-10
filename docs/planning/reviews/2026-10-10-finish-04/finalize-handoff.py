"""Record Parent design ruling after real same-manifest reviews; no implementation acceptance."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CONTRACTS = "docs/planning/reconciliation-packets/finish-contracts-r2"
OUTPUT = "8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af"
INPUT = "516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
AUDIT = "deliveries/completion-audits/FINISH-00-R2/independent/r2"
ARCH = "deliveries/completion-audits/FINISH-00-R2/architecture/r3"


def read(rel: str) -> dict:
    return json.loads((ROOT / rel).read_text(encoding="utf-8-sig"))


def record(rel: str) -> dict:
    data = (ROOT / rel).read_bytes()
    return {"path": rel, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def write(rel: str, value: object) -> None:
    target = ROOT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


if record(f"{CONTRACTS}/output-hashes.json")["sha256"] != OUTPUT or record(f"{CONTRACTS}/input-hashes.json")["sha256"] != INPUT:
    raise ValueError("Contract changed from reviewed manifest")
advice = read(f"{AUDIT}/audit.json")
architecture = read(f"{ARCH}/review.json")
# Different reviewer schemas are preserved; require actual PASS and exact input identity.
for item in [advice, architecture]:
    serialized = json.dumps(item)
    if OUTPUT not in serialized or INPUT not in serialized:
        raise ValueError("Review does not bind both exact manifests")
    actual_advice = item.get("advice", item.get("verdict", item.get("recommendation")))
    if not isinstance(actual_advice, str) or not actual_advice.startswith("PASS"):
        raise ValueError(f"Independent advice is not PASS: {actual_advice}")

decision_root = "docs/planning/reviews/2026-10-10-finish-00-r2"
if (ROOT / decision_root).exists():
    raise ValueError("Parent ruling root already exists; preserve it and issue a new revision")
reviews = [record(f"{AUDIT}/{name}") for name in ["report.md", "audit.json", "output-hashes.json"]]
reviews += [record(f"{ARCH}/{name}") for name in ["report.md", "review.json", "output-hashes.json"]]
write(f"{decision_root}/decision.json", {
    "rulingId": "FINISH-00-R2", "date": "2026-10-10", "ruling": "ACCEPTED DESIGN",
    "authority": "Parent GPT #1 architectural and acceptance lane",
    "scope": "Frozen successor contracts, exact ownership and first correction handoffs only",
    "acceptedContractOutputManifestSha256": OUTPUT, "acceptedContractInputManifestSha256": INPUT,
    "contractRoot": CONTRACTS, "baseCommit": BASE, "sourceAppTree": APP_TREE,
    "independentAdvice": "PASS", "independentInvocation": "gpt-6.1-sol / ultra",
    "architectureAdvice": "PASS", "architectureInvocation": "gpt-6-astra / high",
    "modelProvenance": "Actual collaboration invocation assignments; no serving-infrastructure introspection claimed",
    "reviewBindings": reviews,
    "closedAtDesignScope": ["GOV-01", "GOV-02", "GOV-03", "GOV-04", "GOV-05", "GOV-06", "GOV-07", "GOV-08", "R2-AUD-01", "R2-AUD-02", "R2-AUD-03", "R2-AUD-04", "AR2-01", "PLAT-R2-01", "PLAT-R2-C01"],
    "historicalRulingsAndRejectedProofPreserved": True,
    "parentContinuationPacket": "docs/planning/reconciliation-packets/2026-10-10-finish-04.md",
    "implementationAcceptance": False, "canonicalIntegration": False,
    "deploymentAcceptance": False, "g7Acceptance": False,
    "remaining": ["Three correction deliveries with complete-scope independent audit and separate Parent implementation rulings",
                  "Accepted A1/A2/B1/C1/C2/C3 dependencies and later I1 integration/source ruling",
                  "Actual G7 service/deployment/recovery/device/manual proof and separate acceptance",
                  "EXT-01 through EXT-06 and cumulative final source/live audit"],
})
(ROOT / decision_root / ".gitattributes").write_text("* text=auto eol=lf\n", encoding="utf-8", newline="\n")
ruling = ROOT / "docs/planning/reviews/2026-10-10-finish-00-r2.md"
ruling.write_text(f"""# FINISH-00-R2 Parent ruling: ACCEPTED DESIGN

Date: 2026-10-10. Parent accepts the exact successor contract design and ownership, after actual independent Sol ultra PASS and Astra architecture/r3 PASS on the same final manifest. This ruling accepts design only. Maker implementations, integration, deployment and G7 remain unaccepted.

Frozen [contract output manifest](../reconciliation-packets/finish-contracts-r2/output-hashes.json): `{OUTPUT}`. [Input manifest](../reconciliation-packets/finish-contracts-r2/input-hashes.json): `{INPUT}`. Maker source base `{BASE}`, canonical app tree `{APP_TREE}`. The [machine-readable decision](2026-10-10-finish-00-r2/decision.json) binds exact raw report/advice/manifest hashes.

The [independent delta report](../../../{AUDIT}/report.md) and [actual Astra r3 report](../../../{ARCH}/report.md) support this design ruling. Earlier initial REWORK, architecture/r2 limited PASS and the separate media-identity REWORK remain preserved. Their findings led to the final reviewed delta; no prior report is rewritten or presented as broader implementation proof.

The accepted amendment binds the actual sixteen-table schema/recovery/jobs, exact runtime ownership/progress/pause/resource contracts, conforming art bindings/transforms/clips, compatible site writes and explicit dependency/seam ownership. PLAT-R2-01 now binds the complete server-derived media object/bytes/metadata and existing approval-audit identity into reviewed content, rederived under locks before writes; required transaction/Storage/browser regressions remain maker work. All 146 original raw input identities are preserved, with 146 base-blob identities and exact hash-proved EOL snapshots for portable reproduction.

Fresh bounded design verification passed 200 raw identities, 146 base Git blobs, 134 ownership rows, 24 local links, three migrations and sixteen public tables. Architectural hash-sensitivity fixtures support the corrected specification; application/native SQL/Storage/browser/device/live tests were not executed by this contract review. Historical accepted RC5/G6-R1 and RC6-R1 source remain immutable.

[FINISH-04](../reconciliation-packets/2026-10-10-finish-04.md) now issues three fresh Gemini correction roots and a complete-scope independent audit handoff. Received A1/r2, B1-R2 and C1-R2 arrived before this formal design ruling and are preserved without retroactive acceptance. Their prior advice does not close the actual source/evidence gaps in the Parent readiness record. Each maker corrects its lane, the auditor verifies without fixing, and Parent makes a separate implementation ruling before dependent work.
""", encoding="utf-8", newline="\n")

status_rel = "docs/planning/current-status.json"
status = read(status_rel)
program = status["completionProgram"]
program["status"] = "R2 DESIGN ACCEPTED / THREE CORRECTIONS ISSUED / IMPLEMENTATIONS UNACCEPTED"
program["successorContractsGate"] = {
    "packetId": "FINISH-00-R2", "status": "ACCEPTED DESIGN / FROZEN",
    "rulingPath": "docs/planning/reviews/2026-10-10-finish-00-r2.md",
    "rulingDecisionPath": f"{decision_root}/decision.json", "outputManifestSha256": OUTPUT,
    "independentAuditReport": f"{AUDIT}/report.md", "independentAdvice": "PASS",
    "architectureReport": f"{ARCH}/report.md", "implementationAcceptance": False,
}
packets = program["activeMakerPackets"]
platform = packets["FINISH-A1"]
platform["priorObservedIssuanceState"] = platform.copy()
platform.update({"status": "R2 RECEIVED / PARENT REWORK / R3 ISSUED", "deliveryRoot": "deliveries/FINISH-A1/r2/",
                 "makerExecution": "RECEIVED FILES; EXTERNAL SESSION CONTROL UNAVAILABLE HERE",
                 "independentAuditReport": "deliveries/completion-audits/FINISH-A1/r2/report.md",
                 "independentAdvice": "REWORK; prior narrow lint finding preserved",
                 "parentImplementationAcceptance": "NOT ACCEPTED", "canonicalIntegration": False})
for packet, lane, delivery, report in [
    ("FINISH-B1-R2", "Gemini #2", "deliveries/FINISH-B1-R2/", "deliveries/completion-audits/FINISH-B1/2026-10-10-r2/report.md"),
    ("FINISH-C1-R2", "Gemini #3", "deliveries/FINISH-C1-R2/", "deliveries/completion-audits/FINISH-C1/2026-10-10-r2/report.md")]:
    packets[packet] = {"maker": lane, "status": "RECEIVED / PRIOR PASS ADVICE / PARENT REWORK / R3 ISSUED",
                       "deliveryRoot": delivery, "independentAuditReport": report,
                       "independentAdvice": "PASS advice for recorded scope; complete-scope supplement required",
                       "parentImplementationAcceptance": "NOT ACCEPTED", "canonicalIntegration": False}
for packet, lane, delivery, filename in [
    ("FINISH-A1-R3", "Gemini #1", "deliveries/FINISH-A1/r3/", "01-GEMINI1-A1-R3.md"),
    ("FINISH-B1-R3", "Gemini #2", "deliveries/FINISH-B1-R3/", "02-GEMINI2-B1-R3.md"),
    ("FINISH-C1-R3", "Gemini #3", "deliveries/FINISH-C1-R3/", "03-GEMINI3-C1-R3.md")]:
    packets[packet] = {"maker": lane, "status": "ISSUED / NO RETURN RECORDED", "deliveryRoot": delivery,
                       "promptPath": f"docs/planning/production-prompts/corrections-2026-10-10/{filename}",
                       "baseCommit": BASE, "sourceAppTree": APP_TREE, "makerExecution": "UNCONFIRMED",
                       "parentImplementationAcceptance": "NOT RECORDED", "canonicalIntegration": False}
program["latestParentContinuation"] = {"packetId": "FINISH-04", "path": "docs/planning/reconciliation-packets/2026-10-10-finish-04.md",
                                       "readinessPath": "docs/planning/reviews/2026-10-10-finish-04/readiness.md",
                                       "canonicalSourceChanged": False, "productionFixesIntegrated": False}
write(status_rel, status)
print("Recorded same-manifest Parent design acceptance, current received state and three fresh correction handoffs.")
