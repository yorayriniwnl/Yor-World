"""Own retained exact-head API/artifact analysis; fetching belongs to Parent."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import math
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent

def sha(data, lf=False):
    return hashlib.sha256(data.replace(b"\r\n", b"\n") if lf else data).hexdigest()

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()

def pacing(path):
    raw = load(path)
    data = raw.get("framePacingData", raw)
    times = sorted(data.get("rawSamples", data.get("frameTimes", [])))
    frames, actions = data.get("rawFrames", []), data.get("actions", [])
    result = {"durationMs": data["routeDurationMs"], "frames": len(frames), "actions": len(actions),
              "medianMs": round((times[(len(times)-1)//2] + times[len(times)//2]) / 2, 2),
              "p95Ms": round(times[math.floor(len(times) * 0.95)], 2),
              "minimumCalls": min(frame["renderCalls"] for frame in frames),
              "minimumTriangles": min(frame["renderedTriangles"] for frame in frames),
              "maximumActionLatencyMs": max(action["latencyMs"] for action in actions),
              "qualityTiers": sorted({frame["qualityTier"] for frame in frames}),
              "requestedPreference": data.get("requestedUserPreference"), "failureReason": data.get("failureReason"),
              "rendererIdentity": data.get("rendererIdentity"), "buildId": raw.get("buildId")}
    result["passes"] = result["durationMs"] >= 60000 and result["actions"] == 60 and result["medianMs"] <= 33.3 and result["p95Ms"] <= 45 and result["minimumCalls"] > 0 and result["minimumTriangles"] > 0 and result["maximumActionLatencyMs"] <= 900 and result["qualityTiers"] == ["low"] and result["requestedPreference"] == "low" and result["failureReason"] is None and abs(result["medianMs"]-data["medianFrameTimeMs"]) < 1e-6 and abs(result["p95Ms"]-data["p95FrameTimeMs"]) < 1e-6
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--snapshot", required=True, type=Path)
    args = parser.parse_args()
    source, head, snapshot = args.source, args.head, args.snapshot.resolve()
    policy = json.loads(git("show", source + ":scripts/release/rc6-policy.json"))
    candidate = ROOT / policy["deliveryRoot"]
    manifest = load(candidate / "release-manifest.json")
    checks, defects = [], []
    def require(condition, label, detail=None):
        checks.append({"label": label, "status": "PASS" if condition else "FAIL", "detail": detail})
        if not condition:
            defects.append(label)
    run = load(snapshot / "run.json")
    run_after = load(snapshot / "run-after-fetch.json")
    jobs = load(snapshot / "jobs.json")["jobs"]
    require(run["name"] == "CI / Release Quality Gate" and run["head_sha"] == head and run["status"] == "completed" and run["conclusion"] == "success", "Retained exact-head quality workflow success", run["id"])
    require(all(run[key] == run_after[key] for key in ["id", "head_sha", "run_attempt", "status", "conclusion"]), "Run/attempt identity stable during Parent fetch")
    require(git("diff", "--name-only", source, head, "--", "app", "scripts/release", ".github/workflows") == "", "Hosted candidate head keeps frozen source implementation")
    required = []
    for job in jobs:
        require(job["head_sha"] == head and job["status"] == "completed" and job["conclusion"] == "success", "Exact-head hosted job success", job["id"])
        for step in job["steps"]:
            match = re.match(r"^(\d+)\. ", step.get("name", ""))
            if match:
                required.append({"number": int(match.group(1)), "name": step["name"], "status": step["status"],
                                 "conclusion": step["conclusion"], "startedAt": step.get("started_at"), "completedAt": step.get("completed_at")})
    require(sorted(item["number"] for item in required) == list(range(1, 14)) and all(item["status"] == "completed" and item["conclusion"] == "success" and item["startedAt"] and item["completedAt"] for item in required), "All thirteen numbered required hosted steps executed successfully")
    artifact_receipt = load(snapshot / "artifact-receipt.json")
    artifacts = load(snapshot / "artifacts.json")["artifacts"]
    actual = (snapshot / "quality-artifact.zip").read_bytes()
    artifact = next(item for item in artifacts if item["id"] == artifact_receipt["artifactId"])
    zip_hash = sha(actual)
    require(zip_hash == artifact_receipt["sha256"] and len(actual) == artifact_receipt["bytes"] and artifact["digest"] == "sha256:" + zip_hash and artifact["name"] == "rc6-quality-" + head and artifact["expired"] is False, "Actual retained artifact zip agrees with API digest and identity", {"artifactId": artifact["id"], "sha256": zip_hash, "bytes": len(actual)})
    extracted = snapshot / "quality-artifact"
    extraction = []
    with zipfile.ZipFile(snapshot / "quality-artifact.zip") as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            data = archive.read(member)
            path = extracted / member.filename
            matches = path.is_file() and path.read_bytes() == data
            extraction.append({"path": member.filename, "bytes": len(data), "sha256": sha(data), "matchesExtracted": matches})
    require(all(item["matchesExtracted"] for item in extraction), "All inspected extracted artifacts equal actual zip entries", len(extraction))
    strict = load(extracted / "release-manifest-validation.receipt.json")
    manifest_hash = sha((candidate / "release-manifest.json").read_bytes(), lf=True)
    require(strict["overallStatus"] == "PASS" and strict["sourceCommit"] == source and strict["verifiedHead"] == head and strict["sourceAppTree"] == manifest["sourceAppTree"] and strict["manifestPath"] == policy["deliveryRoot"] + "/release-manifest.json" and strict["manifestSha256"] == manifest_hash and strict["releaseBundleSha256"] == manifest["releaseBundleSha256"] and strict["fileCount"] == manifest["bundleMetadata"]["fileCount"], "Uploaded strict receipt binds exact source/head/final manifest/archive")
    browser = {}
    for bucket, filename in [("e2e", "browser-results.json"), ("accessibility", "browser-results.json"), ("performance", "performance-results.json")]:
        report = load(extracted / bucket / filename)
        outcomes = []
        def walk(suites):
            for suite in suites:
                for spec in suite.get("specs", []):
                    for case in spec.get("tests", []):
                        outcomes.append({"outcome": case.get("status"), "results": [r["status"] for r in case.get("results", [])]})
                walk(suite.get("suites", []))
        walk(report["suites"])
        stats = report["stats"]
        valid = stats["expected"] == policy["expectedBrowserChecks"][bucket] and not any(stats[key] for key in ["unexpected", "flaky", "skipped"]) and not report.get("errors") and len(outcomes) == stats["expected"] and all(item["outcome"] == "expected" and item["results"] == ["passed"] for item in outcomes)
        browser[bucket] = {"stats": stats, "cases": len(outcomes), "everyCaseExactlyOnePass": valid}
        require(valid, "Actual hosted browser cases: " + bucket)
    low = pacing(extracted / "performance/active-route-frame-pacing.json")
    require(low["passes"], "Own recomputation of hosted raw LOW measurements")
    composition = load(extracted / "release-composition.json")
    build_ids = {load(extracted / "performance" / name).get("buildId") for name in ["active-route-frame-pacing.json", "cold-loads-desktop-1440x900.json", "cold-loads-mobile-390x844.json", "cold-loads-narrow-320x600.json", "enter-exit-stability.json", "public-payloads.json"]}
    require(composition["overallStatus"] == "PASS" and build_ids == {composition["buildId"]}, "Hosted composition/performance bind one actual build", sorted(build_ids))
    counts = {}
    for bucket, name in [("unit", "04-unit-tests.log"), ("integration", "05-integration-tests.log")]:
        text = re.sub(r"\x1b\[[0-9;]*m", "", (extracted / name).read_text(encoding="utf-8"))
        matches = re.findall(r"Tests\s+(\d+)\s+passed\s+\((\d+)\)", text)
        counts[bucket] = [{"passed": int(a), "total": int(b)} for a,b in matches]
        require(bool(matches) and all(a == b for a,b in matches), "Retained hosted test counts: " + bucket, counts[bucket])
    result = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "reviewer": "/root/r5_independent_audit",
              "executionClass": "Own read-only hash, API-job/step, actual retained zip/browser/raw-frame analysis; Parent performed API fetch; no suite rerun",
              "sourceCommit": source, "candidateHead": head, "snapshotPath": str(snapshot), "runId": run["id"],
              "runAttempt": run["run_attempt"], "artifactId": artifact["id"], "artifactZipSha256": zip_hash,
              "manifestSha256Lf": manifest_hash, "checks": checks, "requiredSteps": required, "extraction": extraction,
              "browserCases": browser, "rawLowRecomputation": low, "testCounts": counts, "defects": defects,
              "production": "NOT RUN", "physicalManual": "NOT RUN", "acceptanceClaim": False,
              "overallStatus": "FAIL" if defects else "PASS"}
    (HERE / "hosted-proof.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: value for key,value in result.items() if key != "extraction"}, indent=2))
    if defects:
        raise SystemExit(1)
