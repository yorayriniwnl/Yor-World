"""Initialize honest G7 receipts or summarize supplied evidence; no live actions."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import ipaddress
import math
import re
from urllib.parse import urlsplit
from pathlib import Path

CRITERIA = [
    (1, "live-domain", ["DNS resolution", "Valid TLS certificate", "HTTP to HTTPS 301/308 redirect", "Canonical origin/headers"]),
    (2, "fresh-smoke", ["Postdeployment source/deployment identity", "Fresh critical paths", "No uncaught client exception", "Initial measured performance baseline"]),
    (3, "public-routes", ["Direct public/project entry", "Hard refresh", "Client transitions", "Back/Forward", "CandidateX 404 and absent launcher"]),
    (4, "world-entry", ["On-demand asset readiness/loading progress", "Entrance <=8000 ms", "Skip to settled HOME <=50 ms", "Avatar acknowledgment", "Camera/DOM interaction parity"]),
    (5, "fallback", ["Complete HTML with JavaScript disabled", "WebGL unavailable fallback", "Context-loss recovery", "Mobile dialog/navigation recovery", "Keyboard/reduced-motion usability"]),
    (6, "contact-behavior", ["Approved synthetic submission/sanitization", "Honeypot/body-size denial", "HTTP 429 burst limit", "Atomic native DB/outbox/receipt persistence", "R2 replay/conflict/concurrency", "Real provider delivery/retry/deduplication", "Zero PII in actual logs/telemetry"]),
    (7, "production-configuration", ["Production env names/secret isolation; fixtures disabled", "Actual security/CSP/HSTS/CORS headers", "Three schema-v2 migrations then operational DCL", "15 public tables and private github_refresh_state privileges/RLS", "Native independent-session denial/concurrency", "Owner AAL2/TOTP/revocation", "Private Storage access", "Internal authenticated jobs/GitHub cadence"]),
    (8, "asset-loading", ["Every live asset SHA-256 matches frozen manifest", "Actual CDN statuses/cache policy", "Text/JSON compression", "Binary byte-range HTTP 206", "Desktop essential encoded transfer <=6 MiB", "Mobile essential encoded transfer <=3 MiB"]),
    (9, "monitoring", ["Actual backend-ready /api/health 200", "Process liveness separately classified", "Error logging tested", "External uptime probe operational", "Actual zero-PII retention controls"]),
    (10, "rollback-readiness", ["Pinned previous immutable deployment", "Current schema backward compatibility", "Actual safe rollback rehearsal", "Postrollback smoke", "Measured RTO <=300 seconds", "RPO=0 evidenced by preserved receipts/data", "Hosted DB/Auth/blob backup and restore"]),
]
MANUAL = [
    ("MD-01", "Physical iPhone/iPad Safari", "Actual device/OS/browser; portrait/landscape, touch/reflow, five cold loads, background/resume, context loss."),
    ("MD-02", "Physical Android Chrome", "Actual mid-range device/OS/browser; portrait/landscape, touch/reflow and world fallback/recovery."),
    ("MD-03", "Actual NVDA", "Recorded Windows browser, operator and listening/keyboard observations; focus/labels/errors/announcements."),
    ("MD-04", "Actual VoiceOver", "Actual Safari/macOS or iOS device; listening/rotor/gesture observations."),
    ("MD-05", "Actual TalkBack", "Actual Android device/browser; gestures, speech and focus/error recovery."),
    ("MD-06", "600-second physical mobile thermal session", "Actual battery/temperature/charger/network/tier; raw pacing at 2/4/6/8/10 minutes; crashes/recovery."),
]

IDENTITY = ("releaseId", "sourceCommit", "sourceAppTree", "releaseBundleSha256", "manifestSha256",
            "deploymentId", "targetOrigin", "deployedAt")
CANDIDATE_IDENTITY = IDENTITY[:5]
STATUSES = ("PASS", "FAIL", "NOT RUN")
MANUAL_MEASUREMENTS = {
    "MD-01": ("portrait", "landscape", "touchReflow", "coldLoads", "backgroundResume", "contextLoss"),
    "MD-02": ("portrait", "landscape", "touchReflow", "fallbackRecovery"),
    "MD-03": ("listening", "keyboard", "focus", "labels", "errors", "announcements"),
    "MD-04": ("listening", "rotor", "gestures"),
    "MD-05": ("gestures", "speech", "focus", "errorRecovery"),
    "MD-06": ("batteryStartPercent", "batteryEndPercent", "temperatureStartC", "temperatureEndC",
              "chargerConnected", "network", "qualityTier", "framePacing", "crashes", "recoveryObservations"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def actual(value):
    """Presence check only: this cannot authenticate an operator's factual claims."""
    if isinstance(value, str):
        return bool(value.strip()) and value.strip().upper() not in {"NOT RUN", "UNKNOWN", "NOT ASSIGNED", "N/A"}
    if isinstance(value, (dict, list)):
        return bool(value) and all(actual(v) for v in (value.values() if isinstance(value, dict) else value))
    return value is not None


