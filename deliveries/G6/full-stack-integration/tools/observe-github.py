"""Read public workflow/job evidence for one exact pushed HEAD without deployment."""
import argparse
import datetime
import json
import pathlib
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--head", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
assert len(args.head) == 40 and all(c in "0123456789abcdef" for c in args.head)
api = "https://api.github.com/repos/yorayriniwnl/Yor-World"

def get(url):
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "yor-world-rc3-evidence"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)

runs = get(api + "/actions/runs?head_sha=" + args.head + "&per_page=30")
required = {"Repository integrity", "CI / Release Quality Gate"}
quality_steps = [
    "1. Frozen canonical dependency install",
    "2. Lint canonical application",
    "3. Typecheck canonical application",
    "4. Unified unit tests",
    "5. Unified backend/runtime integration tests",
    "6. Khronos frozen canonical asset validation",
    "7. Full-stack production build",
    "8. Full unified Playwright E2E",
    "9. Automated accessibility",
    "10. Fresh canonical performance browser measurements",
    "11. Actual production route/module composition",
    "12. Fresh canonical performance budgets",
    "13. Exact committed RC3 manifest/archive validation",
]
observed = []
for name in sorted(required):
    matches = [run for run in runs["workflow_runs"] if run["head_sha"] == args.head and run["name"] == name and run["event"] == "push"]
    if not matches:
        observed.append({"workflow": name, "status": "not-yet-observed"})
        continue
    run = max(matches, key=lambda value: (value["run_attempt"], value["id"]))
    item = {"workflow": name, "runId": run["id"], "runAttempt": run["run_attempt"], "headSha": run["head_sha"], "event": run["event"], "status": run["status"], "conclusion": run["conclusion"], "url": run["html_url"], "createdAt": run["created_at"], "updatedAt": run["updated_at"]}
    if run["status"] == "completed":
        jobs = get(run["jobs_url"] + "?per_page=100")["jobs"]
        item["jobs"] = [{"jobId": job["id"], "name": job["name"], "headSha": job["head_sha"], "status": job["status"], "conclusion": job["conclusion"], "url": job["html_url"], "steps": [{"number": step["number"], "name": step["name"], "status": step["status"], "conclusion": step["conclusion"]} for step in job["steps"]]} for job in jobs]
        def is_required(step):
            return step["name"] in {"Verify reference manifest hashes", "Verify live status surfaces agree"} or any(step["name"].startswith(str(number) + ". ") for number in range(1, 14))
        item["requiredSkippedSteps"] = [step["name"] for job in jobs for step in job["steps"] if is_required(step) and step["conclusion"] == "skipped"]
        item["skippedNonRequiredSteps"] = [step["name"] for job in jobs for step in job["steps"] if not is_required(step) and step["conclusion"] == "skipped"]
        required_names = quality_steps if name == "CI / Release Quality Gate" else ["Verify reference manifest hashes", "Verify live status surfaces agree"]
        successful_names = [step["name"] for job in jobs for step in job["steps"] if step["conclusion"] == "success"]
        item["missingSuccessfulRequiredSteps"] = [expected for expected in required_names if expected not in successful_names]
    observed.append(item)
root = pathlib.Path(__file__).resolve().parents[4]
manifest = json.loads((root / "deliveries/G6/full-stack-integration/release-manifest.json").read_text(encoding="utf-8"))
data = {"sourceCommit": manifest["sourceCommit"], "recordedCandidateHead": args.head, "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "workflows": observed}
data["overallStatus"] = "PASS" if all(item.get("conclusion") == "success" and item.get("jobs") and all(job["conclusion"] == "success" and job["headSha"] == args.head for job in item["jobs"]) and not item.get("requiredSkippedSteps") and not item.get("missingSuccessfulRequiredSteps") for item in observed) else "PENDING" if any(item["status"] != "completed" for item in observed) else "FAIL"
target = pathlib.Path(args.output)
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"head": args.head, "overallStatus": data["overallStatus"], "workflows": [{key: item.get(key) for key in ["workflow", "runId", "status", "conclusion", "requiredSkippedSteps"]} for item in observed]}, indent=2))
