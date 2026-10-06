"""Initialize honest G7 receipts or summarize supplied evidence; no live actions."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
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


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def hash_artifact(path, mode):
    content = path.read_bytes()
    return hashlib.sha256(content.replace(b"\r\n", b"\n") if mode == "lf" else content).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--receipts", type=Path, nargs="*", default=[])
    parser.add_argument("--operator", default="NOT ASSIGNED")
    args = parser.parse_args()
    root = args.repository.resolve()
    target = args.output.resolve()
    if not target.is_relative_to(root / "deliveries/G7") or target.is_relative_to(root / "deliveries/G7/preparation/tools"):
        raise ValueError("Receipt output must stay inside deliveries/G7 and outside source tools")
    identity = {"releaseId": None, "sourceCommit": None, "sourceAppTree": None, "releaseBundleSha256": None,
                "manifestSha256": None, "deploymentId": None, "targetOrigin": None, "deployedAt": None}
    if args.manifest:
        data = json.loads(args.manifest.read_text(encoding="utf-8"))
        identity.update({key: data.get(key) for key in identity if key in data})
        identity["manifestSha256"] = hash_artifact(args.manifest, "lf")
    requirements = [{"id": number, "name": name, "status": "NOT RUN", "evidenceCategory": "LIVE PRODUCTION REQUIRED",
                     "prerequisites": "Actual authorized production deployment, services/tools/operator and postdeployment execution are required.",
                     "observations": [{"criterion": criterion, "status": "NOT RUN", "method": None, "measured": None, "expected": None,
                                       "startedAt": None, "completedAt": None, "artifactHashes": [], "defects": [], "limitations": []} for criterion in criteria]}
                    for number, name, criteria in CRITERIA]
    manual = [{"id": ident, "name": name, "status": "NOT RUN", "requiredActualSession": details,
               "deviceModel": None, "os": None, "browserOrAssistiveToolVersion": None, "operator": None,
               "viewportDprNetworkCache": None, "startedAt": None, "completedAt": None, "rawMeasurements": None,
               "artifactHashes": [], "defects": []} for ident, name, details in MANUAL]
    supplied = []
    for receipt_path in args.receipts:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        for observation in receipt.get("requirements", []):
            if observation.get("status") not in ["PASS", "FAIL", "NOT RUN"]:
                raise ValueError(f"Unsupported status in {receipt_path}; classify unexecuted criteria NOT RUN")
            if observation["status"] == "PASS":
                if not all(receipt.get(key) for key in ["sourceCommit", "deploymentId", "targetOrigin", "executedAt"]):
                    raise ValueError("A live requirement PASS needs actual deployment/source/origin/execution identity")
                artifacts = observation.get("artifactHashes", [])
                if not artifacts or not observation.get("observations") or any(item.get("status") != "PASS" for item in observation["observations"]):
                    raise ValueError("A complete requirement PASS needs all actual subcriteria PASS and raw artifacts")
                for artifact in artifacts:
                    filename = (root / artifact["path"]).resolve()
                    if not filename.is_relative_to(root) or hash_artifact(filename, artifact.get("hashMode", "raw")) != artifact["sha256"]:
                        raise ValueError("Supplied raw artifact is missing, outside workspace or hash-invalid")
            matching = next((item for item in requirements if item["id"] == observation["id"]), None)
            if matching is None:
                raise ValueError("Unknown G7 requirement identity")
            if receipt.get("evidenceCategory") in ["HTTP ONLY", "LOCAL EMBEDDED SQL", "VIEWPORT EMULATION", "AUTOMATED AXE"] and observation["status"] == "PASS":
                raise ValueError("Surrogate evidence cannot mark a complete live/manual requirement PASS")
            matching.update(observation)
        for session in receipt.get("physicalAndAssistiveSessions", []):
            if session.get("status") not in ["PASS", "FAIL", "NOT RUN"]:
                raise ValueError("Manual status must identify actual PASS/FAIL/NOT RUN")
            matching = next((item for item in manual if item["id"] == session["id"]), None)
            if matching is None:
                raise ValueError("Unknown physical/assistive session identity")
            if session["status"] == "PASS":
                if receipt.get("evidenceCategory") != "ACTUAL PHYSICAL OR ASSISTIVE SESSION":
                    raise ValueError("Automated/emulated evidence cannot mark an actual manual session PASS")
                if not all(session.get(key) for key in ["deviceModel", "os", "browserOrAssistiveToolVersion", "operator", "startedAt", "completedAt", "artifactHashes"]):
                    raise ValueError("Actual manual PASS must supply session/operator/version/timestamp/artifact evidence")
                for artifact in session["artifactHashes"]:
                    filename = (root / artifact["path"]).resolve()
                    if not filename.is_relative_to(root) or hash_artifact(filename, artifact.get("hashMode", "raw")) != artifact["sha256"]:
                        raise ValueError("Actual manual raw artifact is missing or hash-invalid")
            matching.update(session)
        supplied.append({"path": str(receipt_path), "sha256": hash_artifact(receipt_path, "lf"), "hashMode": "lf"})
    write(target, {"schemaVersion": 1, "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(), **identity,
                   "operator": args.operator, "evidenceCategory": "MAKER EVIDENCE LEDGER", "requirements": requirements,
                   "physicalAndAssistiveSessions": manual, "suppliedReceipts": supplied,
                   "overallStatus": "FAIL" if any(item["status"] == "FAIL" for item in requirements) else "PASS" if all(item["status"] == "PASS" for item in requirements) and all(item["status"] == "PASS" for item in manual) else "NOT RUN",
                   "heapGpuLeakAbsence": "UNKNOWN", "independentReview": "NOT RUN", "acceptanceClaim": False,
                   "governance": "Owner-authorized production preparation. Actual independent delta and G7 review/adjudication remain separate; this ledger does not accept a release or gate.",
                   "limitations": ["HTTP/headers are observations, not complete G7 proof.", "PGlite/fixtures do not prove hosted independent PostgreSQL sessions or real service behavior.", "Viewport/axe/keyboard checks do not prove physical hardware, assistive speech or thermal sessions.", "Health liveness 200 does not prove backend readiness, RLS/MFA/mail/monitoring.", "DOM canvas removal does not establish heap/GPU leak absence.", "A rollback header/available artifact is not a rehearsed RTO/RPO result."]})
    print(f"Wrote truthful evidence ledger: {target}; missing live/manual proof remains NOT RUN; no acceptance claim.")


if __name__ == "__main__":
    main()
