from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
A1 = ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0"
C1 = ROOT / "deliveries/completion-audits/FINISH-C1/finish-16/20261011T233109Z-c1-r9-parent-local-technical-recheck-06-85bd61e0"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def copy_work(source: Path, destination: Path) -> None:
    shutil.copyfile(source, destination)


a1_raw = read_json(A1 / "evidence/a1-raw-git-verification.json")
c1_raw = read_json(C1 / "evidence/c1-raw-git-verification.json")
a1_replay_work = read_json(A1 / ".work/a1-replay-verification.json")
a1_replay_binding = read_json(A1 / "evidence/a1-maker-binding-verification.json")
a1_probe = read_json(A1 / "evidence/a1-boundary-probes.result.json")

copy_work(A1 / ".work/a1-replay-verification.json", A1 / "evidence/a1-exact-base-replay-verification.json")
copy_work(A1 / "evidence/raw_git_reverify.py", C1 / "evidence/raw_git_reverify.py")

a1_candidate = a1_raw["candidate"]
a1_m = a1_raw["manifest"]
a1_p = a1_raw["patch"]
c1_candidate = c1_raw["candidate"]
c1_delta = c1_raw["r8ToR9Delta"]

a1_binding = {
    "format": "YOR-WORLD-FINISH-41-A1-CANDIDATE-BINDING-v1",
    "reviewScope": "Parent-local technical recheck only; not external audit, acceptance, or integration.",
    "branch": a1_candidate["branch"],
    "remoteBranchCommit": a1_candidate["remoteCommit"],
    "candidateCommit": a1_candidate["commit"],
    "candidateParent": a1_candidate["parent"],
    "candidateTree": a1_candidate["fullTree"],
    "packagePath": "deliveries/FINISH-A1/r5-07",
    "packageSubtree": a1_candidate["packageSubtree"],
    "packageManifest": {"sha256": a1_m["sha256"], "fileRows": a1_m["manifestRowCount"], "bytes": a1_m["manifestBytes"],
                        "rawGitRowsMatch": a1_m["allRowsMatch"], "inventoryExact": a1_m["inventoryExact"]},
    "immutableSourceBase": a1_candidate["baseCommit"],
    "sourcePatch": {"bytes": a1_p["bytes"], "sha256": a1_p["sha256"], "strictUtf8NoBomNul": True,
                    "exactBaseApplyAndWhitespaceCheck": a1_replay_work["cachedAndWorktreePatchCheck"]},
    "assembledCandidateAppTree": a1_replay_work["replayedAppTree"],
    "canonicalRootAppTreeAtBaseAndCandidate": a1_candidate["rootAppTree"],
    "changedPaths": a1_p["changedPaths"],
    "changedPathCount": a1_p["changedPathCount"],
    "frozenAllowlistPathCount": a1_p["allowlistPathCount"],
    "changedPathsWithinFrozenAllowlist": a1_raw["checks"]["allChangedPathsWithinFrozenAllowlist"],
    "packagedSourceMatchesExactBaseReplay": a1_raw["checks"]["packagedSourcesMatchReplay"],
}
write_json(A1 / "candidate-binding.json", a1_binding)

