import json,subprocess
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[6]
A1BASE="f62a43c5e71c00dcb89e28275ea81d842167db80"
A1=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
C1=ROOT/"deliveries/completion-audits/FINISH-C1/finish-16/20261011T233517Z-c1-r9-parent-local-technical-recheck-07-950c2b33"
raw=json.loads((A1/"evidence/raw-git-verification.json").read_text(encoding="utf-8"))
cmds=json.loads((A1/"evidence/a1-command-results.json").read_text(encoding="utf-8"))
patch=json.loads((A1/"evidence/patch-replay.json").read_text(encoding="utf-8"))
browser=json.loads((A1/"evidence/a1-evidence-summary.json").read_text(encoding="utf-8"))
versions=json.loads((A1/"evidence/tool-versions.json").read_text(encoding="utf-8"))
browser_binding=json.loads((A1/"evidence/browser-binding.json").read_text(encoding="utf-8"))
stamp=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")

def write_json(path,obj): path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")

ab=raw["a1"]["binding"]
cb=raw["c1"]["binding"]
a1binding={"schemaVersion":1,"auditType":"Parent-local exact-candidate technical recheck; not external GPT Plus #2","generatedAt":stamp,"candidate":"FINISH-A1 R5-R7","branch":ab["branch"],"remoteCommit":ab["remoteCommit"],"commit":ab["commit"],"parent":ab["parent"],"fullTree":ab["tree"],"packagePath":"deliveries/FINISH-A1/r5-07/","packageTree":ab["packageTree"],"rootAppTree":ab["rootAppTree"],"sourceAppTree":ab["sourceAppTree"],"exactBase":ab["base"],"baseAppTree":"42ea29ec235225046a75959eb19eb386ac2f821d","replayedPatchedAppTree":patch["actualPatchedAppTree"],"sourcePatchSha256":patch["patchSha256"],"outputManifestSha256":raw["a1"]["manifest"]["sha256"],"outputManifestRows":raw["a1"]["manifest"]["rowCount"],"outputManifestBytes":raw["a1"]["manifest"]["totalBytes"],"reviewerBuildId":browser["buildId"],"makerBuildId":"ipOY1wZCZuOF_EBSv1XY8","reviewerPlaywright":{"expected":browser["playwrightExpected"],"skipped":browser["playwrightSkipped"],"unexpected":browser["playwrightUnexpected"],"flaky":browser["playwrightFlaky"]},"evidenceRoot":str(A1.relative_to(ROOT)).replace("\\","/")}
cbinding={"schemaVersion":1,"auditType":"Parent-local exact-candidate technical recheck; not external GPT Plus #2","generatedAt":stamp,"candidate":"FINISH-C1 R9","branch":cb["branch"],"remoteCommit":cb["remoteCommit"],"commit":cb["commit"],"parent":cb["parent"],"fullTree":cb["tree"],"packagePath":"deliveries/FINISH-C1-R9/","packageTree":cb["packageTree"],"rootAppTree":cb["rootAppTree"],"R8Input":cb["r8Input"],"R8Tree":cb["r8Tree"],"R8PackageTree":cb["r8PackageTree"],"R9OutputManifestSha256":raw["c1"]["manifest"]["sha256"],"R9OutputRows":raw["c1"]["manifest"]["rowCount"],"R9OutputBytes":raw["c1"]["manifest"]["totalBytes"],"R8OutputRows":raw["c1"]["r8Manifest"]["rows"],"R8OutputBytes":raw["c1"]["r8Manifest"]["totalBytes"],"evidenceRoot":str(C1.relative_to(ROOT)).replace("\\","/")}

