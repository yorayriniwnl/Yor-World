"""Aggregate independent results without changing production or reviewer artifacts."""
import datetime, hashlib, json, pathlib, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
head = "2a1864a0648146462b45ba25e0bbc797cf37f3cd"
implementation = "02380c323154fdf0815e10543de0a936619f2b79"
tree = "3586e0c8674faac3f73bcab4d17f646e3b2e9191"
def read(path):
    return json.loads((root / path).read_text(encoding="utf-8-sig"))
def write(path, value):
    (root / path).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
def summarize(path):
    data = read(path)
    return {"result": path, "files": len(data["testResults"]),
        "total": data["numTotalTests"], "passed": data["numPassedTests"],
        "failed": data["numFailedTests"], "skipped": data["numPendingTests"], "success": data["success"]}

checks = {name: read(f"evidence/{name}.json") for name in ["frozen-install", "lint", "unit", "integration", "production-build", "typecheck"]}
tests = {"unit": summarize("evidence/unit-results.json"),
         "integration": summarize("evidence/integration-results.json"),
         "security-outbox": summarize("reviewers/security-outbox/vitest-results.json"),
         "media": summarize("reviewers/media/results-final.json"),
         "telemetry-github": summarize("reviewers/telemetry-github/results.json")}
findings = []
for lane in ["security-outbox", "media", "telemetry-github"]:
    for item in read(f"reviewers/{lane}/findings.json")["findings"]:
        findings.append({**item, "reviewer": f"Fresh GPT-6.1 Sol/Codex {lane}",
                         "evidenceBase": f"reviewers/{lane}/"})
order = [f"SCP-{number:02}" for number in range(1, 8)] + ["SOURCE-TELEMETRY-MAP"]
closure = sorted([item for item in findings if item["id"] in order], key=lambda item: order.index(item["id"]))
assert len(closure) == 8
assert [item["id"] for item in closure if item["blocksRC4"]] == ["SCP-04", "SCP-07"]
assert all(check["exitCode"] == 0 for check in checks.values())
write("defects.json", {"auditedHead": head, "auditedAppTree": tree, "implementationCommit": implementation,
    "decision": "PLATFORM REWORK REQUIRED", "reviewKind": "Fresh-agent maker-independent local verification; requested Gemini NOT RUN",
    "closureMatrix": closure, "newP0P1Findings": [],
    "otherFindings": [item for item in findings if item["id"] not in order],
    "contractCrosscheck": "reviewers/contract-crosscheck/findings.json",
    "mediaFailureInterpretation": {"actualFailedExpectations": 3, "unambiguousCorruptFrameFailures": 1,
        "animationPolicyAssumptionFailures": 2, "corruptValidatorAccepted": True,
        "executed201PostWasValidApng": True, "corruptApngPost": "NOT RUN"},
    "gates": {"G1-G5": "ACCEPTED", "G6": "ACTIVE / REWORK", "G7": "LOCKED"}})
write("evidence/fresh-check-summary.json", {"checks": {name: {"exitCode": check["exitCode"],
    "seconds": check["seconds"], "receipt": f"evidence/{name}.json"} for name, check in checks.items()},
    "tests": tests, "focusedTotals": {key: sum(tests[lane][key] for lane in ["security-outbox", "media", "telemetry-github"])
    for key in ["total", "passed", "failed", "skipped"]}, "makerCountsReused": False})

source_paths = ["app/src/server/jobs/outbox-worker.ts", "app/src/server/media/validate-upload.ts",
    "app/src/app/api/admin/media/route.ts", "app/src/server/telemetry/events.ts", "app/src/app/api/events/route.ts",
    "app/src/server/integrations/github.ts", "app/supabase/operations/harden-publication-grants.sql",
    "app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql", "app/supabase/migrations/20261001000001_a4_publication_media.sql",
    "app/src/server/content/publish.ts", "app/src/server/database.ts", "app/src/server/contact/email-adapter.ts",
    "app/package.json", "app/pnpm-lock.yaml"]
