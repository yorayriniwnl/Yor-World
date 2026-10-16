# PRE-G7-29 parent ruling

Date: 2026-10-16

Disposition: **FAIL / NOT ACCEPTED**

PRE-G7-29 does not establish a qualifying production build and produced no renderer-attribution captures. The maker evidence is commit bd72e9544832351de289d5c5a9cbaefed6b836db on codex/pre-g7-29-maker-20261016. The accepted 500d build was launched once and its captured output shows compilation, TypeScript, static-page generation, and a route table. However, its persisted receipt has childExitCode set to null; the outer wrapper exit code of 0 does not establish the child build exit. The build gate is **INDETERMINATE**, so no browser capture was authorized. The P25 donor build and all sixteen capture rows are **NOT RUN**. No retry occurred.

## Independent review

A read-only local Codex substitute audit verified the maker commit against its remote, clean worktree, and P29-only scope. All 83 inventory rows match raw sizes, SHA-256 values, paths, and committed Git blob IDs. All eleven canonical P28 copies and seventy frozen input-file bindings match; all 33 JSON artifacts parse. The independent reviewer also verified the 537-file, 101,912,188-byte accepted build-output inventory, resolver and preflight receipts, and restoration of both source worktrees to their exact pinned commits. The build receipt correctly leaves the child exit indeterminate. This was not external GPT Plus #2; external audit remains **NOT RUN**.

## Findings

The P28 canonical bindings, pinned Node and pnpm resolver checks, frozen installs, TypeScript no-emit checks, and Playwright eight-row listing preflights passed for both sources. The accepted build monitor recorded fourteen Node processes, each at the pinned Node path and hash, and reported complete runtime qualification. These observations do not supply the missing child exit code.

The accepted build stdout is 1,305 bytes and has SHA-256 12c5d0c777b2543ad670cdfb4491fe367da39efc8335c11bc135275918077987; stderr is empty. Those logs are useful evidence of progress, not proof of process success. The maker preserved the failed evidence-wrapper attempts and its first output-inventory helper failure. The corrected inventory only inspected existing output and did not rerun the build. The maker also disclosed whitespace warnings from git diff --cached --check; the affected bytes are preserved canonical inputs and recorded command output.

No donor build, browser launch, or capture occurred. No renderer attribution, optimization, threshold change, parity claim, or visual-equivalence conclusion is accepted from P29. No app, mirror, renderer, or asset change was committed.

## Ruling and next work

P29 is closed as **FAIL / NOT ACCEPTED**. Its evidence remains immutable. Authorize a fresh attempt under [PRE-G7-30](../reconciliation-packets/2026-10-16-pre-g7-30-build-exit-status.md). P30 must first prove that its frozen runner records the real child process exit code and output streams for controlled zero and nonzero child processes. Only after those probes and all source preflights pass may it run each pinned source build once. P30 is a new packet, not a retry of P29. It authorizes measurement-runner changes only; application and mirror sources remain unchanged.

The sixteen renderer-attribution rows remain **NOT RUN**. Physical-device, screen-reader, mobile-soak, chrome://gpu, live-service, domain, deployment, and G7 checks also remain **NOT RUN** under their own protocols. No live deployment has occurred, and G7 remains unaccepted.