a1_checks = [
    {"id": "BINDING-01", "requirement": "Exact candidate, parent, tree, remote branch, package subtree, unchanged root app, patch encoding and package output rows are bound to raw Git.", "status": "PASS", "evidencePaths": ["evidence/a1-raw-git-verification.json", "candidate-binding.json"]},
    {"id": "REPLAY-01", "requirement": "The candidate patch applies to the pinned accepted base; the 25 source replacements match the replay and the changes stay within the 26-path frozen allowlist.", "status": "PASS", "evidencePaths": ["evidence/a1-exact-base-replay-verification.json", "evidence/a1-raw-git-verification.json"]},
    {"id": "A1R5-01", "requirement": "Frozen review DTO shapes are preserved: approvalAudit.eventId, the four-field PrivateDraftReview shape, generic project/site ReviewCheck scope and string ID, and strict rejection of unallocated fields.", "status": "PASS", "evidencePaths": ["evidence/a1-exact-base-replay-verification.json", "evidence/a1-boundary-probes.test.ts", "evidence/a1-boundary-probes.stdout.log"]},
    {"id": "A1R5-02", "requirement": "Healthy publish and rollback refreshes consume activePublication and update review/publication identity without reload.", "status": "PASS", "evidencePaths": ["evidence/a1-maker-browser-binding.json", "evidence/a1-maker-browser-results.json", "evidence/a1-maker-binding-verification.json"]},
    {"id": "A1R5-03", "requirement": "A requested absent private draft returns 404 and reaches the page not-found path without rendering draft content.", "status": "PASS", "evidencePaths": ["evidence/a1-exact-base-replay-verification.json", "evidence/a1-maker-verification-results.json"]},
    {"id": "A1R5-04", "requirement": "Authorized stale-save 409 includes current draft identity/content without writes; unauthorized callers get no content and the losing editor retains its buffer.", "status": "PASS", "evidencePaths": ["evidence/a1-exact-base-replay-verification.json", "evidence/a1-maker-browser-results.json", "evidence/a1-maker-binding-verification.json"]},
    {"id": "A1R5-05", "requirement": "Draft media renders only for the exact canonical relative owner-preview URL; absolute, origin-relative, raw slash, case-altered/double encoding, query, fragment, trailing slash and traversal inputs are rejected.", "status": "PASS", "evidencePaths": ["evidence/a1-boundary-probes.test.ts", "evidence/a1-boundary-probes.stdout.log", "evidence/a1-maker-verification-results.json"]},
    {"id": "A1R5-06", "requirement": "New section, paragraph, list, code and link inputs are empty; no fabricated link URL/check date is added; evidence starts unknown/null.", "status": "PASS", "evidencePaths": ["evidence/a1-maker-browser-results.json", "evidence/a1-maker-binding-verification.json"]},
    {"id": "LOCAL-FOCUSED-RERUN", "requirement": "Focused unit and integration checks pass on an isolated exact-base replay.", "status": "PASS", "evidencePaths": ["evidence/a1-exact-base-replay-verification.json"]},
    {"id": "MAKER-RECEIPTS", "requirement": "Packaged unit/integration/lint/typecheck receipts and build/browser bindings match raw candidate package bytes.", "status": "PASS", "evidencePaths": ["evidence/a1-maker-verification-results.json", "evidence/a1-maker-browser-binding.json", "evidence/a1-maker-binding-verification.json", "evidence/a1-maker-build-output-manifest.json"]},
    {"id": "PARENT-FRESH-BUILD-BROWSER", "requirement": "Fresh parent build and fresh parent browser execution.", "status": "NOT RUN", "evidencePaths": ["report.md"], "limits": "Maker receipts were inspected and hash-bound; physical maker build output files were not rehashed in this recheck."},
    {"id": "EXTERNAL-AND-PRODUCTION-GATES", "requirement": "GPT Plus #2 audit, Parent acceptance, canonical integration, native providers, deployment/CDN, device/accessibility, recovery/manual operations, and G7.", "status": "NOT RUN", "evidencePaths": ["report.md"]},
]
write_json(A1 / "requirement-matrix.json", {"format": "YOR-WORLD-FINISH-41-A1-REQUIREMENT-MATRIX-v1", "candidateCommit": a1_candidate["commit"], "results": a1_checks})

a1_findings = {
    "format": "YOR-WORLD-FINISH-41-A1-FINDINGS-v1",
    "reviewer": "Parent-local Codex technical recheck; external GPT Plus #2 NOT RUN.",
    "candidateCommit": a1_candidate["commit"],
    "overallStatus": "PASS",
    "recommendation": "No new local defect found in the six FINISH-24 corrections; proceed only to the required independent audit and separate Parent acceptance gate.",
    "implementationAcceptance": False,
    "canonicalIntegrationAuthorized": False,
    "findings": [],
    "verifiedCorrections": [{"id": f"A1R5-{i:02d}", "status": "PASS"} for i in range(1, 7)],
    "reviewerReruns": {"focusedUnit": {"status": "PASS", "tests": 5}, "focusedIntegration": {"status": "PASS", "tests": 22},
                        "independentBoundaryProbes": {"status": "PASS", "tests": 3}, "freshBrowser": "NOT RUN", "freshBuild": "NOT RUN"},
    "makerEvidenceLimits": {"initialSymlinkedBuildAttempt": "FAIL, retained and disclosed", "exactBaseReplayBuildReceipt": "PASS, source/build/browser hashes match candidate binding",
                            "physicalMakerBuildFilesRehashed": False, "makerChromium": "6 expected, 0 unexpected, 0 skipped, 0 flaky; receipt inspected, not rerun by Parent"},
    "processBoundaryIncident": "After FINISH-37, Parent inadvertently read report.md from both FINISH-36 output roots and wrote temporary verification/replay scratch under the then-active FINISH-37 roots. FINISH-38 roots were occupied; only immediate top-level names were recorded. No FINISH-37/38/39/40 output content is used as evidence here. This report is regenerated from raw candidate Git objects under FINISH-41. No candidate commit or canonical app source was modified.",
}
write_json(A1 / "findings.json", a1_findings)