apaths={
 "A1R5-01":["app/src/server/media/manifest.ts","app/src/server/content/preview.ts","app/tests/unit/platform/completion-authoring-blocks.test.ts","app/tests/integration/platform/completion-authoring-preview.test.ts"],
 "A1R5-02":["app/src/features/admin/publish-review.tsx","app/src/app/api/admin/publish/route.ts","app/tests/e2e/platform/completion-authoring-workflow.spec.ts"],
 "A1R5-03":["app/src/server/content/preview.ts","app/src/app/api/admin/preview/route.ts","app/src/app/admin/preview/[slug]/page.tsx","app/tests/integration/platform/completion-authoring-preview.test.ts"],
 "A1R5-04":["app/src/server/content/revisions.ts","app/src/app/api/admin/projects/route.ts","app/src/features/admin/project-editor.tsx","app/tests/integration/platform/completion-authoring-preview.test.ts","app/tests/e2e/platform/completion-authoring-workflow.spec.ts"],
 "A1R5-05":["app/src/features/portfolio/case-study.tsx","app/tests/unit/platform/completion-authoring-blocks.test.ts"],
 "A1R5-06":["app/src/features/admin/project-editor.tsx","app/src/features/admin/structured-block-editor.tsx","app/tests/unit/platform/completion-authoring-blocks.test.ts","app/tests/e2e/platform/completion-authoring-workflow.spec.ts"],
}
findings_a1=[
 {"id":"A1R5-01","severity":"P2","status":"PASS","title":"Frozen DTO compatibility restored","result":"ReviewedMedia approvalAudit is strict {eventId,createdAt}; PrivateDraftReview exposes only identity/drafts/checks/canPublish; ReviewCheck retains generic string id and project/site scope. Positive and malformed schema probes pass.","sourcePaths":apaths["A1R5-01"],"evidencePaths":["evidence/unit-focused.stdout.log","evidence/integration-focused.stdout.log","evidence/raw-git-verification.json"],"limits":["Embedded PGlite and synthetic auth only; no provider API run."]},
 {"id":"A1R5-02","severity":"P2","status":"PASS","title":"Publish and rollback consume activePublication on refresh","result":"Both refresh paths require activePublication and use its revision; exact-source Chromium observed the committed publish and rollback update the review identity without a page reload.","sourcePaths":apaths["A1R5-02"],"evidencePaths":["evidence/chromium.stdout.log","evidence/browser-results.json","evidence/browser-binding.json","evidence/publish-rollback-review.png"],"limits":["Local Chromium/PGlite fixture; CDN/edge and deployed-origin behavior were not tested."]},
 {"id":"A1R5-03","severity":"P2","status":"PASS","title":"Missing genuine draft follows 404/notFound paths","result":"Requested absent drafts return null before strict review construction; the owner API returns private 404 and the page calls notFound() for an absent review/draft. Integration verifies status, private headers, and no CandidateX content.","sourcePaths":apaths["A1R5-03"],"evidencePaths":["evidence/integration-focused.stdout.log","evidence/integration-full.stdout.log"],"limits":["The page-level Next notFound branch was confirmed by source inspection; this rerun did not launch a browser request for the absent page."]},
 {"id":"A1R5-04","severity":"P2","status":"PASS","title":"Authorized stale-save response returns current draft without writes","result":"A stale 409 includes projectId, current revision, and complete current project; integration verifies no publication/draft/audit writes and unauthenticated callers do not receive current content. Chromium confirms the losing rich editor buffer remains visible.","sourcePaths":apaths["A1R5-04"],"evidencePaths":["evidence/integration-focused.stdout.log","evidence/chromium.stdout.log","evidence/browser-results.json"],"limits":["PGlite and owner-cookie fixture; native PostgreSQL multi-process races were not run."]},
 {"id":"A1R5-05","severity":"P2","status":"PASS","title":"Draft renderer accepts only the exact canonical private-media URL","result":"Draft rendering sets img src only when the supplied URL exactly equals /api/admin/preview/media/{encodeURIComponent(mediaId)}. Unit probes reject absolute/origin-confused, traversal, mismatched-ID, and query variants.","sourcePaths":apaths["A1R5-05"],"evidencePaths":["evidence/unit-focused.stdout.log"],"limits":["The exact-string source guard also rejects fragments and alternate encodings; the unit list does not include a separate literal fragment probe."]},
 {"id":"A1R5-06","severity":"P2","status":"PASS","title":"New authoring defaults are empty or explicitly unknown","result":"New section, paragraph, list, code, and link text fields begin empty; link URL/check time are empty; evidence URL/check time are null and status unknown. Unit and Chromium assertions pass.","sourcePaths":apaths["A1R5-06"],"evidencePaths":["evidence/unit-focused.stdout.log","evidence/chromium.stdout.log","evidence/browser-results.json"],"limits":["The UI run used synthetic local draft data and did not write production content."]},
]
findings_a1_doc={"schemaVersion":1,"auditType":"FINISH-36 Parent-local A1 technical recheck","recommendation":"PASS","candidateCommit":ab["commit"],"findings":findings_a1,"processBoundaryIncident":"FINISH-39 records that FINISH-37 output roots were opened and altered during earlier parent work despite the preceding no-open instruction. This report did not inspect or use FINISH-37 through FINISH-41 output contents as evidence.","scopeNotRun":["External GPT Plus #2 audit","Parent implementation acceptance","Canonical integration","Native PostgreSQL/Auth/Storage","Deployed origin/CDN","Physical/device/accessibility","Recovery/manual operations","G7"]}

