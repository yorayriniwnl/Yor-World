#!/usr/bin/env python3
"""GET-only GitHub deployment/access inventory. Never persist credentials/values."""
import base64
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PREFIX = "/repos/yorayriniwnl/Yor-World"
spec = importlib.util.spec_from_file_location("existing_github_fetch", HERE.parent / "tools/fetch-github.py")
fetch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch)


def host_only(value):
    """Exclude paths, signed query strings, userinfo, and ports."""
    try:
        parsed = urlsplit(value or "")
        return parsed.hostname if parsed.scheme in {"https", "http"} else None
    except ValueError:
        return None


class API:
    def __init__(self):
        self.client = fetch.GitHubClient(1024 * 1024)
        self.calls = []

    def get(self, endpoint):
        if not (endpoint == "/user" or endpoint.startswith("/user/installations")
                or endpoint == PREFIX or endpoint.startswith(PREFIX + "/")):
            raise RuntimeError("Endpoint outside assigned repository/user inventory")
        if "\\" in endpoint or "#" in endpoint or "\n" in endpoint:
            raise RuntimeError("Invalid API endpoint")
        url = "https://api.github.com" + endpoint
        if urlsplit(url).hostname != "api.github.com":
            raise RuntimeError("Unexpected API host")
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "yor-world-read-only-existing-access-probe",
                   "X-GitHub-Api-Version": "2022-11-28", "Authorization": "Bearer " + self.client.credential()}
        receipt = {"method": "GET", "endpoint": endpoint, "startedAt": datetime.now(timezone.utc).isoformat()}
        try:
            with self.client.opener.open(Request(url, headers=headers, method="GET"), timeout=35) as response:
                receipt.update({"status": response.status, "requestId": response.headers.get("X-GitHub-Request-Id"),
                                "oauthScopeNames": response.headers.get("X-OAuth-Scopes"),
                                "acceptedPermissionNames": response.headers.get("X-Accepted-GitHub-Permissions")})
                raw = response.read(4 * 1024 * 1024 + 1)
        except HTTPError as error:
            receipt.update({"status": error.code, "requestId": error.headers.get("X-GitHub-Request-Id"),
                            "acceptedPermissionNames": error.headers.get("X-Accepted-GitHub-Permissions"),
                            "redirectFollowed": False})
            error.close()
            self.calls.append(receipt)
            return None
        except (URLError, TimeoutError, OSError):
            receipt.update({"status": "NETWORK_OR_TIMEOUT_FAILURE", "redirectFollowed": False})
            self.calls.append(receipt)
            return None
        receipt["redirectFollowed"] = False
        self.calls.append(receipt)
        if len(raw) > 4 * 1024 * 1024:
            raise RuntimeError("Response size cap exceeded")
        return json.loads(raw)

    def pages(self, endpoint, key=None):
        records = []
        page_size = 30 if endpoint.endswith("/variables") else 100
        for page in range(1, 11):
            separator = "&" if "?" in endpoint else "?"
            body = self.get(endpoint + separator + f"per_page={page_size}&page={page}")
            if body is None:
                return {"accessible": False, "records": records, "complete": False}
            items = body if key is None else body.get(key)
            if not isinstance(items, list):
                return {"accessible": True, "records": records, "complete": False}
            records.extend(items)
            if len(items) < page_size:
                return {"accessible": True, "records": records, "complete": True}
        return {"accessible": True, "records": records, "complete": False, "limit": 10 * page_size}


def pick(obj, names):
    return {name: obj.get(name) for name in names}


def named_inventory(api, endpoint, key):
    result = api.pages(endpoint, key)
    # Variable values may arrive in API responses, but are neither selected,
    # printed, copied to receipts, nor used as credentials.
    return {**{name: value for name, value in result.items() if name != "records"},
            "names": [item.get("name") for item in result["records"]]}


