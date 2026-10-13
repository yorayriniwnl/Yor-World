# R7 writer and output-isolation independent audit

**REWORK: three unclosed gaps remain.** Preserved-output, hard-link and interrupted-attempt guards are useful and the targeted checks below passed, but the current writer sequence cannot meet complete preflight and final-inventory requirements. This is local Codex independent advice; Parent retains acceptance authority.

Scope: current working bytes of candidate-driver, assembler, release library/builder/validator/policy, reservation helper and their allocated writer consumers/tests in `C:/Users/yoray/Projects/Yor-World-Local-Corrections`. These include uncommitted changes; Git HEAD alone is not the audited source identity. Raw hashes and preserved source snapshots are in `input-hashes.json` and `input-snapshot/`. No product/tool code, policy, real release artifact or historical receipt was changed. The R7 candidate driver was **not invoked**.

## R7-WRITER-01 — MEDIUM: bundle receipt collision is detected after archive creation

At `scripts/release/build-release-bundle.mjs:12`, receipt preflight validates path safety and policy containment through `assertPolicyOutput`, which does not reject an ordinary existing destination (`scripts/release/release-lib.mjs:128`). The archive is written at line 17; only the later `writeJson` at line 18 discovers that the receipt already exists.

Trigger: absent archive plus occupied ordinary receipt under the valid policy root, with successful bundle computation. Expected: reject before any archive write. Observed: exit 1 with EEXIST, original receipt unchanged, **new archive created**. `writer-probes.json` reproduces the ordering using the actual unmodified entrypoint body and copied real guards; only nonwriting bundle/Git computations use a known-good synthetic result. All filesystem writes occurred inside the owned isolated fixture.

Maker action: preflight occupation of every exclusive destination before the first mutation, retain final exclusive creation, and add a regression requiring no new archive when the receipt is occupied.

## R7-WRITER-02 — MEDIUM: missing parent is created at the wrong depth

`deliveries/G7/preparation/tools/reserve-attempt.mjs:56` uses the repository root when creating the first missing component, even when earlier parent components already exist. With `deliveries/G7` present and `evidence` absent, reservation creates **root/evidence**, then line 113 throws ENOENT while scanning the requested `root/deliveries/G7/evidence`.

Expected: validate existing ancestors, create each missing component beneath that validated chain, then exclusively reserve the raw directory. Observed: wrong directory created, requested parent absent, no successful reservation. This executed against the actual unchanged reservation helper. The current reservation test creates the full evidence directory first (`scripts/release/tests/reserve-attempt.test.mjs:14`), so its positive case does not exercise this branch.

Maker action: correct missing-component ancestry and test each possible first missing index, including no creation outside the requested parent chain and alias rejection.

## R7-WRITER-03 — HIGH: package and final inventory reuse exclusive artifact names

The driver package phase runs ordinary assembly (`deliveries/G7/preparation/tools/candidate-driver.py:607`), which writes commands, omission inventory and checksums. The required later inventory phase runs the same assembler with `--inventory-only` on the same delivery (`:632`). Inventory-only still stages `commands-and-exit-codes.md` (`assemble-evidence.py:338`) and the same inventory/checksum filenames. Existing outputs then collide at line 403 or the exclusive output preflight at line 422.

Expected: the normal required final-inventory handoff has a valid fresh-output path while earlier artifacts remain preserved. Observed: actual assembler execution in its existing isolated test fixture succeeds once (exit 0), then a later `--inventory-only` call fails (exit 1) on the existing commands file. All three prior output hashes remain identical. This is source/flow incompatibility, not a reason to weaken immutability or overwrite earlier evidence. The driver phase trace is source-only; no driver or actual R7 workflow was run.

Maker action: reconcile package and final-inventory artifact names/namespace under an explicit Parent-compatible contract, preserve earlier artifacts, and add sequential packaging/validation/final-inventory proof in isolated fixtures.

## Verification matrix and limits

| Requirement | Result | Evidence / actual scope |
| --- | --- | --- |
| Every bundle destination preflight rejects before first mutation | FAIL | R7-WRITER-01; actual entrypoint/guards, synthetic nonwriting bundle computation |
| Reservation correctly creates partially missing ancestors | FAIL | R7-WRITER-02; actual helper and filesystem |
| Required final inventory can follow package without rewriting old artifacts | FAIL | R7-WRITER-03; actual assembler fixture plus source-only driver trace |
| Preserved artifact through hard-linked output cannot be overwritten | PASS | Actual `writeJson` rejects link; isolated sentinel bytes unchanged |
| Preserved directory through contained junction cannot receive output | PASS | Actual guard rejects immutable alias; isolated sentinel unchanged, no new file |
| Interrupted raw observation cannot resume the same attempt | PASS | Actual helper rejects existing raw directory; directory retained, receipt not invented |
| Candidate phases use start/completion receipts and block repeat/advance after interruption | PASS, source/test inspection | Driver lines 387, 445–489 and existing policy-output regression; no driver execution |
| Assembler validates all staged destinations/input collisions before its first write | PASS, source/test inspection | Assembler lines 419–431; exact output collision reproduction left prior artifacts unchanged |
| Current policy root/archive aliases, preserved destinations and input/output collisions reject | PASS, source/test inspection | Release library lines 81–145; validator lines 14–37; driver lines 92–99/212–239; associated negative tests |
| Runtime policy drift is rechecked by driver guards | PASS for inspected guard | Driver lines 212–217 and existing regression. No concurrent filesystem/policy race injection in this audit |
| Legacy RC4/RC5 builders are disabled by the current RC6 policy | PASS, source inspection | Both legacy entrypoints check releaseId before their archive-writing branches |
| Full reported Node/Python suites | NOT RERUN | Parent reports 113/113 and 28/28 PASS. Read preserved older 109-case Node and 28-case Python logs; do not relabel older counts as today's exact-source execution |
| Real R7 driver/package/build/browser/provider/deployment execution | NOT RUN | Explicit task constraint; only owned isolated fixture mutations |

The writer probe batch had five diagnostic outcomes: two required outcomes failed and three guards passed. The additional actual assembler probe exposed the third finding. These are diagnostic filesystem/flow checks, not product application, browser, hosted-provider or full-release tests. The first writer probe stopped at the newly discovered reservation error; that failed scratch tree was preserved and a fresh fixture captured complete results.

This bounded audit does not certify arbitrary concurrent adversarial filesystem mutation between preflight and open, filesystem guarantees on other operating systems, unrelated live/manual evidence writers, or actual packaging/build/provider results. Single-output consumers that delegate to exclusive `writeJson` were traced; the actionable findings above concern the allocated current R7 flow and reservation helper. Source snapshots and exact command exits preserve the distinction between inspection, controlled probes and unrun full execution.

Send the three findings to the assigned release-tool maker for correction and independent delta review before Parent attempts the real R7 driver. Do not overwrite preserved failed attempts or relax output preservation to make the final phase succeed.
