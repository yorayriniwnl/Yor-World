# FINISH-04 local delivery re-audit — 2026-10-11

**Disposition: REWORK for all three inspected maker candidates.** The local deliveries contain substantial implementation and some passing evidence, but do not satisfy the accepted FINISH-04 correction requirements. No implementation, canonical integration or production gate is accepted by this record.

The owner requested “Reaudit. They are completed.” and then “See local files.” Parent inspected the actual local returns and commissioned three independent, disjoint audits using actual `gpt-6.1-sol / ultra` collaboration invocations. The reviewers wrote diagnostics and reports only; no maker source, canonical application or accepted baseline was changed. These were local audit invocations, not external GPT/Gemini account dispatch.

The workers reached a usage limit after executing and saving the diagnostics. Runtime had saved its final report; art had saved its report generator; platform had saved complete results and receipts. Parent compiled the platform narrative, executed the saved art report generator, checked the retained results and completed artifact validation. This reporting handoff is distinct from additional independent execution or acceptance.

## Inspected state and evidence

At intake, coordination HEAD was `afc69a9a154d2036562728bb61d9948297871149`; canonical app tree remained `42ea29ec235225046a75959eb19eb386ac2f821d`. The declared maker base is `f62a43c5e71c00dcb89e28275ea81d842167db80`. The accepted contract output manifest remains `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.

Actual candidates inspected:

| Lane | Actual local candidate | Independent report | Advice |
| --- | --- | --- | --- |
| Platform | `deliveries/FINISH-A1/r2/` | [Platform re-audit](../../../deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/report.md) | REWORK |
| Art | `deliveries/FINISH-B1-R2/` | [Art re-audit](../../../deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/report.md) | REWORK |
| Runtime | `deliveries/FINISH-C1-R2/` | [Runtime re-audit](../../../deliveries/completion-audits/FINISH-C1/finish-04/20261010T211756Z-reaudit/report.md) | REWORK |

The assigned `FINISH-A1/r3`, `FINISH-B1-R3` and `FINISH-C1-R3` roots were absent. Parent refreshed GitHub refs, inspected branch history and searched the main workspace; a read-only collaborator also searched seven related local project checkouts. This establishes what was available here, not whether work exists in another external session. Folder names alone did not determine the verdict: the audits inspected actual source/assets, checked identities and executed focused diagnostics. [Intake and governing-input receipts](2026-10-11-finish-04-reaudit/intake.json) preserve the discovery scope.

## Platform: required publication and media boundaries still fail

The platform reviewer verified all 22 declared output identities and all 54 accepted contract outputs. The delivered UTF-16LE patch fails the exact-base Git applicability check. Replacement files also change frozen `content.ts` and place the new unit suite outside its allocated path.

The reviewer assembled a clearly labeled diagnostic candidate from the exact base plus byte-identical replacements. This permits behavioral investigation; it does not repair or validate the delivered patch.

**Executed: 24 unique required-outcome checks; 6 passed, 18 failed.** The first run had 21 cases; three additional nonoverlapping cases checked review-revision disagreement, altered stored bytes at publication and post-review draft conflicts. The tests used embedded PGlite, real PNG validation, synthetic authentication, mocked Storage and React server rendering. They are not browser, native PostgreSQL or real-provider proof.

Material reproduced failures include:

- Publishing without the required review commits a new durable revision; the API returns 200 instead of rejecting the request.
- An old review remains usable after valid approved same-ID media changes to the object key, provenance, creation time or approval-audit identity; publication commits instead of returning 409 with no writes.
- Review reads process-local revision 1 while durable revision 7 is current, and does not execute the required consistent review transaction.
- The private image proxy returns tampered Storage bytes with 200; saving a draft with a missing/unapproved image succeeds with 201.
- Private CandidateX selection, rollback concurrency/reason requirements, canonical hashing and safe private-image rendering boundaries remain incomplete.

The exercised anonymous/nonowner/AAL1/revoked guard subset passed. Strict lint still fails on the unused `ProjectId` import. Required complete editor/picker/browser/build proof is not established by these diagnostics. See the lane report for exact source lines, assertions, scope limits and the full requirement matrix.

## Runtime: progress, cancellation and resource ownership remain defective

The runtime reviewer verified all 29 declared replacement identities. The delivered patch fails a trustworthy check outside parent-repository discovery with an invalid concatenated path. An initial nested Git command was discovered to be a path-prefix no-op; it is retained and explicitly excluded from applicability proof. No patch was applied to the canonical application.

**Executed: 29 unique required-outcome checks; 9 passed, 20 failed.** These are isolated Vitest boundary diagnostics using the unchanged replacement candidate, not live-browser or physical-device acceptance.

Material failures include:

- Old version-1 preferences without `paused` fail parsing; one blocked-storage access path loses pause persistence.
- A single completed file is reported as completion of the required aggregate; mismatched EOF and fallback lengths are mishandled.
- Loading can time out after 15 seconds despite meaningful progress; a stale entrance callback can clear the active watchdog, and generation handling admits stale progress.
- Throwing optional consumers leak decoded resources; adopted textures retain loader abort ownership; shared resources may be disposed repeatedly while pruned resources, textures and bitmaps are missed.
- Late textures do not survive low/high quality transitions correctly and can affect unrelated shared materials.
- Additional pause/finite-action and supplied browser-test gaps remain recorded in the lane report.

Passing diagnostics are retained separately. The supplied browser test file is not proof that the full loading/pause workflow ran or met the required behavior.

## Art: measured positives, plus actual animation and contact defects

The art reviewer independently decoded exported geometry and sampled the delivered assets with Three.js in Chromium. The executed browser sampling included 1,040 deterministic clip samples at 1/60-second animation intervals and 151 door-curve positions. This is animation-state sampling, not a claim of sustained 60 FPS or complete runtime transition/cancellation proof.

Measured positives include 25 sampled rigid anchors/door-leaf bounds, preserved skeleton/rest/bind identity, and zero sampled root drift. Prior unchanged validator and image-exposure evidence retains only its demonstrated scope.

Actual defects and remaining proof gaps include:

- The exported turn/greeting/return reaches approximately **125°**, while the accepted asset contract requires **0→35°→0**. The source generator still sets `TURN` to 125°.
- Sampled hand/finger positions do not reach the final room keyboard/mouse locations. The resident motion still targets the old proof fixture positions.
- The supplied browser harness records clip PASS after waiting 200 ms, without the required transition/repetition/cancellation assertions. Full contact, camera-aperture and continuous runtime clearance proof remains incomplete.
- Required project-focus/greeting captures are missing. The purported mobile raw-canvas evidence is 1920×1080 despite a 720×1280 claim, and includes composited DOM overlays.
- The diagnostic harness reproduces 398 render calls. Applicable integrated tier/frame/GPU budgets remain unproven; future batching cannot establish a current pass.

Missing evidence is distinguished from an observed asset defect. The audit does not label all geometry incorrect, claim a physical-device failure or treat deterministic sample count as performance proof.

## Current continuation

The prior A1 lint-only REWORK and B1/C1 PASS reports remain preserved. Their broader closure conclusions are insufficient for the exact current contracts in light of these source-bound reproductions. This re-audit supplies the complete-scope supplement requested by [FINISH-04](../reconciliation-packets/2026-10-10-finish-04.md); it does not rewrite the accepted design or old reports.

Continue the already issued correction assignments, using the fresh lane findings as additional exact inputs:

1. **Gemini #1:** [A1-R3](../production-prompts/corrections-2026-10-10/01-GEMINI1-A1-R3.md), output `deliveries/FINISH-A1/r3/`. Correct the full publication/media/authoring scope and patch/ownership failures, not only lint.
2. **Gemini #2:** [B1-R3](../production-prompts/corrections-2026-10-10/02-GEMINI2-B1-R3.md), output `deliveries/FINISH-B1-R3/`. Preserve conforming assets; correct measured yaw/contact defects and return genuine required motion/capture/budget evidence.
3. **Gemini #3:** [C1-R3](../production-prompts/corrections-2026-10-10/03-GEMINI3-C1-R3.md), output `deliveries/FINISH-C1-R3/`. Correct the runtime findings and return an applicable patch plus real lifecycle/browser proof.
4. **Independent auditor:** [complete-scope/delta audit](../production-prompts/corrections-2026-10-10/04-GPT2-AUDITOR.md) of each actual fresh return. Parent makes separate implementation rulings afterward.

Recheck root availability before writing; never overwrite a later return. A2/C2/C3 and canonical integration retain their existing predecessor gates. No production fixes, deployment changes, source acceptance or G7 acceptance occurred during this re-audit.