def load_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f"Duplicate JSON key: {key}")
            result[key] = value
        return result
    result = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique,
                        parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"Nonfinite JSON number: {value}")))
    require(isinstance(result, dict), f"Expected JSON object: {path}")
    return result


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def hash_artifact(path, mode):
    require(mode in ("raw", "lf"), "Hash mode must be raw or lf")
    content = path.read_bytes()
    return hashlib.sha256(content.replace(b"\r\n", b"\n") if mode == "lf" else content).hexdigest()


def workspace_file(root, path):
    require(isinstance(path, str) and bool(path), "Artifact path must be supplied")
    filename = (root / path).resolve()
    require(filename.is_relative_to(root) and filename.is_file(), "Artifact missing or outside repository")
    return filename


def verify_artifact(root, artifact):
    require(isinstance(artifact, dict), "Artifact must be a path/hash object")
    mode = artifact.get("hashMode", "raw")
    require(isinstance(artifact.get("sha256"), str) and re.fullmatch(r"[0-9a-f]{64}", artifact["sha256"]), "Invalid artifact SHA-256")
    filename = workspace_file(root, artifact.get("path"))
    require(hash_artifact(filename, mode) == artifact["sha256"], "Artifact SHA-256 mismatch")
    return filename


def artifacts(root, values):
    require(isinstance(values, list) and bool(values), "Each executed criterion/session needs hash-verified artifacts")
    seen = set()
    for value in values:
        filename = verify_artifact(root, value)
        require(filename not in seen, "Duplicate artifact in evidence inventory")
        seen.add(filename)


def timestamp(value, now):
    require(isinstance(value, str) and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})", value)),
            "Timestamp must be ISO 8601 with timezone")
    result = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    require(result <= now, "Future timestamp rejected")
    return result


def validate_manifest(root, path):
    require(path.resolve().is_relative_to(root), "Manifest must be inside repository")
    manifest = load_json(path)
    for key in CANDIDATE_IDENTITY[:4]:
        require(actual(manifest.get(key)), f"Manifest missing {key}")
    require(isinstance(manifest["releaseId"], str), "Manifest releaseId must be a string")
    for key, size in (("sourceCommit", 40), ("sourceAppTree", 40), ("releaseBundleSha256", 64)):
        require(isinstance(manifest[key], str) and bool(re.fullmatch(f"[0-9a-f]{{{size}}}", manifest[key])), f"Invalid manifest {key}")
    if "gitCommit" in manifest:
        require(manifest["gitCommit"] == manifest["sourceCommit"], "Conflicting manifest gitCommit")
    verify_artifact(root, {"path": manifest.get("releaseBundlePath"), "sha256": manifest["releaseBundleSha256"], "hashMode": "raw"})
    source = load_json(verify_artifact(root, manifest.get("sourceBinding")))
    for key in CANDIDATE_IDENTITY[:4]:
        require(source.get(key) == manifest[key], f"Manifest/source binding mismatch: {key}")
    return {**{key: manifest[key] for key in CANDIDATE_IDENTITY[:4]}, "manifestSha256": hash_artifact(path, "lf")}