a1_report = f"""# FINISH-41 Parent-local A1 technical recheck

**Local result: PASS.** The six FINISH-24 corrections pass source review, targeted regression evidence, exact-base replay checks, and the fresh focused unit/integration reruns. This is a Parent-local technical recheck; it is not the required GPT Plus #2 audit, implementation acceptance, or canonical integration.

Candidate: `{a1_candidate['commit']}` on `{a1_candidate['branch']}`, parent `{a1_candidate['parent']}`. The remote branch matches. The package subtree is `{a1_candidate['packageSubtree']}`; all {a1_m['manifestRowCount']} output rows ({a1_m['manifestBytes']:,} bytes) match raw Git blobs. The {a1_p['bytes']:,}-byte patch has SHA-256 `{a1_p['sha256']}` and applies to the exact base `{a1_candidate['baseCommit']}`. Its 25 changed source files match the replay and are within the frozen 26-path allowlist. The candidate commit preserves the canonical root `app/` tree `{a1_candidate['rootAppTree']}`.

The six earlier findings are corrected:

1. **DTO compatibility:** `approvalAudit` retains `eventId`; `PrivateDraftReview` has the allocated four fields and rejects `previewProjectId`; `ReviewCheckSchema` accepts generic site scope and string IDs. Supplemental schema probes pass.
2. **Publication refresh:** both healthy refresh paths consume `activePublication`. The candidate Chromium evidence is bound to the exact replay source tree and build ID; its results show 6 expected, no unexpected, skipped, or flaky tests. Publish and rollback refresh without reload.
3. **Missing private drafts:** the owner API returns 404 for an absent requested draft, and the page reaches `notFound()`. The focused integration rerun passed.
4. **Stale saves:** the authorized 409 includes the current draft identity and content; unauthorized requests receive no draft content; state remains unchanged. The browser evidence verifies the losing editor retains its unsaved rich buffer.
5. **Draft media URLs:** only the exact encoded same-origin owner-preview URL renders. Reviewer probes rejected absolute and protocol-relative URLs, query, fragment, path traversal, raw slash, altered/double encoding, and trailing slash variants.
6. **Authoring defaults:** new sections, paragraphs, list items, code and links start empty; link URL/check time are empty and evidence starts unknown/null. Candidate browser assertions pass.

On the isolated exact-base replay, the focused unit suite passed **5/5** and the focused integration suite passed **22/22**. The independent supplemental contract probe passed **3/3**. Its first fixture used one site check and failed the candidate’s intentional five-check-per-scope coherence invariant; the final probe supplies all five required check kinds and passes. Candidate source was not changed by these probes.

Maker receipts report full suites, lint and typecheck exit 0. Their package hashes match raw Git. The original worker build attempt exited 1 because Turbopack rejected a `node_modules` junction outside the filesystem root; the later clean exact-base replay build receipt exited 0. Build manifest, browser results and Chromium receipt hashes match the candidate binding. The Parent did not rehash physical build-output files or launch a fresh browser run.

**Process-boundary disclosure:** after FINISH-37, Parent inadvertently read `report.md` from both original FINISH-36 output roots and wrote temporary verification/replay scratch under the then-active FINISH-37 roots. FINISH-38 roots were occupied; only their immediate top-level names were recorded. This report uses none of the FINISH-37/38/39/40 output contents. It was regenerated under FINISH-41 from raw Git objects. No candidate commit or canonical `app/` source was modified.

GPT Plus #2 audit, Parent acceptance, canonical integration, native PostgreSQL/Auth/Storage tests, deployed origin/CDN, physical-device/accessibility checks, recovery/manual operations, and G7 remain **NOT RUN**. No production deployment or acceptance is claimed.

Raw identities, command receipts, matrix, findings and hashes are in this directory. `output-hashes.json` covers all stable files and excludes itself and `.work/`.
"""
(A1 / "report.md").write_text(a1_report, encoding="utf-8")

