"""Read job logs; strip credentials before following signed storage redirects."""
import datetime, hashlib, json, pathlib, subprocess, urllib.error, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
observation = json.loads((root / "evidence/github-ci-observation.json").read_text(encoding="utf-8"))
proc = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                      capture_output=True, text=True, timeout=60)
if proc.returncode:
    raise RuntimeError("Existing credential unavailable")
credential = dict(line.split("=", 1) for line in proc.stdout.splitlines() if "=" in line)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect())
receipts = []
for run in observation["runs"]:
    job = run["jobs"][0]
    api = f"https://api.github.com/repos/yorayriniwnl/Yor-World/actions/jobs/{job['id']}/logs"
    request = urllib.request.Request(api, headers={"Authorization": "Bearer " + credential["password"],
        "Accept": "application/vnd.github+json", "User-Agent": "Yor-World-read-only-verifier"})
    try:
        with opener.open(request, timeout=60) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise RuntimeError(f"GitHub logs API HTTP {error.code}") from None
        # Fresh request: API Authorization is never sent to the artifact/storage host.
        with urllib.request.urlopen(error.headers["Location"], timeout=60) as response:
            body = response.read()
    filename = f"github-run-{run['id']}-job.log"
    (root / "evidence" / filename).write_bytes(body)
    lines = body.decode("utf-8", errors="replace").splitlines()
    selected = [line for line in lines if any(term in line for term in ["passed (", "Test Files", "Tests  ",
        "failureReason", "World canvas", "Production world stopped", "sourceCommit", "app tree", "Expected:", "Received:"])]
    receipt = {"runId": run["id"], "jobId": job["id"], "head": run["head_sha"],
        "observedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "log": filename,
        "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(), "selectedLines": selected}
    receipts.append(receipt)
    print(json.dumps(receipt))
(root / "evidence/github-ci-log-receipts.json").write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")
