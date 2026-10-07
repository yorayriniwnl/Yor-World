"""Independent structural ingestion checks. Every fixture is deliberately NOT LIVE."""
from pathlib import Path
import copy
import datetime as dt
import hashlib
import importlib.util
import json
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
TOOL = ROOT / "deliveries/G7/preparation/tools/g7-evidence.py"
spec = importlib.util.spec_from_file_location("independent_g7_ledger", TOOL)
g7 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g7)
NOW = dt.datetime(2026, 10, 7, 12, tzinfo=dt.timezone.utc)
LABEL = "ISOLATED AUDIT STRUCTURAL FIXTURE; NO LIVE RUN, REAL ACCEPTANCE OR PHYSICAL SESSION"
FIXTURE = HERE / "fixtures"
FIXTURE.mkdir(exist_ok=True)


def save(name, data):
    path = FIXTURE / name
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return path


def reference(path):
    return {"path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "hashMode": "raw"}


raw = FIXTURE / "NOT-LIVE-raw.txt"
raw.write_text(LABEL + "\n", encoding="utf-8")
artifact = reference(raw)
candidate = {"releaseId": "v1.0.0-rc6", "sourceCommit": "1" * 40, "sourceAppTree": "2" * 40,
             "releaseBundleSha256": artifact["sha256"]}
source_binding = save("NOT-REAL-source-binding.json", {**candidate, "fixtureLabel": LABEL})
manifest = save("NOT-REAL-manifest.json", {**candidate, "releaseBundlePath": artifact["path"],
               "sourceBinding": reference(source_binding), "fixtureLabel": LABEL})
identity = {**candidate, "manifestSha256": g7.hash_artifact(manifest, "lf"), "deploymentId": "NOT-REAL-audit-deployment",
            "targetOrigin": "https://audit-fixture.example.com", "deployedAt": "2026-10-07T08:00:00Z"}
owner = save("NOT-REAL-owner-reference.json", {"authorizationId": "G7-OWNER-AUTH-20261006", "deploymentAuthorized": True,
    "g7Status": "AUTHORIZED / PREPARATION", "acceptanceClaim": False, "ownerInstruction": LABEL, "date": "2026-10-06"})
successor = save("NOT-REAL-parent-reference.json", {**{key: identity[key] for key in g7.CANDIDATE_IDENTITY},
    "acceptance": "ACCEPTED", "ruling": "RC6 SOURCE ACCEPTED", "rulingId": "RC6-R1", "authority": "Parent Codex",
    "acceptedAt": "2026-10-07T07:00:00Z", "fixtureLabel": LABEL})
binding_data = {**identity, "status": "AUTHORIZED", "ownerAuthorizationReference": reference(owner),
                "acceptedSuccessorReference": reference(successor), "fixtureLabel": LABEL}
binding = save("NOT-REAL-operational-binding.json", binding_data)
execution = {"status": "PASS", "method": LABEL, "measured": {"fixture": "observations supplied"}, "expected": LABEL,
    "startedAt": "2026-10-07T09:01:00Z", "completedAt": "2026-10-07T09:11:00Z", "artifactHashes": [artifact]}
requirement = {"id": 1, "name": "live-domain", "status": "PASS",
    "observations": [{"criterion": criterion, **copy.deepcopy(execution)} for criterion in g7.CRITERIA[0][2]]}
receipt_base = {**identity, "executedAt": "2026-10-07T09:00:00Z", "completedAt": "2026-10-07T10:00:00Z",
    "evidenceCategory": "LIVE PRODUCTION", "requirements": [requirement], "fixtureLabel": LABEL}
session = {"id": "MD-06", "name": g7.MANUAL[-1][1], **copy.deepcopy(execution),
    "evidenceCategory": "ACTUAL PHYSICAL OR ASSISTIVE SESSION", "physicalDevice": True,
    "platform": "Android", "browser": "Chrome", "deviceModel": LABEL, "os": LABEL, "browserOrAssistiveToolVersion": LABEL,
    "operator": LABEL, "viewportDprNetworkCache": LABEL,
    "rawMeasurements": {"batteryStartPercent": 90, "batteryEndPercent": 88, "temperatureStartC": 30,
        "temperatureEndC": 32, "chargerConnected": False, "network": LABEL, "qualityTier": "low", "crashes": 0,
        "recoveryObservations": LABEL,
        "framePacing": [{"elapsedSeconds": value, "frameTimesMs": [16.7, 17.0]} for value in [120, 240, 360, 480, 600]]}}
manual_receipt = {**receipt_base, "requirements": [], "evidenceCategory": "ACTUAL PHYSICAL OR ASSISTIVE SESSION",
                  "physicalAndAssistiveSessions": [session]}
results = []


def run_case(name, receipt, *, reject=None, validate=None, binding_override=None):
    input_path = save(name + "-NOT-LIVE-input.json", receipt)
    actual_binding = binding if binding_override is None else save(name + "-NOT-REAL-binding.json", binding_override)
    try:
        ledger = g7.build_ledger(ROOT, manifest, actual_binding, [input_path], now=NOW)
    except (ValueError, TypeError) as error:
        results.append({"name": name, "observed": "REJECTED", "reason": str(error),
                        "pass": reject is not None and reject in str(error)})
    else:
        save(name + "-NOT-LIVE-output.json", ledger)
        results.append({"name": name, "observed": "STRUCTURALLY ACCEPTED", "overallStatus": ledger["overallStatus"],
            "requirement1": ledger["requirements"][0]["status"], "criterionCount": len(ledger["requirements"][0]["observations"]),
            "manualThermal": ledger["physicalAndAssistiveSessions"][-1]["status"], "acceptanceClaim": ledger["acceptanceClaim"],
            "validationScope": ledger["validationScope"], "pass": reject is None and (validate(ledger) if validate else True)})


def unchanged_limits(ledger):
    return ledger["acceptanceClaim"] is False and ledger["independentReview"] == "NOT RUN" and ledger["heapGpuLeakAbsence"] == "UNKNOWN"


run_case("complete-structural-domain", copy.deepcopy(receipt_base), validate=lambda d: d["requirements"][0]["status"] == "PASS" and d["overallStatus"] == "NOT RUN" and unchanged_limits(d))
for key in g7.IDENTITY:
    altered = copy.deepcopy(receipt_base)
    altered[key] = "wrong-identity"
    run_case("mismatch-" + key, altered, reject="Receipt identity mismatch: " + key)
partial = copy.deepcopy(receipt_base)
partial["requirements"][0]["observations"] = partial["requirements"][0]["observations"][:1]
run_case("partial-cannot-claim-pass", copy.deepcopy(partial), reject="exact complete")
partial["requirements"][0]["status"] = "NOT RUN"
run_case("partial-preserves-missing", partial, validate=lambda d: len(d["requirements"][0]["observations"]) == 4 and [r["status"] for r in d["requirements"][0]["observations"]] == ["PASS", "NOT RUN", "NOT RUN", "NOT RUN"] and d["requirements"][0]["status"] == "NOT RUN")
altered = copy.deepcopy(receipt_base)
altered["evidenceCategory"] = "HTTP ONLY"
run_case("http-only-cannot-promote", altered, reject="Surrogate/HTTP/browser-only")
altered = copy.deepcopy(receipt_base)
altered["requirements"][0]["observations"].append(copy.deepcopy(altered["requirements"][0]["observations"][0]))
run_case("duplicate-criterion", altered, reject="Unknown/duplicate subcriterion")
run_case("thermal-600-structural", copy.deepcopy(manual_receipt), validate=lambda d: d["physicalAndAssistiveSessions"][-1]["status"] == "PASS" and d["overallStatus"] == "NOT RUN" and unchanged_limits(d))
altered = copy.deepcopy(manual_receipt)
altered["physicalAndAssistiveSessions"][0]["completedAt"] = "2026-10-07T09:10:59Z"
run_case("thermal-599-rejected", altered, reject="600 seconds")
altered = copy.deepcopy(manual_receipt)
altered["physicalAndAssistiveSessions"][0]["rawMeasurements"]["framePacing"].pop(3)
run_case("thermal-missing-interval", altered, reject="2/4/6/8/10-minute")
altered = copy.deepcopy(manual_receipt)
altered["physicalAndAssistiveSessions"][0]["physicalDevice"] = False
run_case("emulated-thermal-rejected", altered, reject="physical-device")
altered = copy.deepcopy(manual_receipt)
altered["physicalAndAssistiveSessions"][0]["status"] = "FAIL"
altered["physicalAndAssistiveSessions"][0]["completedAt"] = "2026-10-07T09:10:59Z"
run_case("actual-failed-short-session-retained", altered, validate=lambda d: d["overallStatus"] == "FAIL" and unchanged_limits(d))
altered = copy.deepcopy(receipt_base)
altered["executedAt"] = "1999-01-01T00:00:00Z"
run_case("predeployment-receipt-rejected", altered, reject="follow deployment")
bad_binding = copy.deepcopy(binding_data)
bad_binding["sourceCommit"] = "f" * 40
run_case("operational-binding-conflict", copy.deepcopy(receipt_base), binding_override=bad_binding, reject="Operational candidate mismatch")

for input_path in (HERE.parent / "ledger-probe-fixtures").glob("*-receipt.json"):
    try:
        g7.build_ledger(ROOT, manifest, None, [input_path], now=NOW)
    except ValueError as error:
        results.append({"name": "original-attack-" + input_path.stem, "observed": "REJECTED", "reason": str(error),
                       "pass": "separate operational binding" in str(error)})
    else:
        results.append({"name": "original-attack-" + input_path.stem, "observed": "UNEXPECTED ACCEPTANCE", "pass": False})
receipt = {"createdAt": dt.datetime.now(dt.timezone.utc).isoformat(), "toolPath": TOOL.relative_to(ROOT).as_posix(),
    "toolSha256Lf": hashlib.sha256(TOOL.read_bytes().replace(b"\r\n", b"\n")).hexdigest(),
    "executionClass": "Own isolated structural fixtures only; no actual authority, deployment, service or physical verification",
    "cases": results, "allChecksPassed": all(item["pass"] for item in results),
    "productionServices": "NOT RUN", "manualPhysicalSessions": "NOT RUN"}
(HERE / "independent-probe.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, indent=2))
if not receipt["allChecksPassed"]:
    raise SystemExit(1)