a1_commands = {
    "format": "YOR-WORLD-FINISH-41-A1-COMMANDS-v1",
    "commands": [
        {"name": "raw-git-reverification", "command": ["python", "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0/evidence/raw_git_reverify.py"], "exitCode": 0, "evidence": "evidence/a1-raw-git-verification.json; also refreshes C1 evidence"},
        {"name": "focused-unit-replay", "command": a1_replay_work["focusedCommands"][0]["argv"], "workingDirectory": ".work/a1-replay/app", "exitCode": 0, "result": "1 file, 5 passed"},
        {"name": "focused-integration-replay", "command": a1_replay_work["focusedCommands"][1]["argv"], "workingDirectory": ".work/a1-replay/app", "exitCode": 0, "result": "1 file, 22 passed"},
        {"name": "independent-boundary-probes", "command": a1_probe["command"], "workingDirectory": ".work/a1-replay/app", "exitCode": 0, "result": "1 file, 3 passed", "evidence": "evidence/a1-boundary-probes.*"},
        {"name": "maker-evidence-binding-check", "command": ["python", ".work/a1-maker-binding-check.py"], "exitCode": 0, "evidence": "evidence/a1-maker-binding-verification.json"},
    ],
    "notRun": ["Parent fresh production build", "Parent fresh browser run", "external GPT Plus #2 audit", "Parent acceptance", "canonical integration", "native providers", "deployed/CDN/device/recovery/G7 gates"],
    "setupNote": "An initial redirection attempt resolved an output path relative to the isolated worktree; it did not start a test. The recorded replay and final boundary-probe commands above completed successfully.",
}
write_json(A1 / "commands.json", a1_commands)

a1_tools = {
    "format": "YOR-WORLD-FINISH-41-TOOL-VERSIONS-v1",
    "parentEnvironment": {"git": "2.55.0.windows.5", "python": "3.12.10", "node": "v24.19.0", "npm": "11.17.0", "corepackPnpm": "12.11.2", "powershell": "5.1.26100.9549", "vitest": "5.0.2"},
    "candidateMakerReceipts": {"node": "v24.19.0", "pnpm": "9.15.9", "next": "16.3.8", "vitest": "5.0.2", "playwright": "1.63.0", "chromium": "153.0.8010.12"},
    "limitations": "Versions identify local tools and inspected candidate receipts; they do not imply an independent full-suite, build, or browser rerun.",
}
write_json(A1 / "tool-versions.json", a1_tools)

c1_binding = {
    "format": "YOR-WORLD-FINISH-41-C1-CANDIDATE-BINDING-v1",
    "reviewScope": "Parent-local technical recheck of the R9 evidence-pointer correction only; not an inherited behavioral test rerun or acceptance.",
    "branch": c1_candidate["branch"], "remoteBranchCommit": c1_candidate["remoteCommit"], "candidateCommit": c1_candidate["commit"],
    "candidateParent": c1_candidate["parent"], "candidateTree": c1_candidate["fullTree"],
    "packagePath": "deliveries/FINISH-C1-R9", "packageSubtree": c1_candidate["packageSubtree"],
    "candidateOutputManifestSha256": c1_raw["manifest"]["sha256"], "candidateOutputRows": c1_raw["manifest"]["r9"]["manifestRowCount"],
    "candidateOutputBytes": c1_raw["manifest"]["r9"]["manifestBytes"], "candidateOutputsMatchRawGit": c1_raw["checks"]["r9OutputRowsAndInventoryMatchRawGit"],
    "canonicalRootAppTree": c1_candidate["rootAppTree"],
    "r8Input": c1_candidate["r8Input"], "r7CandidateCommit": "e2670d4152c461005da86b392dbcea12cec740bf",
    "r8ToR9": {"unchangedInheritedFiles": c1_delta["unchangedInheritedCount"], "changedInherited": c1_delta["changedInherited"],
               "added": c1_delta["added"], "removed": c1_delta["removed"], "exactChangedPathCount": len(c1_delta["declaredChangedPaths"]),
               "declaredChangedPaths": c1_delta["declaredChangedPaths"], "matrixStatuses": c1_delta["matrixStatuses"]},
}
write_json(C1 / "candidate-binding.json", c1_binding)

