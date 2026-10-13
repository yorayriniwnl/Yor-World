import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
COMMIT = "76d679dcb98064152021830b98f16eb456b3ae19"
PACKAGE = "deliveries/FINISH-A1/r5-07"


def blob(relative: str) -> bytes:
    return subprocess.run(
        ["git", "cat-file", "blob", f"{COMMIT}:{PACKAGE}/{relative}"],
        cwd=ROOT, check=True, capture_output=True,
    ).stdout


def json_blob(relative: str):
    return json.loads(blob(relative).decode("utf-8"))


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


binding = json_blob("evidence/browser-binding.json")
browser_results_bytes = blob("evidence/browser-results.json")
build_manifest_bytes = blob("evidence/build-output-manifest.json")
chromium_receipt = json_blob("evidence/chromium-final.result.json")
replay_build = json_blob("evidence/replay-next-build.result.json")
initial_build = json_blob("evidence/next-build.result.json")
browser_results = json.loads(browser_results_bytes.decode("utf-8"))
build_manifest = json.loads(build_manifest_bytes.decode("utf-8"))
result_candidates = []
for name in (
    "a1-playwright-final.result.json", "chromium-final.result.json",
    "a1-playwright.result.json", "replay-playwright.result.json",
):
    try:
        result_candidates.append((name, sha(blob(f"evidence/{name}"))))
    except subprocess.CalledProcessError:
        pass

matching_playwright_result = [name for name, digest in result_candidates if digest == binding["playwrightResultSha256"]]
stats = browser_results.get("stats", {})
checks = {
    "buildManifestHashMatchesBinding": sha(build_manifest_bytes) == binding["buildManifestSha256"],
    "browserResultsHashMatchesBinding": sha(browser_results_bytes) == binding["browserResultsSha256"],
    "playwrightResultHashMatchesPackagedReceipt": matching_playwright_result == ["chromium-final.result.json"],
    "browserReceiptCandidateTreeMatches": chromium_receipt.get("candidate_app_tree") == binding["candidateAppTree"],
    "browserReceiptBuildIdMatches": chromium_receipt.get("build_id") == binding["buildId"],
    "browserReceiptExitZero": chromium_receipt.get("exit_code") == 0,
    "browserStatsMatch": (
        stats.get("expected") == binding["expected"] == 6
        and stats.get("unexpected") == binding["unexpected"] == 0
        and stats.get("skipped") == binding["skipped"] == 0
        and stats.get("flaky") == 0
        and not browser_results.get("errors")
    ),
    "successfulExactBaseReplayBuildReceipt": replay_build.get("exit_code") == 0,
    "earlierSymlinkedBuildFailurePreserved": initial_build.get("exit_code") == 1,
}

result = {
    "format": "YOR-WORLD-FINISH-41-A1-MAKER-BUILD-BROWSER-BINDING-v1",
    "candidateCommit": COMMIT,
    "candidateAppTree": binding["candidateAppTree"],
    "patchSha256": binding["sourcePatchSha256"],
    "checks": checks,
    "allChecksPass": all(checks.values()),
    "build": {
        "initialBuildExitCode": initial_build.get("exit_code"),
        "initialBuildNote": "Initial Turbopack attempt failed in worker scratch with a node_modules symlink outside the filesystem root; retained as a failed attempt, not the successful binding.",
        "exactBaseReplayBuildExitCode": replay_build.get("exit_code"),
        "buildId": binding["buildId"],
        "buildManifestSha256": sha(build_manifest_bytes),
        "buildManifestTopLevelKeys": sorted(build_manifest.keys()),
        "physicalOutputFilesRecheckedLocally": False,
    },
    "browser": {
        "bindingFileSha256": sha(blob("evidence/browser-binding.json")),
        "browserResultsSha256": sha(browser_results_bytes),
        "playwrightResultSha256": binding["playwrightResultSha256"],
        "playwrightResultReceipt": matching_playwright_result,
        "expected": stats.get("expected"),
        "unexpected": stats.get("unexpected"),
        "skipped": stats.get("skipped"),
        "flaky": stats.get("flaky"),
        "browserVersion": binding.get("browserVersion"),
        "playwrightVersion": browser_results.get("config", {}).get("version"),
        "parentFreshBrowserRun": "NOT RUN",
    },
}

if not result["allChecksPass"]:
    raise SystemExit(json.dumps(result, indent=2))

destination = ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0/evidence/a1-maker-binding-verification.json"
destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
