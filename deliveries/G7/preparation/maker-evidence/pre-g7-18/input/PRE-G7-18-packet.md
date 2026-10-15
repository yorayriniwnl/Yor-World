# PRE-G7-18 — bounded unit-boundary closeout

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for bounded local unit-test diagnosis, correction if justified, and exact default verification only. No provider, deployment, domain, or production work is authorized.
- **Clarification:** [PRE-G7-17-C1](../reviews/2026-10-15-pre-g7-17-manifest-clarification.md) classifies the root source-delivery manifest as historical PRE-G7-13 provenance, not a current candidate pointer.

## Accepted inputs and candidate boundary

- PRE-G7-15 remains the accepted source baseline: `8becac4ea3e9decc91ca2807e2004a0aa0407105`, app tree `26d4885d4c76233168baaea52c5a33aca1ede594`.
- PRE-G7-17 is an unaccepted candidate: source `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`, evidence head `9c75661bc12d309b0d1fb00d3305179c6f6c3728`.
- The PRE-G7-17 two-consecutive-pass default integration subgate passed 286/286 twice on that source. Its final exact default unit run failed/incomplete on `tests/unit/boundaries.test.ts`; a separate 327/327 run had misrouted focus arguments and is supplemental only.
- PRE-G7-17's source change includes the authorized unit `fileParallelism: false` setting and a coverage-preserving cache. Its boundary test still exceeded 5,000 ms in the final exact default run.

Keep PRE-G7-15 and PRE-G7-17 revisions intact. Create a fresh source branch from exact PRE-G7-17 source commit `fc64a18...`; do not base from its evidence-only commit.

## Owned paths

Own only:

- `app/tests/unit/boundaries.test.ts`, only if profiling establishes a direct implementation bottleneck that can be corrected without changing coverage
- its mirror `yorayriniwnl.in/tests/unit/boundaries.test.ts`
- `deliveries/G7/preparation/maker-evidence/pre-g7-18/`

Do not modify `vitest.config.ts`, integration configuration/tests, package scripts, timeouts, application runtime source, public content, contracts, assets, the accepted source baseline, or `yorayriniwnl.in/source-delivery-manifest.json`. Keep that root manifest byte-identical as historical PRE-G7-13 provenance. The new evidence must bind the exact PRE-G7-18 source commit/app tree and include a current candidate-specific mirror map or parity record for every relevant source/test pair.

## Required work

1. Inspect the exact PRE-G7-17 source, unit receipts, worker samples, and existing boundary-test evidence before editing. Use Node `24.19.0` and pnpm `9.15.9`. Do not rerun suites merely to replace a preserved receipt.
2. Run at most two exact default `pnpm run test:unit` invocations in this packet. Attempt 01 is on the unchanged PRE-G7-17 source. If it passes 327/327, make no source change. If it fails, preserve the exact failure, profile the boundary test and worker/timing behavior, then make at most one coverage-preserving optimization within the owned test path and mirror. Attempt 02, if needed, must be the exact default command on that final source. If attempt 01 fails and no justified correction can be made, stop and report unresolved. No third unit invocation is authorized.
3. A focused boundary run may be used once as supplemental diagnosis after a correction, with the unchanged 5,000 ms timeout. It never substitutes for a full default run. Keep every assertion and the same 117 discovered source paths; preserve import kinds, traversal, client-boundary checks, and thrown errors. Do not add retries, mocks, skips/only markers, coverage exclusions, timeout changes, or test-runner flags.
4. The required unit gate is one exact default `pnpm run test:unit` pass at 327/327 on the final source. The misrouted PRE-G7-17 327/327 run does not count.
5. PRE-G7-17's two integration passes may carry forward only if the final delta is confined to the owned unit-test path and mirror, with no application runtime source, integration test, or integration configuration change. Record the diff-based basis. Any need to change those paths is outside this packet and requires a new parent packet.
6. Run lint and typecheck after a source/test correction. A production build is not required for this test-only scope.
7. Verify exact source/mirror parity, unchanged source-path set and assertion/test declarations, protected hashes, the preserved historical manifest blob, current candidate-specific mirror evidence, source/app trees, test-snapshot bytes, raw outputs, versions, exit codes, and evidence inventory. Commit and push the scoped source change and a separate evidence-only commit; verify exact remote refs. Distinguish old failures and supplemental results from the final default gate.
8. State that the maker and any independent reviewer are local Codex substitutes for Gemini #3 and GPT Plus #2 if those external accounts are unavailable. Auditor remains read-only; parent acceptance is separate.

## Boundaries

This packet does not revise PRE-G7-17's run cap or acceptance result. Its own full-unit cap is two invocations maximum. If the final default suite does not pass, report the gate unresolved; do not retry indefinitely. G7 remains unaccepted. Physical-device checks are outside this packet and remain NOT RUN; the user's Chrome GPU state remains NOT PROVIDED. Continue local-only: no provider configuration, DNS/domain work, deployment, or production-readiness claim.