def main():
    api = API()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = HERE / ("snapshot-" + stamp)
    fetch.ensure_no_symlinks(destination)
    destination.mkdir(exist_ok=False)
    result = {"repository": "yorayriniwnl/Yor-World", "observedAt": stamp, "acceptanceClaim": False,
              "deploymentPerformed": False, "apiMutationsPerformed": False,
              "credentialHandling": "Existing Git credential used only in memory; authenticated GETs only to literal api.github.com; no redirects",
              "retention": "Allowlisted metadata only. No secret/variable values, credential tokens, external destination URL paths or URL queries retained.",
              "inputs": []}
    for name in ["START_HERE.md", "docs/planning/delegation-and-work-orders.md",
                 "deliveries/G7/preparation/owner-authorization.json", "deliveries/G7/preparation/access-status-2026-10-07.json"]:
        data = (ROOT / name).read_bytes()
        result["inputs"].append({"path": name, "sha256": hashlib.sha256(data).hexdigest()})
    user = api.get("/user") or {}
    result["authenticatedLogin"] = user.get("login")
    repo = api.get(PREFIX) or {}
    result["repositoryMetadata"] = pick(repo, ["full_name", "private", "visibility", "default_branch", "permissions"])
    result["repositoryOwner"] = pick(repo.get("owner") or {}, ["login", "type"])
    branch = api.get(PREFIX + "/branches/main") or {}
    head = (branch.get("commit") or {}).get("sha")
    result["mainHead"] = head
    result["actionsSecrets"] = named_inventory(api, PREFIX + "/actions/secrets", "secrets")
    result["actionsVariables"] = named_inventory(api, PREFIX + "/actions/variables", "variables")
    environments = api.pages(PREFIX + "/environments", "environments")
    result["environments"] = {**{k: v for k, v in environments.items() if k != "records"}, "items": []}
    for item in environments["records"]:
        name = item.get("name")
        entry = pick(item, ["id", "name", "created_at", "updated_at"])
        if isinstance(name, str):
            env = PREFIX + "/environments/" + quote(name, safe="")
            entry["secretNames"] = named_inventory(api, env + "/secrets", "secrets")
            entry["variableNames"] = named_inventory(api, env + "/variables", "variables")
        result["environments"]["items"].append(entry)
    deployments = api.pages(PREFIX + "/deployments")
    result["deployments"] = {**{k: v for k, v in deployments.items() if k != "records"}, "items": []}
    for item in deployments["records"][:30]:
        entry = pick(item, ["id", "sha", "ref", "task", "environment", "created_at", "updated_at", "transient_environment", "production_environment"])
        entry["creatorLogin"] = (item.get("creator") or {}).get("login")
        statuses = api.pages(PREFIX + f"/deployments/{item['id']}/statuses")
        entry["statusesAccessible"] = statuses["accessible"]
        entry["statusesComplete"] = statuses["complete"]
        entry["statuses"] = [{**pick(s, ["id", "state", "environment", "created_at", "updated_at"]),
                              "creatorLogin": (s.get("creator") or {}).get("login"),
                              "environmentHost": host_only(s.get("environment_url")), "targetHost": host_only(s.get("target_url")),
                              "logHost": host_only(s.get("log_url"))} for s in statuses["records"]]
        result["deployments"]["items"].append(entry)
    if len(deployments["records"]) > 30:
        result["deployments"]["statusesInspectionLimit"] = 30
    hooks = api.pages(PREFIX + "/hooks")
    result["webhooks"] = {**{k: v for k, v in hooks.items() if k != "records"},
                          "items": [{**pick(h, ["id", "name", "active", "events", "created_at", "updated_at"]),
                                     "destinationHost": host_only((h.get("config") or {}).get("url"))} for h in hooks["records"]]}
    installs = api.pages("/user/installations", "installations")
    result["userVisibleInstallations"] = {**{k: v for k, v in installs.items() if k != "records"},
        "items": [{**pick(i, ["id", "app_id", "app_slug", "repository_selection", "suspended_at"]),
                   "accountLogin": (i.get("account") or {}).get("login")} for i in installs["records"]],
        "limitation": "This endpoint lists installations accessible to the authenticating GitHub App user token, not a complete inventory of all apps installed by the account. It does not establish that an app is connected to this repository."}
    workflows = api.pages(PREFIX + "/actions/workflows", "workflows")
    result["workflows"] = {**{k: v for k, v in workflows.items() if k != "records"}, "items": []}
    for item in workflows["records"]:
        entry = pick(item, ["id", "name", "path", "state", "created_at", "updated_at"])
        path = item.get("path")
        if isinstance(path, str) and path.startswith(".github/workflows/") and head:
            contents = api.get(PREFIX + "/contents/" + quote(path, safe="/") + "?ref=" + head)
            if contents and contents.get("encoding") == "base64":
                raw = base64.b64decode(contents.get("content", ""))
                text = raw.decode("utf-8", errors="replace")
                entry["inspectedContentSha256"] = hashlib.sha256(raw).hexdigest()
                entry["secretReferenceNames"] = sorted(set(re.findall(r"secrets\.([A-Za-z_][A-Za-z_0-9]*)", text)))
                entry["variableReferenceNames"] = sorted(set(re.findall(r"vars\.([A-Za-z_][A-Za-z_0-9]*)", text)))
                entry["providerKeywordNames"] = [word for word in ["vercel", "supabase", "resend", "netlify", "cloudflare"] if re.search(r"\b" + word + r"\b", text, re.I)]
                entry["deploymentCommandIndicators"] = sorted(set(re.findall(r"\b(?:vercel\s+(?:deploy|--prod)|supabase\s+(?:db\s+push|functions\s+deploy)|deploy-pages|deploy-to-vercel|netlify\s+deploy)\b", text, re.I)))
        result["workflows"]["items"].append(entry)
    pages = api.get(PREFIX + "/pages")
    result["pages"] = {"accessible": pages is not None, "metadata": pick(pages or {}, ["status", "public", "build_type"])}
    if pages:
        result["pages"]["host"] = host_only(pages.get("html_url"))
    result["commitIntegrationSignals"] = []
    # Check the actual current head and up to nine recent default-branch commits.
    commits = api.get(PREFIX + "/commits?sha=main&per_page=10")
    revisions = [c.get("sha") for c in commits] if isinstance(commits, list) else []
    revisions = list(dict.fromkeys(([head] if head else []) + revisions))[:10]
    for sha in revisions:
        if not isinstance(sha, str) or not re.fullmatch("[0-9a-f]{40}", sha):
            continue
        checks = api.pages(PREFIX + f"/commits/{sha}/check-runs?filter=latest", "check_runs")
        statuses = api.pages(PREFIX + f"/commits/{sha}/statuses")
        result["commitIntegrationSignals"].append({"sha": sha, "checksAccessible": checks["accessible"], "checksComplete": checks["complete"],
            "checks": [{**pick(c, ["id", "name", "status", "conclusion", "completed_at"]),
                        "app": pick(c.get("app") or {}, ["id", "slug", "name"]),
                        "detailsHost": host_only(c.get("details_url"))} for c in checks["records"]],
            "statusesAccessible": statuses["accessible"], "statusesComplete": statuses["complete"],
            "statuses": [{**pick(s, ["id", "context", "state", "created_at"]), "creatorLogin": (s.get("creator") or {}).get("login"),
                          "targetHost": host_only(s.get("target_url"))} for s in statuses["records"]]})
    result["readOnlyReceipts"] = api.calls
    fetch.save_json(destination / "receipt.json", result)
    print(json.dumps({"receipt": str((destination / "receipt.json").relative_to(ROOT)), "mainHead": head,
                      "repositoryPermissions": result["repositoryMetadata"].get("permissions"),
                      "actionsSecrets": result["actionsSecrets"], "actionsVariables": result["actionsVariables"],
                      "environmentNames": [i.get("name") for i in result["environments"]["items"]],
                      "deploymentsAccessible": result["deployments"]["accessible"], "deploymentCount": len(deployments["records"]),
                      "webhooksAccessible": result["webhooks"]["accessible"], "webhookCount": len(hooks["records"]),
                      "userInstallationsAccessible": result["userVisibleInstallations"]["accessible"],
                      "workflowNames": [i.get("name") for i in result["workflows"]["items"]],
                      "httpStatuses": {str(code): sum(call["status"] == code for call in api.calls) for code in set(call["status"] for call in api.calls)},
                      "apiMutationsPerformed": False}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Probe failed: " + type(error).__name__ + "; no credentials or response bodies logged", file=sys.stderr)
        sys.exit(1)
