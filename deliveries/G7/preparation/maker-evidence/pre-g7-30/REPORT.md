# PRE-G7-30 — Child build exit and renderer attribution

**Disposition: incomplete / FAIL for the required two-source attribution matrix; unaccepted.** This is a local Codex maker-substitute result, not Gemini #3 and not an independent audit. External GPT Plus #2 review is **NOT RUN**; parent acceptance is **PENDING**. No application or mirror source was committed or changed.

P30 used exact accepted source 500d10fa5901be48d4ff877e608d65ba0e271bb9 (base app tree ba0b709192367e1d12a796618f97801a8fcd5a70, mirror tree 34f7ac0731984e50cbb06cf02039911ba65f59a9) and P25 donor source 28fb4187445206bcc62e2ef0ae2678e44ac6604b (base app tree f68074b41b8d2eea228d7fa964d3db8358a9fea4, mirror tree be03089ce9abae0f487bd829b4f24ddac9bb3dfd). Both received only the P28 measurement overlay in isolated temporary worktrees. The P28 observer, harness, configuration, and overlays were frozen before builds. No rendering optimization, threshold or tier change, DPR override, authored-asset change, service setup, or deployment occurred.

## Gate results

| Gate | Result | Evidence and qualification |
|---|---|---|
| Controlled child-exit probes | **PASS** for corrected pair | Corrected exit-0 and exit-23 probes record numeric child exits and byte-identical expected streams in attempt-01/runner-probes-attempt-02/. The earlier launcher/PATH probe failure remains preserved in attempt-01/runner-probes/. |
| Pinned installs and source preflights | **PASS** on completed attempts | Accepted install attempt-02 and donor install attempt-01, no-emit checks, and Playwright --list checks exited 0. Each list enumerated exactly eight rows without launching a browser. The incomplete accepted install attempt-01 remains a separate failure/deviation below. |
| Accepted-root build | Child/runner/outer exits **0**; runtime qualification **INDETERMINATE** | One build only, Node 24.19.0 and pnpm 9.15.9, flags NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 and NEXT_TELEMETRY_DISABLED=1; 92 monitor samples and 302 pinned Node observations. Descendant PID 32656 (parent 32576) has blank executable path, command line, and hash, with no identification in another sample. The runtime gate is therefore unproven and accepted-root capture is **NOT RUN**. No capture invocation was issued for this source. |
| P25 donor build | **PASS** under the reviewed build gate | One build only, child/runner/outer exits 0; 43 samples, 138 pinned Node observations, no reported monitor error, exact frozen flags and streams. Output stayed in the donor worktree. |
| P25 donor capture | **8/8 row tests PASS**, with metadata and console limitations | One sequential invocation, workers=1, retries=0, 30-second row timeout. All rows reached HOME with AUTO preference, expected initial/effective tier, DPR 1, complete attribution JSON and screenshot. See the table below and original row records. |
| Required accepted-root capture rows | **NOT RUN (8/8)** | Held because accepted build descendant PID 32656 could not be identified. |
| Overall P30 measurement | **INCOMPLETE / FAIL** | Donor evidence is present, but the accepted-root half is unavailable and donor process metadata has unresolved records. This does not establish the requested complete two-source comparison and does not accept P30. |

## Donor attribution results

Every browser/viewport row passed its Playwright assertion and reports the same call breakdown. Renderer submissions, lower-level WebGL draw API calls, and multi-draw invocations are separate counters: 118 main plus 11 shadow renderer submissions (129 inclusive); 110 main plus 11 shadow WebGL draw calls (121 inclusive); and 8 main multi-draw invocations with 0 in the shadow pass. DPR was 1 in every row. The complete object/material/program, group, visibility/layer, shadow-caster, dynamic/exclusion, capability, and screenshot records are preserved in per-row JSON files. The original `attempt-01/capture-row-summary.json` is preserved byte-for-byte, but its `inclusiveTriangles` field is null in all eight rows because its derivation referenced a field absent from the row JSON. The authoritative corrected summary is `attempt-01/capture-row-summary.corrected-v2.json`; it derives that field from each original row JSON `accounting.inclusiveRendererInfoTriangles`. Inclusive triangle totals are 29,448 per desktop row, 29,304 per mobile row, and 29,472 per compact and landscape row. The existing capture-local summary remains unchanged and independently contains those same eight corrected values.

