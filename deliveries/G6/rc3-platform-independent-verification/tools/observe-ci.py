"""Read GitHub run metadata with existing credential; never print or persist credential."""
import datetime, json, pathlib, subprocess, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
credential_result = subprocess.run(["git", "credential", "fill"],
    input="protocol=https\nhost=github.com\n\n", text=True, capture_output=True, timeout=60)
if credential_result.returncode:
    raise RuntimeError("Existing GitHub credential unavailable")
credential = dict(line.split("=", 1) for line in credential_result.stdout.splitlines() if "=" in line)
headers = {"Authorization": "Bearer " + credential["password"],
           "Accept": "application/vnd.github+json", "User-Agent": "Yor-World-read-only-verifier",
           "X-GitHub-Api-Version": "2022-11-28"}
base = "https://api.github.com/repos/yorayriniwnl/Yor-World"
result = {"observedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "method": "Authenticated read-only GitHub REST API via existing credential; no token retained", "runs": []}
for run_id in [37182688631, 37183110590]:
    def read(path):
        with urllib.request.urlopen(urllib.request.Request(base + path, headers=headers), timeout=60) as response:
            return json.load(response)
    run = read(f"/actions/runs/{run_id}")
    jobs = read(f"/actions/runs/{run_id}/jobs?per_page=100")
    entry = {key: run.get(key) for key in ["id", "name", "head_sha", "head_branch", "status", "conclusion", "html_url", "created_at", "updated_at", "run_attempt"]}
    entry["jobs"] = [{key: job.get(key) for key in ["id", "name", "status", "conclusion", "html_url", "started_at", "completed_at", "steps"]} for job in jobs["jobs"]]
    result["runs"].append(entry)
output = root / "evidence" / "github-ci-observation.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
for entry in result["runs"]:
    print(json.dumps({"id": entry["id"], "head": entry["head_sha"], "conclusion": entry["conclusion"],
        "jobs": [{"name": job["name"], "conclusion": job["conclusion"],
                  "steps": [{"name": step["name"], "conclusion": step["conclusion"]} for step in job["steps"]]} for job in entry["jobs"]]}))
