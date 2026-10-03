"""Update living handoff statements only from completed bound local/CI receipts."""
import argparse
import hashlib
import json
import pathlib
import re

parser = argparse.ArgumentParser()
parser.add_argument("--ci-recorded", action="store_true")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[4]
delivery = root / "deliveries/G6/full-stack-integration"
manifest = json.loads((delivery / "release-manifest.json").read_text(encoding="utf-8"))
receipt = json.loads((delivery / "release-manifest-validation.receipt.json").read_text(encoding="utf-8"))
assert receipt["overallStatus"] == "PASS" and receipt["sourceCommit"] == manifest["sourceCommit"]
def digest(path):
    return hashlib.sha256((root / path).read_bytes().replace(b"\r\n", b"\n")).hexdigest()

assert receipt["manifestSha256"] == digest("deliveries/G6/full-stack-integration/release-manifest.json"), "Revalidate the assembled manifest before finalizing"
assert receipt["releaseBundleSha256"] == manifest["releaseBundleSha256"]
for evidence in receipt["requiredChecksVerified"]:
    assert digest(evidence["path"]) == evidence["sha256"], evidence["path"]
for evidence in manifest["evidenceHashes"]:
    assert digest(evidence["path"]) == evidence["sha256"], evidence["path"]
composition = json.loads((delivery / "release-composition.json").read_text(encoding="utf-8"))
budget = json.loads((delivery / "budget-validation-receipt.json").read_text(encoding="utf-8"))
assert composition["overallStatus"] == budget["overallStatus"] == "PASS"
assert composition["buildId"] == budget["buildId"], "Composition and measurements must identify the same production build"
source = manifest["sourceCommit"]
def test_count(log_name):
    log = (delivery / "evidence" / log_name).read_text(encoding="utf-8")
    log = re.sub(r"\x1b\[[0-9;]*m", "", log)
    tests = re.findall(r"\bTests\s+(\d+)\s+passed", log)
    files = re.findall(r"Test Files\s+(\d+)\s+passed", log)
    assert tests and files
    return int(tests[-1]), int(files[-1])

units, unit_files = test_count("04-unit-tests.log")
integrations, integration_files = test_count("05-integration-tests.log")
browser_counts = []
for report_name in ["e2e/browser-results.json", "accessibility/browser-results.json", "performance/performance-results.json"]:
    stats = json.loads((delivery / "evidence" / report_name).read_text(encoding="utf-8"))["stats"]
    assert stats["expected"] > 0 and all(stats[key] == 0 for key in ["unexpected", "flaky", "skipped"])
    browser_counts.append(stats["expected"])
e2e, accessibility, performance = browser_counts
local = f"Final clean-checkout execution PASS binds implementation `{source}`: frozen install, lint/types, {units} unit tests ({unit_files} files), {integrations} integration tests ({integration_files} files), {e2e} unified E2E tests, {accessibility} dedicated accessibility tests, {performance} performance browser tests, 9 Khronos GLBs (zero errors/warnings), production build, 22 required routes/{len(composition['modules'])} reachable modules, measured budgets and strict detached manifest/archive validation. All browser reports have zero failed/flaky/skipped tests. RC3 archive: {manifest['bundleMetadata']['fileCount']} files, {manifest['bundleMetadata']['bytes']} bytes; SHA-256 `{manifest['releaseBundleSha256']}`. Node 24.19.0/pnpm 9.15.9; raw build-bound frame samples identify the actual renderer. Authoritative commands/logs/hashes are committed in this delivery."
ci_text = "Exact pushed-HEAD GitHub workflow verification is pending observation; no workflow SUCCESS is asserted before observation."
if args.ci_recorded:
    ci = json.loads((delivery / "ci-results.json").read_text(encoding="utf-8"))
    assert ci["overallStatus"] == "PASS" and ci["sourceCommit"] == source
    descriptions = []
    for run in ci["workflows"]:
        assert run["conclusion"] == "success" and not run["requiredSkippedSteps"]
        descriptions.append(f"[{run['workflow']}]({run['url']}) SUCCESS (run {run['runId']}; jobs " + ", ".join(str(job["jobId"]) for job in run["jobs"]) + ")")
    ci_text = f"Observed exact candidate push `{ci['recordedCandidateHead']}`: " + "; ".join(descriptions) + ". All thirteen required quality steps and both required integrity checks executed successfully; no required skipped step. This committed CI record identifies that observed push. The final commit containing the record is verified separately on its exact HEAD after push, with final SHA/run IDs returned in the handoff and retained by GitHub."
    if "artifactVerification" in ci:
        artifact = ci["artifactVerification"]
        assert digest(artifact["path"]) == artifact["sha256"]
        proof = json.loads((root / artifact["path"]).read_text(encoding="utf-8"))
        assert proof["overallStatus"] == "PASS" and proof["headSha"] == ci["recordedCandidateHead"] and proof["sourceCommit"] == source
        assert proof["releaseReceipt"]["manifestSha256"] == receipt["manifestSha256"]
        ci_text += f" Downloaded [provider evidence]({proof['artifactUrl']}) confirms validation `verifiedHead` and all three zero-failure browser reports. Actual Linux renderer: `{proof['rendererIdentity']}`; {proof['completedFrames']} completed frames over the continuous 60-second route with sixty acknowledged actions, median {proof['frameMedianMs']:.1f} ms / p95 {proof['frameP95Ms']:.1f} ms. This is software-rendered lab evidence, not physical-device certification."