| Browser | Viewport | Expected/effective tier | HOME | Inclusive renderer submissions (main + shadow) | WebGL calls (main + shadow) | DPR | Result |
|---|---:|---|---|---:|---:|---:|---|
| Chrome | 1440×900 | high / high | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Edge | 1440×900 | high / high | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Chrome | 390×844 | medium / medium | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Edge | 390×844 | medium / medium | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Chrome | 320×600 | medium / medium | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Edge | 320×600 | medium / medium | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Chrome | 844×390 | high / high | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |
| Edge | 844×390 | high / high | yes | 129 (118 + 11) | 121 (110 + 11) | 1 | PASS |

All rows recorded zero failing HTTP responses and no instrumentation warnings. The desktop Chrome and desktop Edge rows each contain the same generic console error: “Failed to load resource: the server responded with a status of 404 (Not Found).” The requested URL was not captured, so the 404 remains unlocated. The rows also record aborted Next _rsc navigation requests; these are requestfailed events, while failingResponses remains empty. Chrome and Edge screenshot byte hashes match per viewport; the retained PNGs are individually hashed in the complete inventory and referenced in their row JSON.

The donor capture monitor contains five all-blank process metadata observations, for PIDs 31996, 23780, 16788, 25064, and 9296. Parent read-only review found that only PIDs 31996 and 23780 remain wholly unidentified across sampled records; the other three PIDs are identified elsewhere. PID 3796 also has a partial blank observation but is identified in other samples. The receipt’s pinned-Node validator reports all 376 Node observations as matching the pinned Node path and SHA, but these missing records mean the full descendant identity history is not complete. Parent review counted 1,119 process records; a maker-side PowerShell flatten counted 1,118, and both traversals found the same five all-blank observations and the same two wholly unresolved PIDs. This count discrepancy is preserved rather than silently normalized.

## Preserved deviations, outputs, and restoration

The first accepted install was interrupted before a child receipt or numeric exit was produced. Its historical request/stdout/stderr bytes were overwritten when the completed attempt reused those paths. The interrupted receipt preserves only the original byte counts and hashes; the bytes cannot be recovered, and this is an evidence-preservation deviation. It is classified INCOMPLETE_NOT_PASS, not as a completed install failure or pass. The completed clean accepted install-02 and donor install-01 remain separately recorded. All setup, runner, resolver, manifest, and prebuild failures/corrections remain in their attempt-specific files; none was overwritten during finalization.

The accepted and donor temporary source worktrees have been restored to their exact pinned commits and clean tracked states. App and mirror trees match the packet pins. Three combined temporary overlay diff/patch files covering four overlay paths are archived under attempt-01/source-worktrees/. Each worktree still contains its original 537-file .next output (accepted 101,936,572 bytes; donor 101,929,605 bytes); no ignored build output or dependency directory was deleted. attempt-01/source-worktrees/restoration-after-builds.json records exact tree IDs and retained output locations. evidence-inventory.json lists every P30 evidence file and every regular file in both .next trees with raw byte count, SHA-256, and path-filtered Git blob ID. It does not follow or include the three dependency junctions in each source worktree or their targets. Only that inventory file excludes itself to avoid a recursive self-hash; no aggregate digest is used.

Physical-device checks, screen-reader checks, mobile soak, chrome://gpu, live services, sender/domain verification, deployment, and G7 checks are **NOT RUN**. No further build, capture, or suite was run during finalization. Parent/local audit and acceptance remain separate.
