#!/usr/bin/env python3
"""Inspect main; only --apply mutates protection, after exact pushed head/CI checks.

Credentials remain in memory; authenticated requests never follow redirects.
Evidence is append-only beneath this script's directory. No paid API/settings.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REPO = "yorayriniwnl/Yor-World"
PREFIX = "/repos/" + REPO
CONTEXTS = ["integrity", "Verify & Validate Full-Stack RC6"]
EXPECTED_ACTIONS_APP_ID = 15368
REQUIRED_STEPS = [
    "1. Frozen canonical dependency install", "2. Lint canonical application", "3. Typecheck canonical application",
    "4. Unified unit tests", "5. Unified backend/runtime integration tests", "6. Khronos frozen canonical asset validation",
    "7. Full-stack production build", "8. Full unified Playwright E2E", "9. Automated accessibility",
    "10. Fresh canonical performance browser measurements", "11. Actual production route/module composition",
    "12. Fresh canonical performance budgets", "13. Exact committed RC6 manifest/archive validation",
]
spec = importlib.util.spec_from_file_location("existing_github_fetch", HERE.parent / "tools/fetch-github.py")
fetch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch)


class Failure(RuntimeError):
    pass


SAFE_VALIDATION_FIELDS = {"required_status_checks", "strict", "contexts", "checks", "context", "app_id", "enforce_admins",
                          "required_pull_request_reviews", "dismiss_stale_reviews", "require_code_owner_reviews",
                          "required_approving_review_count", "require_last_push_approval", "restrictions", "allow_force_pushes", "allow_deletions"}


def schema_message_clues(value):
    """Only fixed categories and known mentioned names; no field/value echo."""
    if not isinstance(value, str) or len(value) > 16 * 1024:
        return ""
    lowered = value.casefold()
    patterns = [
        ("Schema alternatives did not match", r"\b(anyof|oneof|subschema)\b"),
        ("Duplicate values rejected", r"\bduplicate\b|must (be|have) unique|more than once"),
        ("Required field missing", r"\bmissing\b|required property|not supplied|not provided|wasn't supplied|wasn't provided"),
        ("Field not permitted", r"not (a )?permitted|not allowed|additional propert|unexpected propert|unrecognized propert"),
        ("Invalid field type", r"not (of )?(the )?type|is not (an? )?[\"']?(object|array|boolean|integer|string|null)|must be an? (object|array|boolean|integer|string)"),
    ]
    categories = [label for label, pattern in patterns if re.search(pattern, lowered)]
    fields = sorted(field for field in SAFE_VALIDATION_FIELDS if re.search(r"\b" + re.escape(field) + r"\b", lowered))[:8]
    clues = []
    if categories:
        clues.append("schema categories: " + ", ".join(categories))
    if fields:
        clues.append("mentioned fields: " + ", ".join(fields))
    return "; ".join(clues)


def schema_clause_diagnostics(value):
    """Preserve individual schema-clause relations using fixed safe vocabulary."""
    if not isinstance(value, str) or len(value) > 16 * 1024:
        return []
    projected = []
    # Split only structural sentence/newline boundaries; never persist a clause.
    for clause in re.split(r"\n|(?<=\.)\s+(?=For |No subschema)", value)[:32]:
        clues = schema_message_clues(clause)
        if not clues or "schema categories:" not in clues:
            continue
        expected_types = sorted(set(re.findall(
            r"(?:is not (?:an? )?|not (?:of )?(?:the )?type\s*|must be an? )['\"]?(object|array|boolean|integer|string|null)\b",
            clause.casefold())))
        message = "Schema clause: " + clues
        if expected_types:
            message += "; expected types: " + ", ".join(expected_types)
        projected.append({"message": message, "code": "invalid"})
        if len(projected) == 8:
            break
    return projected


def validation_message(value):
    """Project untrusted prose to fixed diagnostics; never echo supplied values."""
    if not isinstance(value, str) or len(value) > 16 * 1024:
        return "Validation message suppressed"
    lowered = value.casefold()
    if lowered.startswith("invalid request"):
        return "Invalid request"
    if re.search(r"\b(contexts?|checks?)\b", lowered) and any(phrase in lowered for phrase in ["must be unique", "must have unique", "duplicate", "more than once"]):
        return "Required status check contexts must be unique"
    for original, safe in [
        ("validation failed", "Validation Failed"), ("invalid request", "Invalid request"),
        ("resource not accessible by", "Resource not accessible with current credential permissions"),
        ("requires administration", "Administration permission required"),
        ("not an object", "Invalid object type"), ("not of type", "Invalid field type"),
        ("must be an integer", "Integer required"), ("must be a boolean", "Boolean required"),
        ("must be an array", "Array required"), ("must be a string", "String required"),
        ("only available for organization", "Setting restricted to organization repositories"),
        ("not found", "Referenced resource not found"),
    ]:
        if original in lowered:
            return safe
    return "Validation message suppressed"


def validation_diagnostic(raw):
    """16 KiB input cap; bounded message/field/code output from allowlists only."""
    if len(raw) > 16 * 1024:
        return {"message": "Validation body exceeded diagnostic size cap"}
    try:
        body = json.loads(raw)
    except (ValueError, UnicodeError):
        return {"message": "Validation body was not valid JSON"}
    if not isinstance(body, dict):
        return {"message": "Validation body had unexpected shape"}
    result = {"message": validation_message(body.get("message"))}
    clues = schema_message_clues(body.get("message"))
    if clues:
        result["message"] += "; " + clues
    errors = body.get("errors")
    if not isinstance(errors, list):
        clauses = schema_clause_diagnostics(body.get("message"))
        if clauses:
            result["errors"] = clauses
        return result
    safe_codes = {"missing", "missing_field", "invalid", "already_exists", "unprocessable", "custom"}
    projected = []
    for item in errors[:8]:
        if isinstance(item, str):
            projected.append({"message": validation_message(item)})
            continue
        if not isinstance(item, dict):
            continue
        entry = {}
        if "message" in item:
            entry["message"] = validation_message(item["message"])
        field = item.get("field")
        if isinstance(field, str) and len(field) <= 128:
            parts = field.split(".")
            if parts and all(part in SAFE_VALIDATION_FIELDS for part in parts):
                entry["field"] = ".".join(parts)
        code = item.get("code")
        if isinstance(code, str) and code in safe_codes:
            entry["code"] = code
        if entry:
            projected.append(entry)
    if projected:
        result["errors"] = projected
    return result


class API:
    def __init__(self):
        self.client = fetch.GitHubClient(1024 * 1024)
        self.calls = []

    def request(self, endpoint, method="GET", payload=None, absent=False):
        if not endpoint.startswith("/") or endpoint.startswith("//"):
            raise Failure("Invalid API endpoint")
        if method != "GET" and not (method == "PUT" and endpoint == PREFIX + "/branches/main/protection"):
            raise Failure("Mutation outside main protection is forbidden")
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "yor-world-g7-governance",
                   "X-GitHub-Api-Version": "2022-11-28", "Authorization": "Bearer " + self.client.credential()}
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        if data is not None:
            headers["Content-Type"] = "application/json"
        try:
            with self.client.opener.open(Request("https://api.github.com" + endpoint, data=data,
                                                 headers=headers, method=method), timeout=45) as response:
                status = response.status
                raw = response.read(4 * 1024 * 1024 + 1)
        except HTTPError as error:
            status = error.code
            call = {"method": method, "endpoint": endpoint, "status": status}
            detail = None
            try:
                if status == 422:
                    detail = validation_diagnostic(error.read(16 * 1024 + 1))
                    call["validation"] = detail
            except Exception:
                detail = {"message": "Validation diagnostic unavailable"}
                call["validation"] = detail
            finally:
                error.close()
            self.calls.append(call)
            if status == 404 and absent:
                return None
            suffix = "; safe validation: " + json.dumps(detail) if detail is not None else "; no redirects or error bodies logged"
            raise Failure(f"GitHub API {method} {endpoint} returned HTTP {status}" + suffix) from None
        except (URLError, TimeoutError, OSError):
            raise Failure(f"GitHub API {method} {endpoint} network/timeout failure") from None
        self.calls.append({"method": method, "endpoint": endpoint, "status": status})
        if len(raw) > 4 * 1024 * 1024:
            raise Failure("GitHub response exceeded size cap")
        try:
            return json.loads(raw)
        except (ValueError, UnicodeError):
            raise Failure("GitHub response was not valid JSON") from None

    def pages(self, endpoint, key=None):
        records = []
        for page in range(1, 101):
            separator = "&" if "?" in endpoint else "?"
            body = self.request(f"{endpoint}{separator}per_page=100&page={page}")
            items = body if key is None else body.get(key)
            if not isinstance(items, list):
                raise Failure("Invalid paginated inventory")
            records.extend(items)
            if len(items) < 100:
                return records
        raise Failure("Pagination cap exceeded")


def write(destination, name, value):
    with (destination / name).open("x", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, indent=2)
        output.write("\n")


def inventory(api):
    user = api.request("/user")
    repository = api.request(PREFIX)
    branch = api.request(PREFIX + "/branches/main")
    protection = api.request(PREFIX + "/branches/main/protection", absent=True)
    if protection is None and branch.get("protected"):
        raise Failure("main is protected but protection GET returned 404; permissions/state unresolved")
    rulesets = api.pages(PREFIX + "/rulesets?includes_parents=true")
    collaborators = api.pages(PREFIX + "/collaborators?affiliation=all")
    head = branch["commit"]["sha"]
    checks = api.pages(PREFIX + f"/commits/{head}/check-runs?filter=latest", "check_runs")
    statuses = api.pages(PREFIX + f"/commits/{head}/statuses")
    historical_checks = []
    if not all(any(item.get("name") == name for item in checks) for name in CONTEXTS):
        runs = api.request(PREFIX + "/actions/workflows/ci.yml/runs?branch=main&per_page=5").get("workflow_runs", [])
        for run in runs:
            if run.get("head_sha") == head:
                continue
            prior = api.pages(PREFIX + f"/commits/{run['head_sha']}/check-runs?filter=latest", "check_runs")
            historical_checks.extend(item for item in prior if item.get("name") in CONTEXTS)
            if any(item.get("name") == CONTEXTS[1] for item in historical_checks):
                break
    quality_job = None
    quality_run = None
    quality_matches = [item for item in checks if item.get("name") == CONTEXTS[1]]
    if len(quality_matches) == 1:
        details = quality_matches[0].get("details_url") or ""
        identity = re.fullmatch(r"https://github\.com/yorayriniwnl/Yor-World/actions/runs/([0-9]+)/job/([0-9]+)", details)
        if not identity:
            raise Failure("RC6 check lacks expected repository job identity URL")
        job = api.request(PREFIX + "/actions/jobs/" + identity.group(2))
        run = api.request(PREFIX + "/actions/runs/" + identity.group(1))
        quality_job = {key: job.get(key) for key in ["id", "run_id", "run_attempt", "head_sha", "name", "status", "conclusion", "steps"]}
        quality_run = {key: run.get(key) for key in ["id", "run_attempt", "head_sha", "status", "conclusion", "event", "path", "html_url"]}
    return {
        "authenticatedLogin": user.get("login"), "authenticatedAccountPlan": (user.get("plan") or {}).get("name", "UNKNOWN"),
        "repository": {key: repository.get(key) for key in ["full_name", "private", "visibility", "default_branch", "permissions"]},
        "owner": {key: repository.get("owner", {}).get(key) for key in ["login", "type"]},
        "main": {"sha": head, "protected": branch.get("protected")}, "protection": protection, "rulesets": rulesets,
        "collaborators": [{key: item.get(key) for key in ["login", "role_name", "permissions"]} for item in collaborators],
        "checks": [{"id": item.get("id"), "name": item.get("name"), "head_sha": item.get("head_sha"),
                    "status": item.get("status"), "conclusion": item.get("conclusion"), "completed_at": item.get("completed_at"),
                    "details_url": item.get("details_url"), "app": {key: item.get("app", {}).get(key) for key in ["id", "slug"]}} for item in checks],
        "historicalChecksForDraftOnly": [{"id": item.get("id"), "name": item.get("name"), "head_sha": item.get("head_sha"),
                    "status": item.get("status"), "conclusion": item.get("conclusion"), "completed_at": item.get("completed_at"),
                    "details_url": item.get("details_url"), "app": {key: item.get("app", {}).get(key) for key in ["id", "slug"]}} for item in historical_checks],
        "currentQualityJob": quality_job, "currentQualityRun": quality_run,
        "statuses": [{key: item.get(key) for key in ["context", "state", "created_at", "target_url"]} for item in statuses],
    }


def expected_checks(observed):
    checks = []
    for name in CONTEXTS:
        matches = [item for item in observed["checks"] if item["name"] == name]
        if not matches:
            matches = [item for item in observed["historicalChecksForDraftOnly"] if item["name"] == name]
        if len(matches) != 1 or matches[0]["app"].get("slug") != "github-actions" or matches[0]["app"].get("id") != EXPECTED_ACTIONS_APP_ID:
            raise Failure(f"Expected one actual GitHub Actions check context: {name}")
        checks.append({"context": name, "app_id": matches[0]["app"]["id"]})
    return checks


def draft(observed):
    expected_checks(observed)  # Validate actual provider observations before drafting.
    # Legacy wire representation only. Recent app bindings MUST survive GET readback.
    return {"required_status_checks": {"strict": True, "contexts": CONTEXTS},
            "enforce_admins": False,
            "required_pull_request_reviews": {"dismiss_stale_reviews": True, "require_code_owner_reviews": False,
                                              "required_approving_review_count": 1, "require_last_push_approval": False},
            "restrictions": None, "allow_force_pushes": False, "allow_deletions": False}


def readback_failures(protection, payload, expected_checks):
    if not protection:
        return ["Protection missing"]
    failures = []
    checks = protection.get("required_status_checks") or {}
    if checks.get("strict") is not True or set(checks.get("contexts", [])) != set(CONTEXTS):
        failures.append("Required exact check contexts/strict readback mismatch")
    if {(item.get("context"), item.get("app_id")) for item in checks.get("checks", [])} != {(item["context"], item["app_id"]) for item in expected_checks}:
        failures.append("Required check provider bindings readback mismatch")
    reviews = protection.get("required_pull_request_reviews") or {}
    for key, value in payload["required_pull_request_reviews"].items():
        if reviews.get(key) != value:
            failures.append(f"Review requirement readback mismatch: {key}")
    for key in ["enforce_admins", "allow_force_pushes", "allow_deletions"]:
        if (protection.get(key) or {}).get("enabled") is not False:
            failures.append(f"Boolean requirement readback mismatch: {key}")
    if protection.get("restrictions") is not None:
        failures.append("Unexpected push restrictions")
    return failures


def quality_failures(observed, expected_head):
    job, run = observed.get("currentQualityJob"), observed.get("currentQualityRun")
    if not job or not run:
        return ["Exact-head RC6 job/run evidence absent"]
    failures = []
    if job.get("name") != CONTEXTS[1] or job.get("head_sha") != expected_head or run.get("head_sha") != expected_head or job.get("run_id") != run.get("id") or job.get("run_attempt") != run.get("run_attempt"):
        failures.append("Exact-head RC6 job/run/attempt binding mismatch")
    if run.get("event") != "push" or run.get("path") != ".github/workflows/ci.yml":
        failures.append("RC6 proof must be the canonical push workflow")
    for item in [job, run]:
        if item.get("status") != "completed" or item.get("conclusion") != "success":
            failures.append("Exact-head RC6 job/run did not succeed")
    numbered = {}
    for step in job.get("steps") or []:
        match = re.match(r"^(\d+)\. ", step.get("name", ""))
        if match:
            numbered.setdefault(int(match.group(1)), []).append(step)
    if set(numbered) != set(range(1, 14)):
        failures.append("All 13 required CI steps must exist exactly once")
    for number in range(1, 14):
        steps = numbered.get(number, [])
        if len(steps) != 1 or steps[0].get("name") != REQUIRED_STEPS[number - 1] or steps[0].get("status") != "completed" or steps[0].get("conclusion") != "success":
            failures.append(f"Required CI step {number} absent, duplicated, skipped or unsuccessful")
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-head", help="Required for apply: final committed and pushed main SHA")
    args = parser.parse_args()
    if args.apply and (not args.expected_head or not re.fullmatch(r"[0-9a-f]{40}", args.expected_head)):
        parser.error("--apply requires --expected-head <40 lowercase hex SHA>")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = HERE / "evidence" / (("apply-" if args.apply else "inspect-") + stamp)
    fetch.ensure_no_symlinks(destination)
    destination.mkdir(parents=True, exist_ok=False)
    api = API()
    receipt = {"timestampUtc": stamp, "repository": REPO, "branch": "main", "mode": "apply" if args.apply else "inspect",
               "remoteMutationAttempted": False, "remoteMutationCompleted": False, "debtResolved": False, "failures": []}
    try:
        before = inventory(api)
        write(destination, "before.json", before)
        payload = draft(before)
        write(destination, "protection-payload.json", payload)
        expected_provider_checks = expected_checks(before)
        write(destination, "expected-checks.json", {"expectedChecks": expected_provider_checks, "wireRepresentation": "legacy-contexts-only"})
        receipt["observedHead"] = before["main"]["sha"]
        receipt["independentWriteReviewers"] = [item["login"] for item in before["collaborators"]
            if item["login"] != before["owner"]["login"] and (item.get("permissions") or {}).get("push")]
        if not args.apply:
            receipt["note"] = "Read-only preparation; protection not applied and governance debt remains unresolved"
        else:
            if not (before["repository"].get("permissions") or {}).get("admin"):
                raise Failure("Authenticated account lacks repository admin permission")
            if before["repository"].get("private") is not False:
                raise Failure("Public/free-capable repository prerequisite failed; no purchase or upgrade authorized")
            if before["main"]["sha"] != args.expected_head:
                raise Failure("Remote main differs from final expected pushed head")
            local = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=False)
            if local.returncode or local.stdout.strip() != args.expected_head:
                raise Failure("Local HEAD differs from final expected pushed head")
            for name in CONTEXTS:
                matches = [item for item in before["checks"] if item["name"] == name]
                if len(matches) != 1:
                    raise Failure(f"Required exact pushed-head check is absent/ambiguous: {name}")
                item = matches[0]
                if item["head_sha"] != args.expected_head or item["status"] != "completed" or item["conclusion"] != "success":
                    raise Failure(f"Required exact pushed-head check is not successful: {name}")
            quality_errors = quality_failures(before, args.expected_head)
            if quality_errors:
                raise Failure("; ".join(quality_errors))
            if before["rulesets"]:
                raise Failure("Existing rulesets require parent reconciliation before applying this minimal protection")
            if before["protection"] is not None:
                raise Failure("Existing protection requires parent reconciliation; refusing to overwrite it")
            # Recheck head immediately before the one permitted remote mutation.
            if api.request(PREFIX + "/branches/main")["commit"]["sha"] != args.expected_head:
                raise Failure("Remote main changed during preflight")
            receipt["remoteMutationAttempted"] = True
            response = api.request(PREFIX + "/branches/main/protection", method="PUT", payload=payload)
            receipt["remoteMutationCompleted"] = True
            write(destination, "apply-response.json", response)
            after = inventory(api)
            write(destination, "after.json", after)
            receipt["failures"].extend(readback_failures(after["protection"], payload, expected_provider_checks))
            if after["main"]["sha"] != args.expected_head or after["main"]["protected"] is not True or after["rulesets"]:
                receipt["failures"].append("Post-apply main head/protected/rulesets mismatch")
            receipt["debtResolved"] = not receipt["failures"]
    except (Failure, fetch.FetchError) as error:
        receipt["failures"].append(str(error))
    except Exception as error:
        receipt["failures"].append(f"Operation failed ({type(error).__name__}); credentials were not persisted")
    receipt["apiCalls"] = api.calls
    receipt["overallStatus"] = "FAIL" if receipt["failures"] else "PASS"
    write(destination, "receipt.json", receipt)
    print(f"{receipt['overallStatus']} {receipt['mode']}: {destination.relative_to(ROOT).as_posix()}")
    print(f"Remote mutation completed: {receipt['remoteMutationCompleted']}; debt resolved: {receipt['debtResolved']}")
    for failure in receipt["failures"]:
        print("FAIL: " + failure)
    return 1 if receipt["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
