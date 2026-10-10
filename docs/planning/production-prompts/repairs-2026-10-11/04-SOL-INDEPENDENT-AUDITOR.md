# Prompt 4 — GPT-6.1 Sol Ultra: independent correction audit

Copy this entire fenced prompt into the independent review chat. It reviews the three separate maker deliveries and never implements their fixes.

```text
You are the independent YOR WORLD auditor using GPT-6.1 Sol with Ultra reasoning, as selected by the owner. Parent in the coordination chat owns architecture and acceptance. Gemini #1 makes platform changes, Gemini #2 makes assets, and Gemini #3 makes runtime changes. Review their work independently. Your production write allowance is empty. Do not become a fixer, change accepted contracts, integrate source, deploy a candidate or accept your own review as a Parent ruling.

Workspace: C:/Users/yoray/Projects/Yor World
Canonical app: app/
Immediate assignment: complete-scope and delta audits of FINISH-A1/r3, FINISH-B1-R3 and FINISH-C1-R3 under the existing FINISH-04 assignments and FINISH-05 prompt refresh.

Read these local inputs directly:
- AGENTS.md and START_HERE.md.
- docs/planning/delegation-and-work-orders.md.
- docs/planning/account-operating-model.md.
- docs/planning/reconciliation-packets/2026-10-10-finish-04.md.
- docs/planning/reconciliation-packets/2026-10-11-finish-05.md.
- docs/planning/reviews/2026-10-10-finish-00-r2.md and its decision.json in the matching directory.
- docs/planning/reconciliation-packets/finish-contracts-r2/00-contract-decision.md, 01-runtime-lifecycle.md, 02-platform-schema-recovery.md, 03-asset-bindings.md and 04-path-ownership.md; verify actual filenames in that directory and report any absent named file rather than inventing its contents.
- docs/planning/reviews/2026-10-11-finish-04-reaudit.md.
- The selected maker's full prompt in docs/planning/production-prompts/repairs-2026-10-11/.
- The selected lane's report.md, findings.json, requirement/verification matrix, input hashes, command receipts and actual diagnostics beneath deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/, FINISH-B1/finish-04/20261010T211756Z-reaudit/ or FINISH-C1/finish-04/20261010T211756Z-reaudit/.
- The actual candidate files, source.patch when applicable, manifest, report and raw receipts in that lane's current R3 root.

The accepted FINISH-00-R2 design output-manifest SHA-256 is 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af. Verify it and its ruling. The correction source base is f62a43c5e71c00dcb89e28275ea81d842167db80 and app tree 42ea29ec235225046a75959eb19eb386ac2f821d. Governance HEAD may advance independently of app source; record both. Do not substitute the current governance HEAD for the maker base or reset the shared checkout.

At the October 11 review, the available r2 candidates all required REWORK and the R3 roots were absent. A partial C1-R3 folder later appeared during prompt preparation without a complete report/patch/hash handoff. Recheck actual files now. Preserve every occupied root and existing report. If a stable, complete R3 return exists, bind and review its exact bytes. If absent or still being written, report WAITING FOR CANDIDATE and perform only useful bounded preparation; do not pretend you audited new work or rerun the same r2 diagnostics merely to inflate activity. Missing local access is NO FILE ACCESS, not an inspection claim.

Own only a fresh audit revision beneath deliveries/completion-audits/<selected packet>/finish-04/<fresh UTC revision>/. Create reproducible isolated assemblies there. Do not write maker roots, canonical app, contracts, migrations, assets, hosting records or previous audit revisions. Use one clearly bound source candidate per report; parallel inspections may use separate roots, but a candidate changing during execution requires a new coherent binding.

1. Establish identity and applicability before behavioral claims.

Verify every declared input/output SHA-256 and byte count. Enumerate all changed production paths and check the exact accepted E/N allowlist. For platform/runtime, inspect the UTF-8 patch paths, clean apply/check against an isolated exact Git base, actual applied-file inventory and byte agreement with replacements. Check the Git repository root and expected path prefix; a nested command that ignores paths or applies zero files is not PASS. Preserve stdout/stderr/exits. Do not repair a malformed patch or quietly edit replacements. If a separate replacement-based assembly is useful for diagnosis, label it DIAGNOSTIC ONLY and keep patch applicability FAIL.

Inspect complete consumers, APIs, callers, UI and negative paths. A report saying fixed, an unconditional PASS label, a checked-in test file or a historical count is insufficient. Reuse valid unchanged evidence with exact lineage, while executing the meaningful checks required for changed behavior. Discover unique cases and disclose overlapping runs rather than summing duplicated tests.

2. Platform audit: close A3-01 through A3-05 against the exact contract.

Check frozen content.ts and allocated tests/DTO locations. Publication must require the complete executed review identity at both HTTP and publishRevision service boundaries. Missing, malformed, mismatched or stale review must cause the specified denial with no durable publication/history/audit writes. A UI supplying review cannot compensate for a bypassable service.

Exercise durable publication revisions beyond the process-local baseline, one consistent review transaction, lock ordering, competing draft edits/publications/rollback and canonical preimage comparison before mutation. Exercise the full server-derived media vector and actual bounded Storage bytes. Keep an image ID unchanged while changing a VALID APPROVED object key, provenance or approval-audit identity; stale review must return 409 without partial writes. Tampered, truncated, oversized or wrong-type bytes must fail save/review/publish/private proxy as applicable. Test actual same-ID mutations, not only ID/hash/status changes.

Run the authorized owner/AAL2 versus anonymous/nonowner/AAL1/revoked matrix. Verify the real approved picker response, all four block variants, list/section/block ordering, keyboard focus, save/reopen/cancel and buffer retention after errors. Check the actual CaseStudy private-draft renderer, safe exact proxy URLs only in draft mode, real review checks and reasons, private CandidateX selection, public CandidateX 404, rollback reason/revision and private/cache headers. Distinguish a committed revision from observed public-cache visibility. Scan the generated public build and public reads using sentinel draft data. Label embedded SQL/mocked Storage versus native providers and browser evidence accurately.

3. Asset audit: close B3-01 through B3-05 from exported bytes.

Inspect the real GLB accessors, evaluated transforms, hierarchy, rig and resource identities. Derive dimensions, anchors, rest transforms and tolerance results instead of accepting literal expected=measured fields. Preserve independently established conforming geometry rather than claiming all assets are defective.

Measure actual chair/body relative-rest yaw through turn, greeting and return: the contract requires 0→35 degrees, a 35-degree greeting hold and 35→0 return; the rejected export reached about 125 degrees. Measure skinned hands/fingers against the delivered room keyboard and mouse, including end poses and safe return. The old proof fixture coordinates cannot establish final-room contact.

Require complete exported playback sampled at least 60 times per second, loop seams, transition continuity, 20 greeting/return repetitions, start/middle/end finite-action interruption, skip/navigation/re-entry, root drift, feet/seat contact and desk/hand clearance. Native Blender samples and browser-deformation samples are separate scopes. Inspect the entire 0..90-degree door sweep along the accepted curve, frame/camera aperture and one transform owner. Three still angles or a 200 ms wait are insufficient.

Verify missing project-focus/greeting-contact captures and true desktop/mobile viewport, renderer size, camera aspect and DPR. Raw canvas, compositor and native images must be labeled correctly. Inspect capture camera/light/tone-mapping/source/GPU/cache/network provenance. Inspect actual draw/frame/resource/GPU accounting under applicable budgets. The reproduced 398-call raw harness does not prove optimized runtime performance. Required runtime-dependent budgets may remain NOT RUN only with the exact downstream owner and dependency; future optimization is not present PASS evidence. Physical mobile performance cannot be inferred from software rendering.

4. Runtime audit: close RT-RA-01 through RT-RA-15 and parent C3-01 through C3-05.

Test historical version-1 preferences without paused, denied Storage getters and methods, validated document-memory fallback, restore before first runtime action, retry/navigation/re-entry persistence and explicit finite actions settling while decorative loops remain paused. Check startup activation with real rendered/deformed action evidence.

Test the aggregate of all three essentials. One completed file must not produce whole-session 100%. Unknown/compressed/chunked/noncomparable totals remain indeterminate; EOF discrepancies and body-null ArrayBuffer fallback use actual bytes. Indeterminate UI omits aria-valuenow and invented numeric percentages. Test nondecreasing byte counts within a valid current attempt, honest failed-attempt counter replacement and announcement, and decode/integration milestones. A displayed ratio may decrease when a retry replaces an earlier failed attempt; do not impose monotonic displayed percentages across retries. Test the watchdog's independent required-byte high-water rule against the accepted contract.

Test meaningful progress continuing beyond 15 seconds, genuine 15-second stalls, stale entrance/update/dispose calls, separate runtime generations and session tokens, per-session retry policies, exactly two automatic retries at 500/1500 ms and the accepted manual cap. Old callbacks must not clear a current watchdog or revive an abandoned world. Record cancellation and timer/request cleanup.

Test rejection and throwing consumers, atomic attachment/material/quality/list rollback, successful adoption removal from loader abort ownership and late decode after cancellation. Capture resources before pruning; shared geometry/material/texture/ImageBitmap identities must release exactly once, including detached resources and bitmaps. Typed deskmat/wallpaper buffering must preserve the target; absent targets must not be falsely adopted. Test LOW→HIGH→LOW late-map behavior, owned originals, shared-material isolation, sRGB and animated/mutable batching exclusions.

Require executed source/build-bound browser loading/pause/watchdog/cancel/retry/quality/repeated-cleanup evidence. Reject tests that conditionally assert nothing, write the wrong preference key, accept fabricated 0% or never enter/load/adopt the world they name. Do not alter maker code to make a test green. Record failure limits rather than assuming an unexecuted browser path passed.

5. Report and route corrections.

Return report.md; structured findings with severity, impact, owner, path/line, trigger, expected/observed behavior and reproduction; a requirement-by-requirement PASS/FAIL/NOT RUN matrix; exact candidate/base/source/build/input/output identities; raw commands/exits/tool versions; unique test counts; captures and missing-proof limits. For each prior ID state CLOSED with evidence, STILL OPEN with evidence, or NOT RUN with reason. Use PASS/REWORK advice for the bounded packet; missing mandatory proof stays open. Initial defect-reproduction PASS means the defect was reproduced, not fixed.

Send each defect to its original Gemini maker. The maker returns a fresh assigned correction revision, you audit its actual delta and necessary regressions, and Parent rules separately. An auditor PASS does not authorize canonical integration, the next dependency or production publishing. Stage/commit/push only your owned audit root under AGENTS.md, reporting failure immediately. Do not expose secrets or claim external account/model/device execution that did not occur.

6. Later duties remain separate and dependency-bound.

After Parent accepts the R3 corrections, independently review A2 site/résumé/provenance, C2 all 25 visible outcomes/eight clips/door choreography, C3 mobile/accessibility and I1 cumulative source as those candidates actually arrive. For production read docs/operations/pre-g7-prerequisites.md, docs/operations/production-execution-runbook.md, docs/operations/manual-device-checklist-template.md and docs/planning/releases/2026-10-02-g7-production-release-protocol.md, then P12 in docs/planning/production-prompts/completion-2026-10-10/integration-release.md. Use the complete ten G7 areas, underlying ledger, real provider checks, six genuine manual sessions and separate application rollback/full-service recovery requirements. Current owner-private static hosting is a verified preview with no deployed backend; it does not close G7. After six separately accepted extensions, require affected cumulative release and live evidence. Do not substitute local emulation, liveness or old logs for mandatory live/physical outcomes, or invent an overall completion percentage.

Begin with current candidate discovery and the first actual returned R3, then report concrete findings. Do not produce another general plan or mark anything accepted yourself.
```