repo = root.parents[2]
source_binding = []
for path in source_paths:
    body = subprocess.check_output(["git", "show", f"{head}:{path}"], cwd=repo)
    source_binding.append({"path": path, "bytes": len(body), "canonicalGitBlobSha256": hashlib.sha256(body).hexdigest(),
        "gitBlob": subprocess.check_output(["git", "rev-parse", f"{head}:{path}"], cwd=repo).decode().strip()})
write("verification-identity.json", {"auditedHead": head, "auditedAppTree": tree, "implementationCommit": implementation,
    "returnDate": "2026-10-04", "capturedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "requestedVerifier": "Gemini Pro; Extended Thinking/highest available", "requestedVerifierExecution": "NOT RUN",
    "reason": "No callable Gemini tool available in this Codex session; provider-independent execution not claimed",
    "actualVerifiers": [{"task": "iv_" + lane.replace("-", "_"), "model": "gpt-6.1-sol",
        "fork": "none", "role": "Fresh verifier, no correction maker participation",
        "artifacts": f"reviewers/{lane}/"} for lane in ["security-outbox", "media", "telemetry-github", "contract-crosscheck"]],
    "parent": {"role": "Prior implementation coordinator; fresh execution capture and aggregation only",
        "acceptanceAuthorityUsed": False},
    "executionEnvironment": read("evidence/execution-environment.json"), "sourceBindings": source_binding,
    "freshTests": tests, "decision": "PLATFORM REWORK REQUIRED", "productionModified": False,
    "candidateRegenerated": False, "rc4Created": False, "g6Accepted": False, "g7Started": False,
    "formalGeminiOrIndependentAccountAudit": "NOT RUN", "sourceLineEndings": "Git canonical LF; Windows primary checkout may use CRLF; reviewer normalized comparisons retained",
    "inputProvenance": "evidence/input-hashes.json", "immutability": "evidence/immutability.json",
    "ciEvidence": ["evidence/github-ci-observation.json", "evidence/github-ci-log-receipts.json"]})

lines = ["# Independent verification commands and actual exits", "",
    "Canonical execution working directory: `C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app`, pinned to audited HEAD2a1864a and app3586e0c. Parent invoked each argv below through `tools/run-command.py --cwd <that app> --output <this root>/evidence/<name> -- <argv>`. That helper sets CI=true, captures raw output, checks source before/after and returns the underlying exit code. All production source deltas were empty. Build and typecheck ran sequentially.", "",
    "| Check | Actual argv | Exit | Result | Receipt/log |", "| --- | --- | --- | --- | --- |"]
for name, check in checks.items():
    result = f"{tests[name]['passed']}/{tests[name]['total']} PASS" if name in tests else "PASS"
    lines.append(f"| {name} | `{json.dumps(check['command'])}` | {check['exitCode']} | {result}; {check['seconds']}s | [receipt](evidence/{name}.json), [raw log](evidence/{name}.log) |")
lines += ["", "Version commands ran from primary workspace: `node --version`0/v24.19.0; `pnpm.cmd --version`0/9.15.9; `python --version`0/3.12.10; `git --version`0/2.55.0.windows.5. Actual outputs: [environment receipt](evidence/execution-environment.json). Worktree creation: `git -c core.longpaths=true worktree add --detach C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186 2a1864a0648146462b45ba25e0bbc797cf37f3cd`, exit0. No production branch/source was changed by checkout creation.", "",
    "| Fresh verifier | Actual final command | Underlying exit | Count / evidence |", "| --- | --- | --- | --- |"]
security_commands = read("reviewers/security-outbox/commands.json")
if isinstance(security_commands, dict):
    security_commands = security_commands.get("commands", [])