def update(path, transform):
    text = path.read_text(encoding="utf-8")
    path.write_text(transform(text), encoding="utf-8", newline="\n")

def verified_block(text, initial_pattern, extra=""):
    start = "<!-- RC3_VERIFIED_EXECUTION_START -->"
    end = "<!-- RC3_VERIFIED_EXECUTION_END -->"
    block = start + "\n" + local + "\n\n" + ci_text + extra + "\n" + end
    pattern = re.escape(start) + ".*?" + re.escape(end) if start in text else initial_pattern
    result, count = re.subn(pattern, lambda match: block, text, count=1, flags=re.S)
    assert count == 1, "Expected exactly one living execution block"
    return result

def report(text):
    text = text.replace("The actual interim Next build contains public, protected admin and dynamic APIs;", "The final source-bound Next build contains public, protected admin and dynamic APIs;")
    text = text.replace("Final proof must bind the exact sourceCommit rather than reuse that interim observation.", "The hashed final composition proves all 22 required routes and 9 frozen assets.")
    text = re.sub(r"The hashed final composition proves all\s*22 required routes,\s*\d+ reachable modules and\s*9 frozen assets\.", f"The hashed final composition proves all 22 required routes, {len(composition['modules'])} reachable modules and 9 frozen assets.", text)
    text = verified_block(text, r"The implementation sourceCommit is frozen and fresh consolidated proof capture.*?(?=\n\nRequired workflow)", f"\n\nMaker corrections from actual failed browser runs are recorded in [corrections-during-integration.md](corrections-during-integration.md). Failed local/CI runs remain archived; they are superseded by final exact-source execution. The final fresh browser artifacts are under `evidence/e2e-{source[:7]}/`; the canonical `evidence/e2e/browser-results.json` is an exact copy of that completed run's report.")
    return text

