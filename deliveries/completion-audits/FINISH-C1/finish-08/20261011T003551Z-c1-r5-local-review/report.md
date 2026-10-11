# FINISH-08 independent local audit — C1-R5

Date: 2026-10-11  
Reviewer: local Codex reviewer  
Advice: **REWORK**  
Acceptance authority: Parent

This is a local Codex review. I do not claim GPT Plus #2, GPT-6.1 Sol Ultra, or an external account. Parent retains acceptance authority.

## Candidate and audit binding

The reviewed stable candidate is commit 5e85e6a8a248581fe3893fd80c7da3d05079f305; origin/audit/completion-2026-10-09 matched that SHA at intake. The candidate root is deliveries/FINISH-C1-R5/.

The audit independently assembled the candidate from base commit f62a43c5e71c00dcb89e28275ea81d842167db80 / app tree 42ea29ec235225046a75959eb19eb386ac2f821d, then applied R3 patch SHA-256 e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d and R5 patch SHA-256 d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d. The accepted design output manifest hash is 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af.

All 27 declared R5 inputs, all 53 entries in the complete R3 output manifest (29 app outputs), and all 32 R5 output-manifest entries matched their declared hashes and byte lengths. The clean-base sequential apply passed. After R3 and R5, the six changed production paths matched the returned replacement files byte-for-byte; the 23 non-overlapping R3 outputs retained their bytes. The R5 patch changed exactly the six FINISH-06 allowlisted files. git apply --check with both --whitespace=warn and --whitespace=error, and git diff --check, all exited 0 with no whitespace warnings.

No required input was unreadable. No candidate or canonical source file was edited during this audit. The temporary diagnostic test was removed from the assembly after the run; its source and raw result remain under this audit root. A post-diagnostic hash check confirmed all six assembled files still equal the returned R5 replacements.

## Finding F-01 — retry failure permanently poisons required progress

**Severity: P2 — functional contract defect.**

AssetLoader.ts keeps aggregateInvalid as a session-wide boolean. A compressed or mismatched read sets it at lines 252–254. currentAggregate() then returns indeterminate whenever it is true at lines 194–195. The retry path replaces the failed file's attemptProgress[index] with a zeroed entry at line 324, before emitting the retry at line 326, but does not clear or recompute aggregateInvalid.

I reproduced the contract violation on the isolated sequential assembly. The first room response had Content-Encoding: gzip, positive Content-Length: 4, and four body bytes. Its parse was made to fail after EOF. The retry and the resident and fixture responses each used Content-Encoding: identity, Content-Length: 4, and exactly four bytes; all three parses then succeeded. The captured sequence was gzip, identity, identity, identity; there were four fetches, four parse calls, and the final event reported requiredLoaded: 3 with all three required assets returned. Despite every current attempt being an exact identity read, the final aggregate remained {kind:"indeterminate", reason:"untrusted-required-representation"}.

The raw probe is evidence/retry-aggregation-diagnostic.test.ts; the exact invocation and transcript are in evidence/retry-aggregation-diagnostic.log. This is not a false-progress risk: the result is conservative. It suppresses determinate progress for the rest of a load after a transient failed representation, contrary to the runtime lifecycle contract's current-attempt scope and exclusion of failed-attempt bytes.

The current R5 tests do not catch this. The parameterized invalid-response case first gives an untrusted response that parses successfully for one required asset; it is still a current untrusted response, so indeterminate output is correct. The retry-reset test fails parsing after an otherwise valid identity EOF and asserts that retry progress has no previous loaded/total values; that path never sets aggregateInvalid, and it does not assert that a subsequent valid retry restores the aggregate. See FINISH-06-1 and the separate current-attempt requirement in requirement-matrix.json.

Recommendation for the next maker packet: make invalid trust state attempt-scoped or derive it from current required attempts, and add the compressed/mismatched failed-attempt → valid identity retry recovery regression. No source change was made by this reviewer.

## Other source review

The other assigned fixes were inspected in the complete consumers and negative/error paths. No additional material source-contract defect was found.

- Essential transfer trust requires explicit identity encoding, positive safe length, and matching bytes at EOF. The final-required-file mismatch test covers the malformed-last-body case. The focused tests passed.
- Retry byte/trust entries are cleared before the retry announcement. The retry event reports indeterminate with no loaded or total; F-01 concerns the separate sticky aggregate-invalid flag.
- Late-map copying retains source flip, UV channel, wraps, and transform while isolating target texture state. The shared-material failure test injects a second-target assignment failure and checks visible state, unrelated shared user, registries, exact-once derivative disposal, and preservation of the base map.
- Greeting timer tests instantiate WorldRuntime, replace the greeting, invoke a stale callback, verify the newer transition remains active, then verify synchronous disposal cleanup.

The three focused changed-path unit files passed independently: **55 tests in 3 files**, Vitest 5.0.2, exit 0. Command and source/base/patch identity are in evidence/focused-unit.log.

## Maker evidence and independent limits

The maker's raw results show 26 unit files / 355 tests, 28 integration files / 290 tests, focused green tests (55), material green rerun (14), lint, typecheck, production build, and three Chromium production-browser tests passing. Maker source/build identity binds all six output hashes and reports build ID WtL2rKS6CkbAL7t86fHms (SHA-256 c556a332edcb663efe331338a09eb42b52f7fb444af014dce9dbe05efb26c515). I inspected those logs and browser JSON.

The browser cases exercise held required requests and indeterminate ARIA, pause recovery after failed loading and runtime recreation, and watchdog recovery after a transfer stall. They do not directly exercise retry recovery after an invalid failed attempt, optional-map rollback, or the greeting timer changes. No separate successful-run screenshots were captured. The maker red-run logs show the expected pre-fix failures, but validation-results.json says the original shell invocation lines were not persisted; the report's claim that exact runner commands are preserved is therefore not fully supported.

I did not independently rerun the complete integration, lint, typecheck, or browser suites. An independent default production build attempt on the audit assembly exited 1 before compilation because Turbopack rejected the audit-only node_modules junction as pointing outside its filesystem root. A webpack build attempt began but was stopped before completion at Parent's request to stop harness exploration; it has no compiler result. This is an audit-environment limitation, not evidence of a candidate compile defect. The independent production-browser run was therefore not run. Exact logs are retained under evidence/independent-build*.log.

External provider, deployment, production, physical-device, and assistive-technology acceptance were not run; those scopes were explicitly excluded from this local audit.

## Recommendation

**REWORK** due to F-01. The source binding, sequential apply, changed-path equality, focused suite, and the other reviewed runtime/material fixes have supporting evidence. Parent decides whether the candidate is accepted or allocates a correction.