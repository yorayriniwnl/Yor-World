"""Own read-only inspection of Parent's retained actual API integrity observation."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--observer", required=True, type=Path)
    args = parser.parse_args()
    observer = args.observer.resolve()
    raw = observer.read_bytes()
    data = json.loads(raw)
    run = next(item for item in data["workflows"] if item["workflow"] == "Repository integrity")
    required = ["Verify reference manifest hashes", "Verify live status surfaces agree", "Verify accepted output protection"]
    steps = [item for job in run["jobs"] for item in job["steps"]]
    checks = {
        "retainedObservationIdentity": data["sourceCommit"] == args.source and data["recordedCandidateHead"] == args.head,
        "exactHeadSuccessfulRun": run["headSha"] == args.head and run["event"] == "push" and run["status"] == "completed" and run["conclusion"] == "success",
        "exactHeadSuccessfulJobs": bool(run["jobs"]) and all(item["headSha"] == args.head and item["status"] == "completed" and item["conclusion"] == "success" for item in run["jobs"]),
        "allThreeRequiredStepsExecute": all(any(item["name"] == name and item["status"] == "completed" and item["conclusion"] == "success" and item.get("started_at") and item.get("completed_at") for item in steps) for name in required),
        "retainedObserverNoRequiredSkippedOrMissing": not run["requiredSkippedSteps"] and not run["missingSuccessfulRequiredSteps"],
        "sourceToCandidateImplementationUnchanged": subprocess.check_output(["git", "diff", "--name-only", args.source, args.head, "--", "app", "scripts/release", ".github/workflows"], cwd=ROOT).strip() == b"",
    }
    workflow = subprocess.check_output(["git", "show", args.source + ":.github/workflows/integrity.yml"], cwd=ROOT).decode()
    skipped = [item for item in steps if item["conclusion"] == "skipped"]
    checks["onlyPRScratchCheckSkippedOnPush"] = all(item["name"] == "Reject oversized new scratch archives" for item in skipped) and "- name: Reject oversized new scratch archives\n        if: github.event_name == 'pull_request'" in workflow
    result = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "reviewer": "/root/r6_independent_audit",
              "executionClass": "Own retained API run/job/step and frozen workflow inspection; Parent performed API fetch; no hosted execution by auditor",
              "sourceCommit": args.source, "candidateHead": args.head, "observerPath": str(observer),
              "observerRawSha256": hashlib.sha256(raw).hexdigest(), "observedAt": data["observedAt"],
              "runId": run["runId"], "runAttempt": run["runAttempt"], "runUrl": run["url"], "jobs": run["jobs"],
              "checks": checks, "acceptanceClaim": False, "overallStatus": "PASS" if all(checks.values()) else "FAIL"}
    (HERE / "integrity-proof.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key:value for key,value in result.items() if key != "jobs"}, indent=2))
    if result["overallStatus"] != "PASS":
        raise SystemExit(1)