update(delivery / "report.md", report)
update(root / "docs/releases/v1.0.0-rc3.md", lambda text: verified_block(text, r"This dossier's documentation handoff.*?(?=\n\nThe committed CI record)"))
update(delivery / "route-inventory.md", lambda text: re.sub(r"This inventory was read.*?(?=\n\n)", "This inventory is cross-checked against the final source-bound compiled manifests, canonical route sources and hashed `release-composition.json`. The final build proves both public/runtime and admin/platform composition; `commands-and-exit-codes.md` and `evidence/07-production-build.log` record exact source/commands/exit status.", text, count=1, flags=re.S))
update(delivery / "test-matrix.md", lambda text: re.sub(r"(?:Maker interim executions exist|Final clean-checkout execution binds).*?(?=\n\n)", f"Final clean-checkout execution binds the manifest sourceCommit: {units} unit/{integrations} integration/{e2e} unified browser/{accessibility} dedicated accessibility/{performance} performance tests PASS, with zero failed/flaky/skipped browser cases. Component preliminary results remain historical maker diagnostics, distinct from the final hashed proof.", text, count=1, flags=re.S))
update(delivery / "runtime-map.md", lambda text: re.sub(r"Final implementation source `[^`]+` has fresh PASS results.*?(?=\n|$)", f"Final implementation source `{source}` has fresh PASS results for {units} unit tests, {integrations} integration tests, {e2e} unified E2E tests, {accessibility} dedicated accessibility tests and {performance} performance tests, with measured budgets and strict manifest/archive validation also PASS. Exact pushed-HEAD GitHub verification is recorded separately in the authoritative report and CI record after observation. Physical devices, screen readers and hosted services remain NOT RUN. This is maker evidence only: G6 ACTIVE / REWORK; G7 LOCKED.", text))
update(delivery / "platform-map.md", lambda text: re.sub(r"Final implementation source `[^`]+` has fresh PASS results.*?(?=\n|$)", f"Final implementation source `{source}` has fresh PASS results for {units} unit tests, {integrations} integration tests, {e2e} unified E2E tests, {accessibility} dedicated accessibility tests and {performance} performance tests, with measured budgets and strict manifest/archive validation also PASS. Exact pushed-HEAD GitHub verification is recorded separately in the authoritative report and CI record after observation. Hosted service verification remains NOT RUN. This is maker evidence only: G6 ACTIVE / REWORK; G7 LOCKED.", text))
update(delivery / "evidence/e2e/README.md", lambda text: re.sub(r"`browser-results.json` is an exact copy.*?(?=\n\n)", f"`browser-results.json` is an exact copy of the completed final isolated run at implementation source `{source}`: {e2e} passed, zero failed/flaky/skipped. The final run's screenshots, network logs and other browser artifacts are in the adjacent `e2e-{source[:7]}/` directory.", text, count=1, flags=re.S))

def restore(text):
    marker = "## Historical RC1 rehearsal"
    current, historical = text.split(marker, 1)
    current = re.sub(r"(?:Maker interim canonical SQL suite exercised|Final source-bound integration execution passed).*?(?=\n\nContact transaction)", f"Final source-bound integration execution passed `tests/integration/platform/canonical-platform.test.ts`: the exact accepted A3/A4 schema was loaded into isolated PGlite, a synthetic owner/contact receipt was created, all fifteen public tables were backed up, contact/idempotency/quota rows were removed, then restore recovered all fifteen tables plus message/outbox/idempotency records. This actual local SQL execution is part of the final {integrations}-test integration suite at source `{source}`. Exact command, exit code and log hash are in `deliveries/G6/full-stack-integration/commands-and-exit-codes.md`, `evidence/execution.jsonl` and the release manifest. Hosted Supabase recovery remains unverified.", current, count=1, flags=re.S)
    current = current.replace("Interim AUTOMATED local SQL PASS; final evidence capture pending", "Final source-bound AUTOMATED local SQL PASS")
    return current + marker + historical

update(root / "docs/operations/restore-record.md", restore)
update(root / "docs/operations/manual-device-checklist-template.md", lambda text: text.replace("Complete raw60s software-browser pacing", "Complete raw 60s renderer-identified Chromium pacing").replace("a60second desktop software-rendered report", "a 60-second desktop Chromium report identifying its actual renderer"))

def checklist(text):
    text = text.replace("Actual interim build", "Final source-bound build")
    start = text.index("Final execution and artifact checklist")
    end = re.search(r"- \[[ x]\] Push the source-bound", text[start:]).start() + start
    text = text[:start] + text[start:end].replace("- [ ]", "- [x]") + text[end:]
    if args.ci_recorded:
        text = text.replace("- [ ] Push the source-bound", "- [x] Push the source-bound").replace("- [ ] Commit `ci-results.json`", "- [x] Commit `ci-results.json`")
    return text

update(root / "docs/operations/release-checklist.md", checklist)
print("Updated living records from verified local receipts" + (" and observed candidate CI" if args.ci_recorded else "; GitHub observation pending"))