matrix_a1=[]
for f in findings_a1:
 matrix_a1.append({"requirement":f["id"],"status":"PASS","description":f["title"],"evidencePaths":f["evidencePaths"],"sourcePaths":f["sourcePaths"],"limits":f["limits"]})
matrix_a1.extend([
 {"requirement":"FINISH-36-A1-IDENTITY-MANIFEST","status":"PASS","description":"Exact candidate, remote branch, commit/tree/base, root app, package, patch, source subtree, and all 79 output rows verified from raw Git blobs.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"requirement":"FINISH-36-A1-PATCH-REPLAY","status":"PASS","description":"The patch applies from the exact base; 25/25 changed paths match, all packaged replacements are byte-identical, and replayed app tree is ba8f952e... .","evidencePaths":["evidence/patch-replay.json","evidence/patch-replay.stdout.log","evidence/patch-replay.stderr.log"]},
 {"requirement":"FINISH-36-A1-FOCUSED-AND-FULL-TESTS","status":"PASS","description":"Focused unit 5/5; focused integration 22/22; full unit 317/317; full integration 308/308.","evidencePaths":["evidence/unit-focused.stdout.log","evidence/integration-focused.stdout.log","evidence/unit-full.stdout.log","evidence/integration-full.stdout.log"]},
 {"requirement":"FINISH-36-A1-LINT-TYPECHECK-BUILD","status":"PASS","description":"Lint, typecheck and production build exited 0 in the isolated exact-base replay.","evidencePaths":["evidence/lint.exit-code.txt","evidence/typecheck.exit-code.txt","evidence/build.exit-code.txt","evidence/local-build-manifest.json"]},
 {"requirement":"FINISH-36-A1-CHROMIUM","status":"PASS","description":"6/6 Chromium tests; no skipped, unexpected, or flaky tests. Browser and build bind to the exact replayed candidate tree.","evidencePaths":["evidence/chromium.stdout.log","evidence/browser-results.json","evidence/browser-binding.json","evidence/a1-evidence-summary.json"]},
 {"requirement":"LIMIT-NATIVE-PROVIDERS","status":"NOT RUN","description":"Native PostgreSQL, Supabase Auth, and Storage/provider approval checks.","evidencePaths":["report.md"]},
 {"requirement":"LIMIT-DEPLOYMENT-CDN","status":"NOT RUN","description":"Deployed origin, CDN/shared cache, and live rollback visibility.","evidencePaths":["report.md"]},
 {"requirement":"LIMIT-DEVICE-RECOVERY-MANUAL","status":"NOT RUN","description":"Physical devices/accessibility, restore rehearsal, and manual operations.","evidencePaths":["report.md"]},
 {"requirement":"GATE-GPT2-PARENT-INTEGRATION-G7","status":"NOT RUN","description":"External GPT Plus #2 audit, Parent acceptance, canonical integration, and G7 acceptance remain separate gates.","evidencePaths":["report.md"]},
])
matrix_a1_doc={"schemaVersion":1,"candidateCommit":ab["commit"],"requirements":matrix_a1}

report_a1=f'''# FINISH-36 A1 parent-local technical recheck

**Recommendation: PASS for the six FINISH-24 corrections, within this bounded local recheck.** This is Parent-local technical evidence. It is not the required external GPT Plus #2 audit, implementation acceptance, or canonical integration.

## Exact candidate

- Branch/remote: `{ab["branch"]}` at `{ab["remoteCommit"]}`.
- Commit/tree: `{ab["commit"]}` / `{ab["tree"]}`; parent/base: `{ab["parent"]}`.
- Package tree: `{ab["packageTree"]}`. Canonical root `app/`: `{ab["rootAppTree"]}` (unchanged).
- Package source subtree: `{ab["sourceAppTree"]}`. Exact-base patch SHA-256: `{patch["patchSha256"]}`; patched replay tree: `{patch["actualPatchedAppTree"]}`.
- Output manifest: {raw["a1"]["manifest"]["rowCount"]} entries / {raw["a1"]["manifest"]["totalBytes"]:,} bytes, all recomputed from raw Git blobs.

## Six correction results

| Finding | Result | Reviewer result |
| --- | --- | --- |
| A1R5-01 | PASS | `approvalAudit.eventId` and accepted strict DTO shapes restored; generic project/site review checks retained. |
| A1R5-02 | PASS | Both healthy refresh paths consume `activePublication`; browser confirms publish and rollback refresh without reload. |
| A1R5-03 | PASS | Missing draft returns API 404 with private headers; page reaches `notFound()` by source inspection. |
| A1R5-04 | PASS | Authorized 409 includes current draft identity/content, no write occurs, unauthorized response has no draft content, and editor buffer survives. |
| A1R5-05 | PASS | Renderer allows only the exact canonical private-preview URL for that media ID. |
| A1R5-06 | PASS | New authored values start blank; evidence remains unknown/null until supplied. |

## Reviewer reruns

The patch was checked and applied in a clean detached worktree at base `{A1BASE}`. The exact changed set is 25 paths, all within the frozen 26-path allowlist. Every packaged replacement matches the replayed file byte-for-byte; the resulting `app/` tree is `{patch["actualPatchedAppTree"]}`. `app/` in the candidate commit remains the accepted baseline tree.

| Check | Result |
| --- | --- |
| Focused unit | PASS - 1 file, 5 tests |
| Focused integration | PASS - 1 file, 22 tests |
| Full unit | PASS - 24 files, 317 tests |
| Full integration | PASS - 28 files, 308 tests |
| Lint / typecheck | PASS - both exit 0 |
| Production build | PASS - exit 0; reviewer build ID `{browser["buildId"]}` |
| Chromium | PASS - 6/6; zero skipped, unexpected, or flaky; Playwright {versions["playwright"]}, Chromium {versions["chromium"]} |

The reviewer build and browser run bind to the same replayed app tree. The maker's package separately records a 6/6 run with build ID `ipOY1wZCZuOF_EBSv1XY8`; this rerun produced a fresh build ID and its own file-hash manifest. Both bind to the same source tree. Browser data used a disposable PGlite database, an owner-cookie fixture, and explicitly synthetic image bytes; the fixture is not provider-approved.

## Scope limits and coverage notes

- The missing-draft API branch was exercised; the page-level `notFound()` branch was verified by source inspection, not a separate browser request.
- The URL renderer's exact-string check rejects any noncanonical value. Unit cases cover absolute/origin-confused, traversal, wrong-ID, and query variants; there is no separate literal-fragment probe.
- Native PostgreSQL races, provider Auth/Storage, deployed origin/CDN, physical devices/accessibility, recovery/manual operations, and G7 were **NOT RUN**.
- GPT Plus #2 audit was **NOT DISPATCHED**. Parent acceptance and canonical integration remain **PENDING**.

The allocation history records a FINISH-37 process-boundary incident: those roots were opened and altered during earlier parent work despite the preceding no-open instruction. This report did not inspect or use FINISH-37 through FINISH-41 output contents as evidence; this recheck is based on the exact candidate's raw Git objects and fresh FINISH-42 reruns.
'''

# C1 correction-only results.
cchecks=raw["c1"]["checks"]
findings_c1=[
 {"id":"C1-R9-BINDING","status":"PASS","title":"Exact R9 candidate and remote branch are bound","result":"Commit, parent R8, full tree, delivery subtree, root app tree, and remote branch match the FINISH-36 identities.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"id":"C1-R9-MANIFESTS","status":"PASS","title":"R9 and inherited R8 output manifests match raw Git blobs","result":"All 26 R9 rows and all 22 R8 rows match raw blob hashes and byte counts; no extra or missing package files.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"id":"C1-R9-DELTA","status":"PASS","title":"Only the authorized E-02-05 evidence pointer correction differs","result":"The seven-file R9/R8 delta is exact; matrix statuses and non-evidence claims are unchanged; all ten evidence references resolve; finalizer change is one E-02-05 pointer line.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"id":"C1-R9-NEGATIVE-RECEIPT","status":"PASS","title":"False-pass receipt records a fail-closed nonzero child result","result":"Committed disposable-copy receipt parses FAIL with child exit 1, matching stdout, empty stderr, and unchanged original receipt hash.","evidencePaths":["evidence/raw-git-verification.json"]},
]
findings_c1_doc={"schemaVersion":1,"auditType":"FINISH-36 Parent-local C1 correction recheck","recommendation":"PASS for E-02-05 evidence-pointer correction only","candidateCommit":cb["commit"],"findings":findings_c1,"processBoundaryIncident":"FINISH-39 records that FINISH-37 output roots were opened and altered during earlier parent work despite the preceding no-open instruction. This report did not inspect or use FINISH-37 through FINISH-41 output contents as evidence.","scopeNotRun":["C1 finalizer","Inherited C1 behavioral tests","E-01 disposition","External GPT Plus #2 audit","Parent acceptance","Canonical integration","Provider/device/deployment/recovery/G7 gates"]}
matrix_c1_doc={"schemaVersion":1,"candidateCommit":cb["commit"],"requirements":[
 {"requirement":"C1-R9-EXACT-BINDING","status":"PASS","description":"Exact commit/parent/tree/package and remote branch verified.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"requirement":"C1-R9-RAW-MANIFESTS","status":"PASS","description":"Every R9 and inherited R8 output-manifest row matches raw Git bytes.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"requirement":"C1-R9-EXACT-DELTA","status":"PASS","description":"Seven-path R9 delta exactly matches declared inventory and authorized E-02-05 pointer/template change.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"requirement":"C1-R9-MATRIX-EVIDENCE","status":"PASS","description":"All seven matrix rows preserve statuses/claims; all ten refs resolve; E-02-05 names only the JSON receipt.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"requirement":"C1-R9-FALSE-PASS-RECEIPT","status":"PASS","description":"Committed negative receipt returns parsed FAIL and child exit 1 without changing original input.","evidencePaths":["evidence/raw-git-verification.json"]},
 {"requirement":"C1-FINALIZER-RUN","status":"NOT RUN","description":"The candidate finalizer was not run, per packet.","evidencePaths":["report.md"]},
 {"requirement":"C1-INHERITED-BEHAVIORAL-TESTS","status":"NOT RUN","description":"Inherited tests were not rerun; this was a raw-Git evidence-pointer check.","evidencePaths":["report.md"]},
 {"requirement":"C1-E01-EXTERNAL-ACCEPTANCE-INTEGRATION","status":"NOT RUN","description":"E-01, external GPT Plus #2, Parent acceptance, and canonical integration remain separate pending gates.","evidencePaths":["report.md"]},
 {"requirement":"C1-PROVIDER-DEVICE-DEPLOYMENT-RECOVERY-G7","status":"NOT RUN","description":"Provider, device, deployment, recovery/manual operations, and G7 were not evaluated here.","evidencePaths":["report.md"]},
]}

report_c1=f'''# FINISH-36 C1 parent-local technical recheck

**Recommendation: PASS for the E-02-05 evidence-pointer correction only.** This does not resolve E-01, substitute for the external GPT Plus #2 audit, accept implementation, or authorize canonical integration.

## Exact candidate and raw object checks

- Branch/remote: `{cb["branch"]}` at `{cb["remoteCommit"]}`.
- R9 commit/tree: `{cb["commit"]}` / `{cb["tree"]}`; parent R8: `{cb["parent"]}`.
- R9 package tree: `{cb["packageTree"]}`. Root `app/`: `{cb["rootAppTree"]}` (unchanged).
- R8 tree/package: `{cb["r8Tree"]}` / `{cb["r8PackageTree"]}`.
- R9 output manifest: 26 rows / 145,757 bytes, all raw-blob hashes match. R8: 22 rows / 140,981 bytes, all raw-blob hashes match.

The exact R9/R8 delta is the seven declared files: `changed-paths.json`, `evidence/r9-correction-verification.json`, `output-hashes.json`, `r9-candidate-binding.json`, `r9-correction-report.md`, `requirement-matrix.json`, and `scripts/finalize.py`. The requirement matrix has seven unchanged status/claim rows; all ten evidence paths resolve. E-02-05 points only to `evidence/cli-negative-false-pass.json`. The finalizer differs only by removing the stale `.log` pointer from that one template row.

The committed disposable-copy negative receipt records child exit **1**, parsed status **FAIL**, matching JSON stdout, empty stderr, and the same original receipt hash before and after. No candidate change or rewrite was made.

## Scope boundaries

- The C1 finalizer and inherited behavioral tests were **NOT RUN**, as required by the packet.
- E-01, external GPT Plus #2 audit, Parent acceptance, canonical integration, providers, devices, deployment, recovery/manual operations, and G7 remain **NOT RUN / PENDING**.
- The allocation history records a FINISH-37 process-boundary incident: those roots were opened and altered during earlier parent work despite the preceding no-open instruction. This report did not inspect or use FINISH-37 through FINISH-41 output contents as evidence; it uses exact candidate raw Git objects under the fresh FINISH-42 allocation.
'''

write_json(A1/"candidate-binding.json",a1binding); write_json(A1/"findings.json",findings_a1_doc); write_json(A1/"requirement-matrix.json",matrix_a1_doc); write_json(A1/"tool-versions.json",versions)
write_json(C1/"candidate-binding.json",cbinding); write_json(C1/"findings.json",findings_c1_doc); write_json(C1/"requirement-matrix.json",matrix_c1_doc)
c1tools={"audit":"Parent-local raw-Git evidence-pointer recheck","python":"3.12.10","git":"git version 2.55.0.windows.5","PowerShell":"5.1.26100.9549","remote":"origin (GitHub); ls-remote refs checked"}
write_json(C1/"tool-versions.json",c1tools)

a1commands={"schemaVersion":1,"audit":"FINISH-36 A1 local recheck","candidateCommit":ab["commit"],"cwd":"FINISH-42 recheck worktree root","rawGit":{"argv":["python",str(A1/".work/verify_raw_git.py")],"exitCode":0,"evidence":"evidence/raw-git-verification.json"},"patchReplay":{"command":"python .work/replay_a1_patch.py (fresh detached exact-base worktree); follow-up path/replacement reconciliation","forwardApplyCheckExit":patch["forwardApplyCheckExit"],"forwardApplyExit":patch["forwardApplyExit"],"whitespaceCheckExit":patch["forwardDiffCheckExit"],"replayedPathCount":patch["changedPathCount"],"replacementMismatches":patch["packagedReplacementMismatchPaths"],"appTree":patch["actualPatchedAppTree"],"evidence":"evidence/patch-replay.json"},"reviewerReruns":{"workingDirectory":".work/a1-exact-base/app","commands":cmds["commands"]},"chromium":{"argv":browser_binding["command"],"workingDirectory":".work/a1-exact-base/app","environment":{"CI":"1","PORT":"3159","YOR_E2E_FIXTURE":"1","YOR_TEST_DATABASE_PATH":".work/a1-e2e-pglite","A1_EVIDENCE_DIR":"evidence/","B5_EVIDENCE_DIR":"evidence/"},"exitCode":0,"expected":6,"unexpected":0,"skipped":0,"flaky":0,"buildId":browser["buildId"],"evidence":"evidence/browser-binding.json"},"inputsRead":["docs/planning/reconciliation-packets/2026-10-11-finish-36-a1-c1-local-technical-rechecks.md","docs/planning/reconciliation-packets/2026-10-11-finish-24-a1-r5-independent-audit.md","docs/planning/reconciliation-packets/2026-10-11-finish-27-a1-r5-rework.md","docs/planning/reconciliation-packets/2026-10-11-finish-32-a1-r5-r7-independent-audit.md","deliveries/FINISH-A1/r5-07/ (raw Git candidate objects)"]}
c1commands={"schemaVersion":1,"audit":"FINISH-36 C1 raw-Git recheck","candidateCommit":cb["commit"],"commands":[{"argv":["python",str(A1/".work/verify_raw_git.py")],"cwd":str(ROOT),"exitCode":0,"evidence":"evidence/raw-git-verification.json"},{"argv":["git","ls-remote","origin","refs/heads/"+cb["branch"]],"cwd":str(ROOT),"exitCode":0,"stdout":cb["remoteCommit"]+"\trefs/heads/"+cb["branch"]}],"rawBlobReads":"The verifier reads candidate trees and blobs using git ls-tree and git cat-file; all results are in evidence/raw-git-verification.json.","c1Finalizer":"NOT RUN","inheritedBehavioralTests":"NOT RUN","result":"PASS for E-02-05 pointer only","noCandidateOrCanonicalAppChanges":True}
write_json(A1/"commands.json",a1commands); write_json(C1/"commands.json",c1commands)
(A1/"report.md").write_text(report_a1,encoding="utf-8"); (C1/"report.md").write_text(report_c1,encoding="utf-8")
print(json.dumps({"a1Recommendation":"PASS for six corrections","c1Recommendation":"PASS for E-02-05 pointer only","a1Files":8,"c1Files":6},indent=2))