def validate_binding(root, path, identity, now):
    require(path.resolve().is_relative_to(root), "Operational binding must be inside repository")
    binding = load_json(path)
    require(binding.get("status") == "AUTHORIZED", "Operational binding must be AUTHORIZED")
    for key in CANDIDATE_IDENTITY:
        require(binding.get(key) == identity[key], f"Operational candidate mismatch: {key}")
    require(isinstance(binding.get("deploymentId"), str) and actual(binding["deploymentId"]), "Actual deploymentId required")
    origin = binding.get("targetOrigin")
    require(isinstance(origin, str), "Actual targetOrigin required")
    parsed = urlsplit(origin)
    require(parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password
            and parsed.path == "" and not parsed.query and not parsed.fragment and parsed.netloc == parsed.netloc.lower(),
            "Use a canonical public HTTPS origin without path, credentials, query or fragment")
    require(parsed.port != 443, "Canonical origin must omit the default HTTPS port")
    require(parsed.hostname != "localhost" and not parsed.hostname.endswith((".localhost", ".local", ".invalid")), "Public target origin required")
    try:
        address = ipaddress.ip_address(parsed.hostname)
    except ValueError:
        address = None
    require(address is None or address.is_global, "Public target origin required")
    deployed = timestamp(binding.get("deployedAt"), now)
    owner = load_json(verify_artifact(root, binding.get("ownerAuthorizationReference")))
    require(owner.get("authorizationId") == "G7-OWNER-AUTH-20261006" and owner.get("deploymentAuthorized") is True
            and owner.get("g7Status") == "AUTHORIZED / PREPARATION" and owner.get("acceptanceClaim") is False
            and actual(owner.get("ownerInstruction")),
            "Reference does not record the actual continuing owner authorization")
    require(dt.date.fromisoformat(owner["date"]) <= deployed.date(), "Deployment precedes owner authorization")
    successor = load_json(verify_artifact(root, binding.get("acceptedSuccessorReference")))
    require(successor.get("acceptance") == "ACCEPTED" and successor.get("ruling") == "RC6 SOURCE ACCEPTED"
            and successor.get("authority") == "Parent Codex" and successor.get("rulingId") == "RC6-R1",
            "Reference must be a Parent accepted-successor decision")
    require(timestamp(successor.get("acceptedAt"), now) <= deployed, "Deployment precedes successor acceptance")
    for key in CANDIDATE_IDENTITY:
        require(successor.get(key) == identity[key], f"Accepted successor mismatch: {key}")
    return {key: binding[key] for key in IDENTITY}, binding


def execution_window(item, earliest, latest, now):
    started = timestamp(item.get("startedAt"), now)
    completed = timestamp(item.get("completedAt"), now)
    require(earliest <= started <= completed <= latest, "Executed evidence timestamps conflict with receipt/deployment window")
    return started, completed


def validate_execution(root, item, earliest, latest, now):
    execution_window(item, earliest, latest, now)
    require(isinstance(item.get("method"), str), "Executed evidence method must describe the actual method")
    for field in ("method", "measured", "expected"):
        require(actual(item.get(field)), f"Executed evidence missing actual {field}")
    artifacts(root, item.get("artifactHashes"))


def number(value, low=None, high=None):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and (low is None or value >= low) and (high is None or value <= high)