c1_checks = [
    {"id": "BINDING-01", "requirement": "R9 commit/parent/tree/remote branch/package subtree, R8 parent and remote input, unchanged root app, and raw output-manifest rows bind exactly.", "status": "PASS", "evidencePaths": ["evidence/c1-raw-git-verification.json", "candidate-binding.json"]},
    {"id": "DELTA-01", "requirement": "The R8-to-R9 delta is exactly seven declared paths: three changed inherited files and four additions, with no removals and all other 20 inherited files unchanged.", "status": "PASS", "evidencePaths": ["evidence/c1-raw-git-verification.json", "evidence/c1-finalizer-pointer-diff.patch"]},
    {"id": "MATRIX-01", "requirement": "All seven matrix statuses and non-E-02-05 rows are preserved; every R9 matrix evidence path resolves to a committed file.", "status": "PASS", "evidencePaths": ["evidence/c1-r8-requirement-matrix.json", "evidence/c1-r9-requirement-matrix.json", "evidence/c1-raw-git-verification.json"]},
    {"id": "E-02-05-POINTER", "requirement": "E-02-05 cites only the committed JSON false-pass receipt; the finalizer template changes only that evidence-list pointer.", "status": "PASS", "evidencePaths": ["evidence/c1-r9-requirement-matrix.json", "evidence/c1-finalizer-pointer-diff.patch", "evidence/c1-r9-correction-verification.json"]},
    {"id": "E-02-05-RECEIPT", "requirement": "The uncached zero-hash child run exits 1, parses as FAIL, has empty stderr, and leaves the original receipt hash unchanged.", "status": "PASS", "evidencePaths": ["evidence/c1-cli-negative-false-pass.json", "evidence/c1-raw-git-verification.json"]},
    {"id": "INHERITED-BEHAVIOR", "requirement": "R8 verifier/test behavior and the C1 finalizer are freshly rerun.", "status": "NOT RUN", "evidencePaths": ["report.md"], "limits": "The packet forbids running the finalizer; inherited behavioral tests were not rerun."},
    {"id": "E01-AND-GATES", "requirement": "E-01 disposition, GPT Plus #2 review, Parent acceptance, integration, runtime/build/browser/provider/device, deployment and G7.", "status": "NOT RUN", "evidencePaths": ["report.md"]},
]
write_json(C1 / "requirement-matrix.json", {"format": "YOR-WORLD-FINISH-41-C1-REQUIREMENT-MATRIX-v1", "candidateCommit": c1_candidate["commit"], "results": c1_checks})

c1_findings = {
    "format": "YOR-WORLD-FINISH-41-C1-FINDINGS-v1",
    "reviewer": "Parent-local Codex technical recheck; external GPT Plus #2 NOT RUN.",
    "candidateCommit": c1_candidate["commit"], "overallStatus": "PASS",
    "recommendation": "The narrow R9 E-02-05 evidence-pointer correction and its committed receipt are verified. E-01 and inherited behavioral proof remain open.",
    "implementationAcceptance": False, "canonicalIntegrationAuthorized": False,
    "findings": [],
    "verifiedCorrection": {"id": "E-02-05", "status": "PASS", "matrixEvidence": ["evidence/cli-negative-false-pass.json"],
                           "finalizerTemplateDiff": "Only removes the obsolete .log item from the E-02-05 evidence list.",
                           "childExitCode": 1, "parsedChildStatus": "FAIL", "stderr": "", "uncached": True,
                           "originalReceiptUnchanged": True},
    "matrixStatuses": c1_delta["matrixStatuses"],
    "inheritedBehavioralTests": "NOT RUN", "finalizer": "NOT RUN",
    "processBoundaryIncident": a1_findings["processBoundaryIncident"],
}
write_json(C1 / "findings.json", c1_findings)

