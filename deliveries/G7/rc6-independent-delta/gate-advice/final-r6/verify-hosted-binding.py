"""Read retained Parent-fetched API/ZIP bytes without executing application suites."""
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[5]
HERE = Path(__file__).resolve().parent
HEAD = "7837efdfe43a4c129aac3d1737916dc5d5a7f435"
SOURCE = "8e5b954e147a87e36a6869d9940c40f3d4c123f0"
CANDIDATE = ROOT / "deliveries/G7/rc6-candidate-r6"
SNAPSHOT = CANDIDATE / "evidence/github-actions/37690758883/attempt-1/20261007T214910792736Z"
checks = []

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def check(name, value, detail=None):
    checks.append({"name": name, "status": "PASS" if value else "FAIL", "detail": detail})

observer = read(CANDIDATE / "evidence/github-observations/candidate-7837efd-progress-3.json")
check("Both actual exact-candidate workflows completed successfully", len(observer["workflows"]) == 2 and all(w["headSha"] == HEAD and w["event"] == "push" and w["status"] == "completed" and w["conclusion"] == "success" and not w["requiredSkippedSteps"] and not w["missingSuccessfulRequiredSteps"] for w in observer["workflows"]))
run = read(SNAPSHOT / "run.json")
after = read(SNAPSHOT / "run-after-fetch.json")
jobs = read(SNAPSHOT / "jobs.json")["jobs"]
check("Canonical workflow/run/attempt identity retained through fetch", run["id"] == 37690758883 and run["head_sha"] == HEAD and run["event"] == "push" and run["path"] == ".github/workflows/ci.yml" and run["run_attempt"] == 1 and run["status"] == "completed" and run["conclusion"] == "success" and all(run[k] == after[k] for k in ["id", "head_sha", "run_attempt", "status", "conclusion"]))
expected_steps = re.findall(r"^      - name: (\d+\. .+)$", (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8"), re.M)
steps = [s for j in jobs for s in j["steps"] if re.match(r"^\d+\. ", s["name"])]
check("All thirteen exact required step names executed successfully", len(expected_steps) == len(steps) == 13 and [s["name"] for s in steps] == expected_steps and all(s["status"] == "completed" and s["conclusion"] == "success" and s["started_at"] and s["completed_at"] for s in steps))
check("Actual quality jobs bind exact head/run/attempt", len(jobs) == 1 and all(j["head_sha"] == HEAD and j["run_id"] == run["id"] and j["run_attempt"] == 1 and j["status"] == "completed" and j["conclusion"] == "success" for j in jobs))
receipt = read(SNAPSHOT / "artifact-receipt.json")
artifacts = read(SNAPSHOT / "artifacts.json")["artifacts"]
artifact = next(a for a in artifacts if a["id"] == receipt["artifactId"])
raw_zip = (SNAPSHOT / "quality-artifact.zip").read_bytes()
zip_hash = sha(raw_zip)
check("Actual ZIP hash/size agrees with API digest and artifact receipt", artifact["name"] == "rc6-quality-" + HEAD and not artifact["expired"] and artifact["digest"] == "sha256:" + zip_hash and receipt["sha256"] == zip_hash and receipt["bytes"] == len(raw_zip) == artifact["size_in_bytes"] and receipt["head"] == HEAD and receipt["runId"] == run["id"] and receipt["runAttempt"] == 1)
manifest_bytes = (CANDIDATE / "release-manifest.json").read_bytes()
manifest = json.loads(manifest_bytes)
manifest_hash = sha(manifest_bytes.replace(b"\r\n", b"\n"))
browser = {}
with zipfile.ZipFile(SNAPSHOT / "quality-artifact.zip") as archive:
    members = [i for i in archive.infolist() if not i.is_dir()]
    check("All inspected extracted files match unique actual ZIP entries", len({i.filename for i in members}) == len(members) and all((SNAPSHOT / "quality-artifact" / i.filename).read_bytes() == archive.read(i) for i in members), len(members))
    strict = json.loads(archive.read("release-manifest-validation.receipt.json"))
    check("Uploaded strict receipt binds exact source/head/manifest/archive", strict["overallStatus"] == "PASS" and not strict["failures"] and strict["sourceCommit"] == SOURCE and strict["verifiedHead"] == HEAD and strict["sourceAppTree"] == manifest["sourceAppTree"] and strict["manifestSha256"] == manifest_hash and strict["releaseBundleSha256"] == manifest["releaseBundleSha256"] and strict["fileCount"] == 242 and strict["archiveBytes"] == 1655792)
    for bucket, filename, count in [("e2e", "browser-results.json", 109), ("accessibility", "browser-results.json", 17), ("performance", "performance-results.json", 6)]:
        report = json.loads(archive.read(bucket + "/" + filename))
        cases = []
        def walk(suites):
            for suite in suites:
                for spec in suite.get("specs", []):
                    cases.extend(spec.get("tests", []))
                walk(suite.get("suites", []))
        walk(report["suites"])
        valid = len(cases) == report["stats"]["expected"] == count and not report.get("errors") and all(report["stats"][k] == 0 for k in ["unexpected", "skipped", "flaky"]) and all(c["status"] == "expected" and [r["status"] for r in c["results"]] == ["passed"] for c in cases)
        check("Actual hosted browser cases: " + bucket, valid, count)
        browser[bucket] = {"count": len(cases), "everyCaseExactlyOnePass": valid, "stats": report["stats"]}
    raw = json.loads(archive.read("performance/active-route-frame-pacing.json"))
    data = raw.get("framePacingData", raw)
    times = sorted(data.get("rawSamples", data.get("frameTimes", [])))
    frames, actions = data["rawFrames"], data["actions"]
    low = {"durationMs": data["routeDurationMs"], "frames": len(frames), "actions": len(actions), "medianMs": round((times[(len(times)-1)//2]+times[len(times)//2])/2, 2), "p95Ms": round(times[math.floor(len(times)*0.95)], 2), "minimumCalls": min(f["renderCalls"] for f in frames), "minimumTriangles": min(f["renderedTriangles"] for f in frames), "maximumActionLatencyMs": max(a["latencyMs"] for a in actions), "qualityTiers": sorted({f["qualityTier"] for f in frames}), "rendererIdentity": data.get("rendererIdentity")}
    check("Raw LOW samples meet preserved thresholds", low["durationMs"] >= 60000 and low["actions"] == 60 and low["medianMs"] <= 33.3 and low["p95Ms"] <= 45 and low["minimumCalls"] > 0 and low["minimumTriangles"] > 0 and low["maximumActionLatencyMs"] <= 900 and low["qualityTiers"] == ["low"] and data["requestedUserPreference"] == "low" and data["failureReason"] is None and low["medianMs"] == data["medianFrameTimeMs"] and low["p95Ms"] == data["p95FrameTimeMs"])
    composition = json.loads(archive.read("release-composition.json"))
    check("Actual performance and composition identify same production build", raw["buildId"] == composition["buildId"] and composition["overallStatus"] == "PASS")
    unit_counts = {}
    for filename, count in [("04-unit-tests.log", 312), ("05-integration-tests.log", 286)]:
        text = re.sub(r"\x1b\[[0-9;]*m", "", archive.read(filename).decode())
        matches = re.findall(r"Tests\s+(\d+)\s+passed\s+\((\d+)\)", text)
        check("Actual hosted passing test log: " + filename, matches == [(str(count), str(count))])
        unit_counts[filename] = matches

result = {"createdAt": datetime.now(timezone.utc).isoformat(), "reviewer": "/root/r6_acceptance_advisor", "executionClass": "Own read-only retained API, ZIP, browser and raw LOW inspection; Parent fetched API/ZIP; hosted runners executed suites", "sourceCommit": SOURCE, "candidateHead": HEAD, "sourceAppTree": manifest["sourceAppTree"], "manifestSha256Lf": manifest_hash, "archiveSha256Raw": manifest["releaseBundleSha256"], "qualityRun": run["id"], "integrityRun": 37690758886, "attempt": 1, "artifactId": artifact["id"], "artifactZipSha256": zip_hash, "artifactZipBytes": len(raw_zip), "buildId": composition["buildId"], "snapshot": SNAPSHOT.relative_to(ROOT).as_posix(), "checks": checks, "browser": browser, "rawLowRecomputation": low, "testCounts": unit_counts, "overallStatus": "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL", "sourceAcceptanceClaim": False, "g7AcceptanceClaim": False}
with (HERE / "hosted-binding-verification.json").open("x", encoding="utf-8", newline="\n") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps(result, indent=2))
raise SystemExit(0 if result["overallStatus"] == "PASS" else 1)