def validate_manual(root, session, earliest, latest, now):
    require(session.get("evidenceCategory") == "ACTUAL PHYSICAL OR ASSISTIVE SESSION", "Manual PASS needs an actual physical/assistive category")
    validate_execution(root, session, earliest, latest, now)
    for field in ("deviceModel", "os", "browserOrAssistiveToolVersion", "operator", "viewportDprNetworkCache"):
        require(actual(session.get(field)), f"Manual session missing {field}")
        if field != "viewportDprNetworkCache":
            require(isinstance(session[field], str), f"Manual identity {field} must be a string")
    ident = session["id"]
    if ident in ("MD-01", "MD-02", "MD-06"):
        require(session.get("physicalDevice") is True, "Physical sessions require an actual physical-device claim")
    if ident == "MD-01":
        require(session.get("platform") in ("iOS", "iPadOS") and session.get("browser") == "Safari", "MD-01 requires physical iOS/iPadOS Safari")
    elif ident == "MD-02":
        require(session.get("platform") == "Android" and session.get("browser") == "Chrome", "MD-02 requires physical Android Chrome")
    elif ident == "MD-03":
        require(session.get("platform") == "Windows" and session.get("assistiveTool") == "NVDA" and actual(session.get("browser")), "MD-03 requires actual Windows NVDA/browser identity")
    elif ident == "MD-04":
        require(session.get("platform") in ("macOS", "iOS", "iPadOS") and session.get("browser") == "Safari"
                and session.get("assistiveTool") == "VoiceOver", "MD-04 requires actual Safari/VoiceOver identity")
        if session.get("platform") != "macOS":
            require(session.get("physicalDevice") is True, "Mobile VoiceOver needs physical device identity")
    elif ident == "MD-05":
        require(session.get("platform") == "Android" and session.get("assistiveTool") == "TalkBack"
                and session.get("physicalDevice") is True and actual(session.get("browser")), "MD-05 requires actual physical Android TalkBack/browser identity")
    elif ident == "MD-06":
        require(session.get("platform") in ("Android", "iOS", "iPadOS") and actual(session.get("browser")), "MD-06 requires a physical mobile platform/browser")
    measured = session.get("rawMeasurements")
    require(isinstance(measured, dict), "Actual manual measurement inventory required")
    if session["status"] != "PASS":
        return
    for key in MANUAL_MEASUREMENTS[session["id"]]:
        require(actual(measured.get(key)), f"Actual manual measurement missing {key}")
    if session["id"] == "MD-01":
        require(isinstance(measured["coldLoads"], list) and len(measured["coldLoads"]) == 5
                and all(number(v, 0) for v in measured["coldLoads"]), "MD-01 requires five measured cold-load durations in milliseconds")
    if session["id"] == "MD-06":
        started, completed = execution_window(session, earliest, latest, now)
        require((completed - started).total_seconds() >= 600, "Thermal session must last at least 600 seconds")
        for key in ("batteryStartPercent", "batteryEndPercent"):
            require(number(measured[key], 0, 100), "Invalid thermal battery measurement")
        for key in ("temperatureStartC", "temperatureEndC"):
            require(number(measured[key]), "Invalid thermal temperature measurement")
        require(isinstance(measured["chargerConnected"], bool) and type(measured["crashes"]) is int and measured["crashes"] >= 0
                and measured["qualityTier"] in ("high", "medium", "low", "static"), "Invalid thermal charger/crashes/quality tier")
        pacing = measured["framePacing"]
        require(isinstance(pacing, list) and len(pacing) == 5, "Thermal pacing requires 2/4/6/8/10-minute samples")
        require([row.get("elapsedSeconds") for row in pacing if isinstance(row, dict)] == [120, 240, 360, 480, 600], "Thermal pacing interval inventory mismatch")
        for row in pacing:
            require(isinstance(row.get("frameTimesMs"), list) and bool(row["frameTimesMs"])
                    and all(number(v, 0) for v in row["frameTimesMs"]), "Raw thermal frame-time samples required")


def blank_ledger():
    requirements = [{"id": ident, "name": name, "status": "NOT RUN", "evidenceCategory": "LIVE PRODUCTION REQUIRED",
                     "observations": [{"criterion": criterion, "status": "NOT RUN", "method": None, "measured": None,
                                       "expected": None, "startedAt": None, "completedAt": None, "artifactHashes": [],
                                       "defects": [], "limitations": []} for criterion in criteria]} for ident, name, criteria in CRITERIA]
    manual = [{"id": ident, "name": name, "status": "NOT RUN", "requiredActualSession": details,
               **{key: None for key in ("deviceModel", "os", "browserOrAssistiveToolVersion", "operator", "viewportDprNetworkCache",
                                        "method", "measured", "expected", "startedAt", "completedAt", "rawMeasurements")},
               "artifactHashes": [], "defects": []} for ident, name, details in MANUAL]
    return requirements, manual