c1_report = f"""# FINISH-41 Parent-local C1-R9 technical recheck

**Local result: PASS for the R9 E-02-05 evidence-pointer correction.** This is a narrow Parent-local technical recheck; it does not rerun inherited behavioral tests, adjudicate E-01, substitute for GPT Plus #2, or accept the candidate.

R9 candidate `{c1_candidate['commit']}` on `{c1_candidate['branch']}` has exact parent R8 `{c1_candidate['parent']}`. Both R9 and the pinned R8 input branches match their remote commits. The R9 full tree and package subtree match the allocated identities; all 26 output-manifest rows ({c1_raw['manifest']['r9']['manifestBytes']:,} bytes) match raw Git. The R8 output manifest also matches all 22 rows. The canonical root `app/` tree remains `{c1_candidate['rootAppTree']}`.

Raw R8-to-R9 comparison found **20 unchanged inherited files, 3 changed inherited files, 4 additions, and no removals**. The exact seven paths match `changed-paths.json`: `output-hashes.json`, `requirement-matrix.json`, `scripts/finalize.py`, `changed-paths.json`, `evidence/r9-correction-verification.json`, `r9-candidate-binding.json`, and `r9-correction-report.md`.

The matrix retains all seven statuses, all non-E-02-05 rows are byte-equivalent after parsing, and every evidence reference resolves to a committed R9 file. E-02-05 now cites only `evidence/cli-negative-false-pass.json`. A raw R8/R9 finalizer diff confirms its template changes only by removing the obsolete `.log` item from that evidence list. The committed negative receipt records a new uncached Python process, a zeroed `sourceManifest.sha256`, child exit code **1**, parsed result **FAIL**, empty stderr, and identical before/after hashes of the original receipt. The R7 candidate ID is consistent across R9’s output manifest and binding.

The R9 finalizer and inherited behavioral tests were **NOT RUN**, as required by the packet. E-01 remains open. The maker’s R8 behavioral results are preserved as prior receipts, not represented as new Parent test runs.

**Process-boundary disclosure:** after FINISH-37, Parent inadvertently read `report.md` from both original FINISH-36 output roots and wrote temporary verification/replay scratch under the then-active FINISH-37 roots. FINISH-38 roots were occupied; only their immediate top-level names were recorded. This report uses none of the FINISH-37/38/39/40 output contents. It was regenerated under FINISH-41 from raw Git objects. No candidate commit or canonical `app/` source was modified.

External audit, Parent acceptance, canonical integration, deployment/provider/device/recovery checks, and G7 remain **NOT RUN**. No acceptance or production claim is made.

Raw R8/R9 bindings, matrix snapshots, false-pass receipt, finalizer diff, commands, findings and hashes are in this directory. `output-hashes.json` excludes itself and `.work/`.
"""
(C1 / "report.md").write_text(c1_report, encoding="utf-8")

c1_commands = {
    "format": "YOR-WORLD-FINISH-41-C1-COMMANDS-v1",
    "commands": [{"name": "raw-git-reverification", "command": ["python", "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0/evidence/raw_git_reverify.py"], "exitCode": 0, "evidence": "evidence/c1-raw-git-verification.json"}],
    "notRun": ["C1 finalizer (packet prohibition)", "inherited R8 behavioral tests", "E-01 adjudication", "external GPT Plus #2 audit", "Parent acceptance", "canonical integration", "deployment/provider/device/recovery/G7 gates"],
}
write_json(C1 / "commands.json", c1_commands)
write_json(C1 / "tool-versions.json", {"format": "YOR-WORLD-FINISH-41-TOOL-VERSIONS-v1", "parentEnvironment": a1_tools["parentEnvironment"],
                                      "candidateEvidence": "R9 is an evidence-only Python package; its inherited behavioral/tool receipts were inspected as committed raw Git blobs, not rerun.",
                                      "limitations": "Tool versions identify the current review environment and source receipts only."})

def stable_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for current, directories, names in os.walk(root, topdown=True, followlinks=False):
        directories[:] = [name for name in directories if name != ".work"]
        for name in names:
            path = Path(current) / name
            if path.name == "output-hashes.json":
                continue
            if path.is_file():
                files.append(path)
    return sorted(files, key=lambda path: path.relative_to(root).as_posix())


for root, label in ((A1, "FINISH-A1"), (C1, "FINISH-C1")):
    files = stable_files(root)
    rows = []
    for path in files:
        raw = path.read_bytes()
        rows.append({"path": path.relative_to(root).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
    write_json(root / "output-hashes.json", {"format": "YOR-WORLD-FINISH-41-AUDIT-OUTPUT-HASHES-v1", "audit": label,
                                            "hashPolicy": "SHA-256 of raw stable output bytes; output-hashes.json self-hash and .work/ excluded",
                                            "fileCount": len(rows), "totalBytes": sum(row["bytes"] for row in rows), "files": rows})
    print(f"{label}: {len(rows)} stable files, {sum(row['bytes'] for row in rows)} bytes")
