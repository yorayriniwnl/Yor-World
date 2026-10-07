#!/usr/bin/env python3
"""Fetch exact-head GitHub Actions evidence without persisting credentials.

Usage: python deliveries/G7/preparation/tools/fetch-github.py --run-id 123 --head <40-char-sha>
Writes only the current RC6 policy delivery root, with separate run/attempt snapshots.
Every fetch gets a separate attempt/snapshot directory, preserving prior failures.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
import re
import stat
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PureWindowsPath
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[4]
API_HOST = "api.github.com"


class FetchError(RuntimeError):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class GitHubClient:
    def __init__(self, max_archive_bytes):
        self.max_archive_bytes = max_archive_bytes
        self.opener = build_opener(NoRedirect())
        self._credential = None
        self._credential_attempted = False

    def credential(self):
        if self._credential_attempted:
            return self._credential
        self._credential_attempted = True
        try:
            result = subprocess.run(
                ["git", "credential", "fill"], cwd=ROOT,
                input=b"protocol=https\nhost=github.com\n\n", capture_output=True,
                timeout=30, check=False,
                env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"},
            )
        except (OSError, subprocess.TimeoutExpired):
            raise FetchError("Existing git credential lookup failed or timed out") from None
        if result.returncode:
            raise FetchError("GitHub API requires authentication; existing git credential fill failed")
        fields = {}
        for line in result.stdout.decode("utf-8", errors="replace").splitlines():
            key, separator, value = line.partition("=")
            if separator:
                fields[key] = value
        self._credential = fields.get("password")
        if not self._credential:
            raise FetchError("Existing git credential did not return a usable password/token")
        return self._credential

    @staticmethod
    def allowed_redirect(url):
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower()
        return parsed.scheme == "https" and parsed.username is None and parsed.password is None and (
            host in {API_HOST, "github.com", "objects.githubusercontent.com"}
            or host.endswith(".githubusercontent.com")
            or host.endswith(".blob.core.windows.net")
            or host.endswith(".actions.githubusercontent.com")
        )

    def fetch(self, url, limit):
        current = url
        for redirect in range(8):
            if not self.allowed_redirect(current):
                raise FetchError("Rejected unexpected artifact redirect origin")
            parsed = urlsplit(current)
            is_api = parsed.hostname == API_HOST
            for authenticated in [False, True]:
                headers = {"User-Agent": "yor-world-rc6-evidence", "Accept": "application/vnd.github+json"}
                if is_api:
                    headers["X-GitHub-Api-Version"] = "2022-11-28"
                if authenticated:
                    if not is_api:
                        raise FetchError("Artifact download origin rejected unauthenticated signed URL")
                    headers["Authorization"] = "Bearer " + self.credential()
                try:
                    response = self.opener.open(Request(current, headers=headers), timeout=60)
                except HTTPError as error:
                    status = error.code
                    if status in {301, 302, 303, 307, 308}:
                        location = error.headers.get("Location")
                        error.close()
                        if not location:
                            raise FetchError("GitHub artifact redirect omitted its location")
                        current = urljoin(current, location)
                        break  # A new request drops Authorization before following redirects.
                    error.close()
                    if status in {401, 403} and is_api and not authenticated:
                        continue
                    raise FetchError(f"GitHub evidence request failed with HTTP {status}") from None
                except (URLError, TimeoutError, OSError):
                    raise FetchError("GitHub evidence request failed due to network/timeout error") from None
                else:
                    with response:
                        declared = response.headers.get("Content-Length")
                        if declared and declared.isdigit() and int(declared) > limit:
                            raise FetchError("GitHub evidence download exceeds configured size cap")
                        chunks, total = [], 0
                        while True:
                            chunk = response.read(64 * 1024)
                            if not chunk:
                                return b"".join(chunks)
                            total += len(chunk)
                            if total > limit:
                                raise FetchError("GitHub evidence download exceeds configured size cap")
                            chunks.append(chunk)
            else:
                raise FetchError("GitHub authentication fallback failed")
        raise FetchError("GitHub artifact exceeded redirect limit")

    def api(self, endpoint):
        raw = self.fetch(f"https://{API_HOST}{endpoint}", 32 * 1024 * 1024)
        try:
            return json.loads(raw)
        except (ValueError, UnicodeError):
            raise FetchError("GitHub API returned invalid JSON") from None

    def pages(self, endpoint, key):
        records = []
        for page in range(1, 101):
            body = self.api(endpoint + f"?per_page=100&page={page}")
            items = body.get(key)
            if not isinstance(items, list):
                raise FetchError("GitHub API pagination omitted the expected inventory")
            records.extend(items)
            if len(items) < 100:
                return records
        raise FetchError("GitHub evidence inventory exceeded pagination cap")


def ensure_no_symlinks(path):
    if not path.resolve().is_relative_to(ROOT.resolve()):
        raise FetchError("Output target escaped the repository")
    for candidate in [path, *path.parents]:
        if candidate == ROOT.parent:
            break
        if candidate.is_symlink() or candidate.is_junction():
            raise FetchError("Output target contains a symlink")


def save_json(path, value):
    ensure_no_symlinks(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as target:
        json.dump(value, target, indent=2)
        target.write("\n")


def zip_path(info):
    original = info.orig_filename
    name = info.filename
    if original != name or "\x00" in original or "\\" in name or name.startswith("/") or PureWindowsPath(name).drive:
        raise FetchError("Artifact contains an unsafe absolute/backslash/NUL archive path")
    parts = (name[:-1] if info.is_dir() else name).split("/")
    reserved = re.compile(r"^(CON|PRN|AUX|NUL|CLOCK\$|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)", re.I)
    if any(part in {"", ".", ".."} or part.endswith((" ", ".")) or reserved.match(part)
           or any(ord(char) < 32 or char in ':<>"|?*' for char in part) for part in parts):
        raise FetchError("Artifact contains an unsafe Windows/path-traversal archive entry")
    kind = stat.S_IFMT(info.external_attr >> 16)
    if kind not in {0, stat.S_IFREG, stat.S_IFDIR} or info.flag_bits & 1:
        raise FetchError("Artifact symlinks/special files/encrypted entries are forbidden")
    return "/".join(parts)


def extract_checked(archive_bytes, target, max_expanded_bytes):
    ensure_no_symlinks(target)
    files = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
    except zipfile.BadZipFile:
        raise FetchError("GitHub artifact is not a valid ZIP archive") from None
    with archive:
        entries = archive.infolist()
        if len(entries) > 10000:
            raise FetchError("Artifact has too many ZIP entries")
        total, names, file_names, safe_entries = 0, set(), set(), []
        for entry in entries:
            name = zip_path(entry)
            folded = name.casefold()
            if folded in names:
                raise FetchError("Artifact has duplicate/case-colliding archive paths")
            names.add(folded)
            if not entry.is_dir():
                file_names.add(folded)
                total += entry.file_size
                if entry.file_size > 64 * 1024 * 1024 or total > max_expanded_bytes:
                    raise FetchError("Artifact expanded contents exceed the configured size cap")
            safe_entries.append((entry, name))
        for entry, name in safe_entries:
            parts = name.casefold().split("/")
            if any("/".join(parts[:index]) in file_names for index in range(1, len(parts))):
                raise FetchError("Artifact has a file/directory path collision")
        target.mkdir(parents=True, exist_ok=False)
        for entry, name in safe_entries:
            destination = target.joinpath(*name.split("/"))
            ensure_no_symlinks(destination)
            if not destination.resolve().is_relative_to(target.resolve()):
                raise FetchError("Artifact path escaped its extraction root")
            if entry.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            digest, actual = hashlib.sha256(), 0
            with archive.open(entry) as source, destination.open("xb") as output:
                while chunk := source.read(64 * 1024):
                    actual += len(chunk)
                    if actual > entry.file_size or actual > max_expanded_bytes:
                        raise FetchError("Artifact expanded stream exceeded its declared size")
                    output.write(chunk)
                    digest.update(chunk)
            if actual != entry.file_size:
                raise FetchError("Artifact extracted bytes differ from declared ZIP size")
            files.append({"path": name, "bytes": actual, "sha256": digest.hexdigest()})
    return sorted(files, key=lambda item: item["path"])


def inspect_quality(extracted, head, source, policy):
    failures, observations = [], {}

    def report(suffix):
        matches = [path for path in extracted.rglob("*") if path.is_file() and path.as_posix().endswith("/" + suffix)]
        if len(matches) != 1:
            raise FetchError(f"Quality artifact must contain exactly one {suffix}")
        with matches[0].open(encoding="utf-8") as source:
            return json.load(source)

    for kind, suffix, expected in [
        ("e2e", "e2e/browser-results.json", policy["expectedBrowserChecks"]["e2e"]),
        ("accessibility", "accessibility/browser-results.json", policy["expectedBrowserChecks"]["accessibility"]),
        ("performance", "performance/performance-results.json", policy["expectedBrowserChecks"]["performance"]),
    ]:
        data = report(suffix)
        stats, projects = data.get("stats", {}), data.get("config", {}).get("projects", [])
        counts = {item.get("id"): 0 for item in projects}

        def inspect_suite(suite):
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    project = test.get("projectId")
                    results = test.get("results", [])
                    if project not in counts or test.get("status") != "expected" or test.get("expectedStatus") != "passed" or len(results) != 1 or results[0].get("status") != "passed":
                        failures.append(f"{kind}: test did not pass once in an identified project")
                    else:
                        counts[project] += 1
            for child in suite.get("suites", []):
                inspect_suite(child)

        for suite in data.get("suites", []):
            inspect_suite(suite)
        if not projects or len(counts) != len(projects) or any(count != expected for count in counts.values()) or stats.get("expected") != expected * len(projects):
            failures.append(f"{kind}: incomplete authoritative browser inventory")
        if any(stats.get(key) != 0 for key in ["skipped", "unexpected", "flaky"]) or data.get("errors") != []:
            failures.append(f"{kind}: skipped/failed/flaky checks or runner errors")
        observations[kind] = {"stats": stats, "expectedPerProject": expected, "projectCounts": counts}

    pacing = report("performance/active-route-frame-pacing.json")
    samples, frames = pacing.get("rawSamples", []), pacing.get("rawFrames", [])
    sorted_samples = sorted(samples) if samples and all(isinstance(n, (int, float)) and math.isfinite(n) and n > 0 for n in samples) else []
    median = (sorted_samples[(len(sorted_samples)-1)//2] + sorted_samples[len(sorted_samples)//2]) / 2 if sorted_samples else None
    p95 = sorted_samples[min(int(len(sorted_samples)*0.95), len(sorted_samples)-1)] if sorted_samples else None
    state = pacing.get("finalRenderState", {})
    if pacing.get("requestedUserPreference") != "low" or pacing.get("appliedUserPreference", "low") != "low" or pacing.get("failureReason") is not None or pacing.get("failureDiagnostic") is not None or pacing.get("failureMessage") is not None or pacing.get("worldContinuouslyActive") is not True:
        failures.append("active-route: explicit LOW preference or continuous success contract failed")
    for key in ["observedTierCounts", "tierCounts"]:
        counts = pacing.get(key, {})
        if set(counts) != {"low"} or counts.get("low", 0) <= 0 or counts.get("low") != len(frames):
            failures.append(f"active-route: {key} does not cover only LOW rendered frames")
    if pacing.get("routeDurationMs", 0) < 60000 or pacing.get("interactionsCompleted") != 60 or len(pacing.get("actions", [])) != 60 or len(samples) < 100 or len(samples) != pacing.get("totalFramesSampled"):
        failures.append("active-route: route/actions/raw frame inventory incomplete")
    if not median or median > 33.3 or not p95 or p95 > 45:
        failures.append("active-route: unchanged median/p95 thresholds failed")
    if any(frame.get("qualityTier") != "low" or frame.get("lifecycleState") not in {"HOME", "TRANSITION"} or frame.get("timestamp", 0) <= 0 or frame.get("renderCalls", 0) <= 0 or frame.get("renderedTriangles", 0) <= 0 for frame in frames):
        failures.append("active-route: raw frame contains an inactive/non-LOW world")
    if [frame.get("durationMs") for frame in frames if frame.get("durationMs", 0) > 0] != samples:
        failures.append("active-route: raw frame durations differ from raw samples")
    if state.get("qualityTier") != "low" or state.get("observedUserPreference") != "low" or state.get("lifecycleState") not in {"HOME", "TRANSITION"} or state.get("canvasConnected") is not True or state.get("canvasVisible") is not True or state.get("visibilityState") != "visible" or state.get("renderCalls", 0) <= 0 or state.get("renderedTriangles", 0) <= 0 or state.get("lastRenderedFrameTimestamp", 0) <= 0 or not state.get("currentAction") or not pacing.get("rendererIdentity") or state.get("rendererIdentity") != pacing.get("rendererIdentity") or state.get("elapsedRouteTimeMs") != pacing.get("routeDurationMs"):
        failures.append("active-route: final production render diagnostics failed")
    observations["activeRoute"] = {key: pacing.get(key) for key in [
        "buildId", "rendererIdentity", "requestedUserPreference", "appliedUserPreference", "observedTierCounts", "routeDurationMs",
        "totalFramesSampled", "medianFrameTimeMs", "p95FrameTimeMs", "interactionsCompleted", "maxRenderCalls", "maxRenderedTriangles",
        "failureReason", "failureDiagnostic", "finalRenderState",
    ]}
    observations["activeRoute"].update({"recomputedMedianMs": median, "recomputedP95Ms": p95})
    strict = report("release-manifest-validation.receipt.json")
    if strict.get("verifiedHead") != head or strict.get("releaseId") != policy["releaseId"] or strict.get("sourceCommit") != source or strict.get("overallStatus") != "PASS" or strict.get("failures") != []:
        failures.append("strict receipt: exact candidate head/source/RC6/PASS binding failed")
    observations["strictReceipt"] = {key: strict.get(key) for key in ["releaseId", "sourceCommit", "sourceAppTree", "verifiedHead", "overallStatus", "manifestSha256", "releaseBundleSha256"]}
    budget = report("budget-validation-receipt.json")
    if budget.get("overallStatus") != "PASS" or budget.get("buildId") != pacing.get("buildId") or budget.get("rendererIdentity") != pacing.get("rendererIdentity") or budget.get("failures") != []:
        failures.append("budget receipt: fresh production build/renderer/PASS binding failed")
    observations["budgetReceipt"] = {key: budget.get(key) for key in ["buildId", "rendererIdentity", "overallStatus", "metrics"]}
    return observations, failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True, type=int)
    parser.add_argument("--head", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--repo", default="yorayriniwnl/Yor-World")
    parser.add_argument("--max-archive-mib", type=int, default=128)
    parser.add_argument("--max-expanded-mib", type=int, default=256)
    parser.add_argument("--keep-zip", action="store_true")
    args = parser.parse_args()
    if args.run_id <= 0 or not re.fullmatch(r"[0-9a-f]{40}", args.head) or not re.fullmatch(r"[0-9a-f]{40}", args.source) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        parser.error("run-id, head SHA, or repository identity is invalid")
    if not 1 <= args.max_archive_mib <= 512 or not 1 <= args.max_expanded_mib <= 1024:
        parser.error("archive cap must be 1..512 MiB; expanded cap must be 1..1024 MiB")
    policy = json.loads((ROOT / "scripts/release/rc6-policy.json").read_text(encoding="utf-8"))
    if policy["releaseId"] != "v1.0.0-rc6" or not policy["deliveryRoot"].startswith("deliveries/G7/rc6-candidate") or ".." in Path(policy["deliveryRoot"]).parts:
        raise FetchError("Unexpected successor policy/output root")
    client = GitHubClient(args.max_archive_mib * 1024 * 1024)
    prefix = f"/repos/{args.repo}/actions/runs/{args.run_id}"
    run = client.api(prefix)
    attempt = run.get("run_attempt")
    if not isinstance(attempt, int) or attempt < 1:
        raise FetchError("Actions run lacks an identified attempt")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = ROOT / policy["deliveryRoot"] / "evidence/github-actions" / str(args.run_id) / f"attempt-{attempt}" / stamp
    ensure_no_symlinks(destination)
    destination.mkdir(parents=True, exist_ok=False)
    save_json(destination / "run.json", run)
    receipt = {"runId": args.run_id, "head": args.head, "runAttempt": attempt, "fetchedAt": stamp, "repository": args.repo,
               "overallStatus": "FAIL", "acceptanceClaim": False, "failures": [], "artifacts": [], "observations": {}}
    failures = receipt["failures"]
    try:
        if run.get("head_sha") != args.head:
            raise FetchError("Actions run does not match the requested exact candidate head")
        if run.get("name") != "CI / Release Quality Gate":
            raise FetchError("Specified run is not the release quality workflow")
        if run.get("status") != "completed" or run.get("conclusion") != "success":
            failures.append(f"Workflow observed {run.get('status')}/{run.get('conclusion')}; preserved without rerun")
        jobs = client.pages(prefix + f"/attempts/{attempt}/jobs", "jobs")
        save_json(destination / "jobs.json", {"runId": args.run_id, "head": args.head, "runAttempt": attempt, "jobs": jobs})
        numbered_steps = []
        for job in jobs:
            if job.get("head_sha") != args.head or job.get("conclusion") != "success":
                failures.append(f"Job {job.get('id')} did not report success at the requested head")
            for step in job.get("steps", []):
                match = re.match(r"^(\d+)\. ", step.get("name", ""))
                if match:
                    numbered_steps.append(int(match.group(1)))
                    if step.get("status") != "completed" or step.get("conclusion") != "success":
                        failures.append(f"Required step {match.group(1)} did not execute successfully")
        if sorted(numbered_steps) != list(range(1, 14)):
            failures.append("Actions job inventory does not contain all thirteen required gate steps")
        artifacts = client.pages(prefix + "/artifacts", "artifacts")
        save_json(destination / "artifacts.json", {"runId": args.run_id, "artifacts": artifacts})
        expected_name = "rc6-quality-" + args.head
        matches = [item for item in artifacts if item.get("name") == expected_name and item.get("expired") is False]
        if len(matches) != 1:
            raise FetchError("Expected exactly one unexpired quality artifact for the candidate head")
        artifact = matches[0]
        if artifact.get("workflow_run", {}).get("head_sha", args.head) != args.head or artifact.get("workflow_run", {}).get("id", args.run_id) != args.run_id:
            raise FetchError("Artifact workflow identity conflicts with requested run/head")
        if artifact.get("size_in_bytes", 0) > client.max_archive_bytes:
            raise FetchError("Artifact metadata exceeds configured archive size cap")
        artifact_id = artifact.get("id")
        if not isinstance(artifact_id, int) or artifact_id < 1:
            raise FetchError("Quality artifact lacks a valid artifact ID")
        raw = client.fetch(f"https://{API_HOST}/repos/{args.repo}/actions/artifacts/{artifact_id}/zip", client.max_archive_bytes)
        digest = hashlib.sha256(raw).hexdigest()
        if artifact.get("digest") is not None and artifact["digest"] != "sha256:" + digest:
            raise FetchError("Downloaded artifact SHA-256 conflicts with GitHub artifact metadata")
        if args.keep_zip:
            with (destination / "quality-artifact.zip").open("xb") as output:
                output.write(raw)
        extracted = destination / "quality-artifact"
        extracted_files = extract_checked(raw, extracted, args.max_expanded_mib * 1024 * 1024)
        artifact_receipt = {"artifactId": artifact_id, "name": artifact["name"], "runId": args.run_id, "runAttempt": attempt,
                            "head": args.head, "sha256": digest, "bytes": len(raw), "metadataBytes": artifact.get("size_in_bytes"),
                            "createdAt": artifact.get("created_at"), "rawZipRetained": args.keep_zip, "files": extracted_files}
        save_json(destination / "artifact-receipt.json", artifact_receipt)
        receipt["artifacts"].append(artifact_receipt)
        receipt["observations"], quality_failures = inspect_quality(extracted, args.head, args.source, policy)
        failures.extend(quality_failures)
        final_run = client.api(prefix)
        save_json(destination / "run-after-fetch.json", final_run)
        if final_run.get("head_sha") != args.head or final_run.get("run_attempt") != attempt or final_run.get("status") != run.get("status") or final_run.get("conclusion") != run.get("conclusion"):
            failures.append("Actions run/attempt changed while fetching evidence")
    except FetchError as error:
        failures.append(str(error))
    except Exception as error:
        failures.append(f"Evidence fetch/extraction/inspection failed ({type(error).__name__}); partial snapshot retained")
    receipt["overallStatus"] = "PASS" if not failures else "FAIL"
    save_json(destination / "fetch-receipt.json", receipt)
    relative = destination.relative_to(ROOT).as_posix()
    print(f"{receipt['overallStatus']} CI evidence: run {args.run_id}, attempt {attempt}, head {args.head}")
    print(f"Evidence directory: {relative}")
    for failure in failures:
        print(f"FAIL: {failure}")
    return 0 if not failures else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except FetchError as error:
        print(f"FAIL CI evidence: {error}", file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        print(f"FAIL CI evidence: local tool/network operation failed ({type(error).__name__}); credentials were not persisted", file=sys.stderr)
        sys.exit(1)