def build_ledger(root, manifest_path=None, authorization_path=None, receipt_paths=(), operator="NOT ASSIGNED", now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    identity = dict.fromkeys(IDENTITY)
    if manifest_path:
        identity.update(validate_manifest(root, manifest_path))
    binding = None
    if authorization_path:
        require(manifest_path is not None, "Operational binding requires a manifest")
        identity, binding = validate_binding(root, authorization_path, identity, now)
    requirements, manual = blank_ledger()
    supplied, seen_criteria, seen_sessions = [], set(), set()
    for receipt_path in receipt_paths:
        receipt = load_json(receipt_path)
        incoming, sessions = receipt.get("requirements", []), receipt.get("physicalAndAssistiveSessions", [])
        require(isinstance(incoming, list) and isinstance(sessions, list), "Receipt inventories must be arrays")
        executed = any(item.get("status") in ("PASS", "FAIL") or any(obs.get("status") in ("PASS", "FAIL") for obs in item.get("observations", [])) for item in incoming + sessions)
        earliest = latest = None
        if executed:
            require(binding is not None, "Executed receipts require a validated manifest and separate operational binding")
            require(not any(receipt.get(key) for key in ("auditFixture", "synthetic", "localFixture")), "Synthetic fixtures cannot establish production proof")
            for key in IDENTITY:
                require(receipt.get(key) == identity[key], f"Receipt identity mismatch: {key}")
            earliest, latest = timestamp(receipt.get("executedAt"), now), timestamp(receipt.get("completedAt"), now)
            require(timestamp(identity["deployedAt"], now) <= earliest <= latest, "Receipt execution must follow deployment")
        seen_requirements = set()
        for item in incoming:
            ident = item.get("id")
            require(type(ident) is int and ident in range(1, 11) and ident not in seen_requirements, "Unknown/duplicate G7 requirement")
            seen_requirements.add(ident)
            target = requirements[ident - 1]
            require(item.get("name", target["name"]) == target["name"], "Conflicting requirement name")
            require(item.get("status") in STATUSES, "Unsupported requirement status")
            observations = item.get("observations", [])
            require(isinstance(observations, list), "Subcriteria inventory must be an array")
            required = {row["criterion"] for row in target["observations"]}
            found = set()
            for obs in observations:
                criterion = obs.get("criterion")
                require(criterion in required and criterion not in found, "Unknown/duplicate subcriterion")
                found.add(criterion)
                require(obs.get("status") in STATUSES, "Unsupported subcriterion status")
                if obs["status"] == "NOT RUN":
                    continue
                require((ident, criterion) not in seen_criteria, "Conflicting/repeated executed subcriterion; use a fresh ledger for a new run")
                seen_criteria.add((ident, criterion))
                category = obs.get("evidenceCategory", receipt.get("evidenceCategory"))
                require(category == receipt.get("evidenceCategory"), "Observation category conflicts with receipt category")
                require(category in ("LIVE PRODUCTION", "HTTP ONLY", "LIVE BROWSER AUTOMATED"), "Synthetic/local/emulated categories cannot supply live observations")
                validate_execution(root, obs, earliest, latest, now)
                matching = next(row for row in target["observations"] if row["criterion"] == criterion)
                matching.update({key: value for key, value in obs.items() if key not in ("criterion", "evidenceCategory")})
                matching["evidenceCategory"] = category
            if item["status"] == "PASS":
                require(found == required and all(obs["status"] == "PASS" for obs in observations), "Complete requirement PASS requires exact complete PASS subcriteria inventory")
                require(all(obs.get("evidenceCategory", receipt.get("evidenceCategory")) == "LIVE PRODUCTION" for obs in observations), "Surrogate/HTTP/browser-only observations cannot mark a complete live requirement PASS")
            if item["status"] == "FAIL":
                require(any(obs["status"] == "FAIL" for obs in observations), "Requirement FAIL needs a failed executed subcriterion")
            target["status"] = "FAIL" if any(row["status"] == "FAIL" for row in target["observations"]) else "PASS" if all(row["status"] == "PASS" and row.get("evidenceCategory") == "LIVE PRODUCTION" for row in target["observations"]) else "NOT RUN"
        for session in sessions:
            ident = session.get("id")
            target = next((row for row in manual if row["id"] == ident), None)
            require(target is not None and ident not in seen_sessions, "Unknown/duplicate manual session")
            seen_sessions.add(ident)
            require(session.get("name", target["name"]) == target["name"] and session.get("status") in STATUSES, "Conflicting manual identity/status")
            if session["status"] != "NOT RUN":
                require(receipt.get("evidenceCategory") == "ACTUAL PHYSICAL OR ASSISTIVE SESSION", "Manual receipt must classify actual sessions")
                normalized = {**session, "evidenceCategory": session.get("evidenceCategory", receipt["evidenceCategory"])}
                validate_manual(root, normalized, earliest, latest, now)
                target.update({key: value for key, value in normalized.items() if key not in ("id", "name", "requiredActualSession")})
        supplied.append({"path": str(receipt_path), "sha256": hash_artifact(receipt_path, "lf"), "hashMode": "lf"})
    all_items = requirements + manual
    return {"schemaVersion": 2, "createdAt": now.isoformat(), **identity, "operator": operator,
            "evidenceCategory": "MAKER EVIDENCE LEDGER", "validationScope": "STRUCTURE, IDENTITY AND ARTIFACT HASHES ONLY",
            "operationalBinding": {"path": str(authorization_path), "sha256": hash_artifact(authorization_path, "lf"), "hashMode": "lf"} if binding else None,
            "requirements": requirements, "physicalAndAssistiveSessions": manual, "suppliedReceipts": supplied,
            "overallStatus": "FAIL" if any(item["status"] == "FAIL" for item in all_items) else "PASS" if all(item["status"] == "PASS" for item in all_items) else "NOT RUN",
            "heapGpuLeakAbsence": "UNKNOWN", "independentReview": "NOT RUN", "acceptanceClaim": False,
            "governance": "Owner-authorized preparation. Independent review and Parent adjudication remain separate; this ledger cannot accept a release or gate.",
            "limitations": ["Structural validation and artifact hashes do not attest truth, actual execution, authority authenticity or operator claims; independent review and Parent adjudication are required.",
                            "HTTP/browser-only observations do not establish complete live production or manual proof.",
                            "Fixtures, local SQL, viewport emulation and axe do not prove real services, hardware, assistive speech or thermal sessions.",
                            "Process liveness does not prove backend readiness. Canvas removal does not establish heap/GPU leak absence."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--authorization", type=Path, help="Separate operational binding with hash-verified authorization/accepted-successor references")
    parser.add_argument("--receipts", type=Path, nargs="*", default=[])
    parser.add_argument("--operator", default="NOT ASSIGNED")
    args = parser.parse_args()
    root, target = args.repository.resolve(), args.output.resolve()
    require(target.is_relative_to(root / "deliveries/G7") and not target.is_relative_to(root / "deliveries/G7/preparation/tools"), "Receipt output must stay inside deliveries/G7 and outside source tools")
    require(not target.exists(), "Preserve prior evidence; choose a new output path")
    inputs = [p.resolve() for p in [args.manifest, args.authorization, *args.receipts] if p]
    require(target not in inputs, "Output cannot replace an input")
    ledger = build_ledger(root, args.manifest, args.authorization, args.receipts, args.operator)
    write(target, ledger)
    print(f"Wrote structurally validated evidence ledger: {target}; overall {ledger['overallStatus']}; independent review NOT RUN; no acceptance claim.")


if __name__ == "__main__":
    main()