final_security = next((item for item in reversed(security_commands) if "vitest" in str(item.get("command", item.get("argv", "")))), None)
security_argv = final_security.get("command", final_security.get("argv")) if final_security else "See reviewer command ledger"
lines.append(f"| security/outbox | `{json.dumps(security_argv)}` | 0 | 63/63 PASS; [complete argv ledger](reviewers/security-outbox/commands.json), [final log](reviewers/security-outbox/command-11.log) |")
lines += ["| media | `node node_modules/vitest/vitest.mjs run --config <owned media>/vitest.config.mjs --reporter=json --outputFile=<owned media>/results-final.json` | **1** | 31/34 PASS,3 FAIL; [final raw log](reviewers/media/logs/probes-final.log), [results](reviewers/media/results-final.json), [executed command account](reviewers/media/report.md) |",
    "| telemetry/GitHub | `./node_modules/.bin/vitest.cmd run --config <owned telemetry-github>/vitest.config.mjs --reporter=verbose --reporter=json --outputFile=<owned telemetry-github>/results.json` | 0 | 12/12 PASS; [exact command ledger](reviewers/telemetry-github/commands-and-exit-codes.md), [final log](reviewers/telemetry-github/run-final.log) |",
    "| contract challenge | Source/contract/evidence inspection | N/A | No tests claimed; [report](reviewers/contract-crosscheck/report.md) |", "",
    "All owned external configs point to the fresh checkout's installed modules and canonical source. Node test loader substitutes server-only; real browser boundary evidence is separately captured in media/boundary-results.json from the actual production build. Focused final totals109 tests/106PASS/3FAIL/0SKIP. Passing counterexample tests do not mean requirement compliance.", "",
    "Retained earlier executions: security57-case run PASS plus initial pre-install MODULE_NOT_FOUND launcher failure and probe-harness parse/output-encoding failures; [honest retention limitations](reviewers/security-outbox/harness-failures.md). Its parse-error raw log was overwritten after a harness print/ledger error; the diagnostic and limitation are disclosed, not represented as retained complete evidence. Only owned probe/harness files were repaired. Media initial31-case run30PASS/1FAIL remains results.json/logs/probes.log; final34-case run was justified by corrupt-second-frame and exact-byte-limit evidence. Telemetry initial11-case PASS run.log remains; final12-case PASS added durable snapshot proof. Final result JSONs replace earlier JSONs only within new verifier roots, and retained logs distinguish executions.", "",
    "Media fixture/oracle/import-graph commands `python <owned media>/generate.py`, `python <owned media>/apng-detail.py`, `python <owned media>/boundary.py` each exited0; logs/fixtures/manifests and oracle JSON are retained in its root. Probe outer PowerShell wrappers sometimes exited0 after explicitly recording Vitest EXIT=1; the table reports **Vitest's actual1**, not wrapper success.", "",
    "Read-only context commands from primary workspace: `python <return>/tools/observe-ci.py`0; `python <return>/tools/read-ci-logs.py`0; `python <return>/tools/capture-context.py`0. API metadata, raw logs, log SHA256s, input hashes and source/protected-path comparisons are retained in evidence/. GitHub API credentials were not printed/saved; signed-storage redirects used a fresh unauthenticated request. Hosted platform tests were not performed.", "",
    "Discovery limits: initial guesses for app/src/experience/QualityPolicy.ts, .github/workflows/release-quality.yml and api/internal/jobs/route.ts did not exist; actual room/quality-policy.ts, ci.yml and api/internal/jobs/[job]/route.ts were located. No claim of inspecting nonexistent files. Worker ledger documents its own guessed-file failures and temporary log placement. These were discovery/harness failures, not product check passes. No production workaround was introduced.", "",
    "NOT RUN: requested Gemini; fresh local E2E/a11y/performance; hosted Auth/REST/Storage/GitHub/mail; independent PostgreSQL sessions; production scaling/restart/clocks; physical devices; deployment/G6 acceptance/G7. CI97/17/6 and later5/6 performance counts are attributed external CI observations only."]
(root / "commands-and-exit-codes.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(json.dumps({"decision": "PLATFORM REWORK REQUIRED", "tests": tests, "closure": [{"id": item["id"], "status": item["status"], "blocksRC4": item["blocksRC4"]} for item in closure]}))
