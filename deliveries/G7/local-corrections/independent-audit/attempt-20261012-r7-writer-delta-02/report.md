# R7 writer-isolation delta recheck

**REWORK: the current local candidate still has three open writer gaps.** This is a Parent-local recheck of the current uncommitted source identity, not the assigned external GPT Plus #2 delta audit and not Parent acceptance.

Source identity: branch `fix/local-studio-check`, HEAD `e75109a680454576601419e31d571463ad9167f1`, dirty worktree. The audited implementation and test files are snapshotted under `input-snapshot/` and bound by `input-hashes.json`. No maker source, policy, release output, or historical receipt was edited by this recheck.

## Findings

### R7-WRITER-01 - OPEN: occupied bundle receipt leaves a partial archive

`scripts/release/build-release-bundle.mjs:12-18` validates the receipt path and verifies it differs from the archive path, builds the archive, writes the archive, then writes the receipt exclusively. `scripts/release/release-lib.mjs:128-137` checks policy containment and path aliases but does not reject an ordinary existing receipt. The receipt write therefore discovers `EEXIST` only after the archive has been created.

`writer-probes.json` executes the current entrypoint body and current release-lib guards in an isolated fixture. Only `buildBundle` and the Git identity lookup were replaced with a known-good, nonwriting synthetic result. With an absent archive and occupied receipt, the process exits 1, leaves the original receipt byte-identical, and creates the archive. This reproduces the partial-write defect without running a real release bundle. The exploratory full-bundle clone attempt did not reach the writer and is not counted as evidence because its source-tree precondition failed.

### R7-WRITER-02 - OPEN: reservation fails when an existing parent is followed by a missing component

`reserve-attempt.mjs:42-66` succeeds when the entire `deliveries/G7/evidence` chain is absent, but its first-missing-component logic uses the repository root instead of the already validated prefix for later missing indices. The direct current-helper probe in `probe-results.json` records:

- No parent components present: PASS.
- `deliveries` present, `G7` absent: FAIL with `ENOENT`; creates the wrong `root/G7` directory.
- `deliveries/G7` present, `evidence` absent: FAIL with `ENOENT`; creates the wrong `root/evidence` directory.

The ordinary reservation test pre-creates the full evidence directory (`reserve-attempt.test.mjs:12-15`), so it does not exercise either failing branch. The `deliveries/G7`-exists case matches the candidate's normal output layout.

### R7-WRITER-03 - OPEN: package and final-inventory phases reuse exclusive filenames

`candidate-driver.py:601-610` runs ordinary assembler output during `package`; `candidate-driver.py:625-636` later invokes the same assembler with `--inventory-only` on the primary delivery. `assemble-evidence.py:338` stages `commands-and-exit-codes.md` in both modes and lines 413-417 stage `inventory-omissions.json` and `SHA256SUMS.txt` under the same names.

The isolated current-source assembler probe in `probe-results.json` succeeds on its first inventory-only invocation, then fails on the second with `Output case-aliases an existing portable inventory path`. All three earlier output hashes remain unchanged. I did not invoke the candidate driver or claim a full package-to-inventory run; the phase wiring and unconditional duplicate staging establish the conflict, while the isolated repeat proves the exclusive-output collision behavior.

## Verification and limits

The focused command `node --test scripts/release/tests/policy-output.test.mjs scripts/release/tests/reserve-attempt.test.mjs scripts/release/tests/assemble-evidence.test.mjs` passed **62/62 tests**, exit 0. Raw output is `focused-tests.log`. These tests cover useful path, alias, hard-link, and preservation guards, but do not cover the occupied-receipt case, later missing-parent indices, or a successful package-to-final-inventory sequence.

Raw hash comparison in `delta-comparison.json` confirms all nine current implementation and focused-test inputs are byte-identical to the earlier R7 writer audit snapshots. No correction delta was found for the three findings. The present reservation helper only succeeds in the all-parents-missing branch.

No candidate-driver run, actual R7 package, app build, browser/provider/deployment check, or G7 acceptance run was performed. Existing outputs and receipts were left intact. Exact raw hashes, command receipts, and probe results are in `input-hashes.json`, `execution-receipts.json`, `probe-results.json`, and `writer-probes.json`.

R7 should remain **REWORK / NOT COMPLETE** until the maker preflights every exclusive destination before its first write, fixes and tests every partial-parent case, and resolves package/final-inventory naming under the accepted output contract. Then the assigned GPT Plus #2 delta audit and separate Parent acceptance remain required before any real R7 candidate execution.
