# PRE-G7-16 parent disposition

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Decision:** PRE-G7-16 source is **NOT ACCEPTED**. Its acceptance gates were not met. The bounded PRE-G7-16-C1 evidence-path correction is accepted for its evidence-only scope.

## Exact candidate and evidence

- Source branch: `codex/pre-g7-16-canonical-fixture-20261015`
- Source commit: `f71d1df028f80637abb3e427040f0e0f5085179c`
- Full source tree: `990323fa18d7c34fefdb8fe822b839c76d0e2ee0`
- App tree: `a19c817a7ebfa8962f0b898364ca01e8770e302a`
- Final evidence branch head after PRE-G7-16-C1: `72d159b8e459db39c649d69ad219955ae586395f`
- Final evidence tree: `704ec61f37a03ba778e31707ab122ed77986bfa1`
- Evidence inventory SHA-256: `07e34a48026b284b1f70f2f12fbf78a1e77a516a6f88077faddfa94008eaf3c0`
- Final local and remote evidence heads match; the source branch worktree is clean.

The only application change is `fileParallelism: false` in the integration config and its domain mirror. The 60-second test timeout, 90-second hook timeout, assertions, and default `pnpm run test:integration` command remain unchanged.

## Gate findings

| Requirement | Result |
| --- | --- |
| Focused canonical fixture | PASS, 1/1 in 40.32 seconds |
| Corrected default integration suite | PASS, 286/286 across 27 files, one run |
| Two consecutive post-correction default-suite passes within three total invocations | **NOT MET**. Diagnostic attempts 01 and 02 failed; attempt 03 was the sole post-correction full-suite pass. The packet cap is exhausted. |
| Full unit suite | **FAIL, 326/327**. `tests/unit/boundaries.test.ts` exceeded its unchanged five-second timeout. |
| Focused boundary test | PASS, 18/18 in 15.36 seconds; this does not replace the full-unit result. |
| Lint / typecheck | PASS |
| Source/mirror, protected hashes, test-snapshot bytes | PASS: 116 source and 10 test pairs plus the paired integration configs match; 126 raw checkout hash differences are line-ending conversions; 17/17 protected hashes and 247/247 snapshot files byte-identical to committed blobs. |
| Production build | NOT RUN; the change is integration-test scheduling only. |
| Physical devices, user Chrome GPU, providers, deployment | NOT RUN / NOT PROVIDED under the local-only instruction. |

The two diagnostic attempts and their instrumentation limits remain preserved. The maker did not run a fourth integration suite.

## Independent audit and PRE-G7-16-C1

A local Codex read-only audit substitute, not external GPT Plus #2, checked the exact remote evidence head. The first audit identified three corrupted Windows path references in `COMMANDS.md` and `input/README.md`. PRE-G7-16-C1 corrected them using literal-safe forward-slash paths and updated the inventory. A second local Codex read-only delta audit passed: all referenced paths resolve, all 30 inventory entries match working and committed bytes, all five JSON files parse, `git show --check` passes, and raw receipts, source manifest, source patch, application source and app tree remain unchanged.

This accepts only the scoped documentation/inventory correction under PRE-G7-16-C1. It does not accept the PRE-G7-16 source candidate or waive any test gate.

## Disposition and next boundary

PRE-G7-15 remains the accepted source baseline. Do not promote PRE-G7-16 or replace the locally hosted PRE-G7-15 preview. The G7 status remains **AUTHORIZED / PREPARATION; NOT ACCEPTED**, and work remains local-only.

The PRE-G7-16 two-pass and full-unit gates remain unresolved. No additional full-suite invocation is authorized by this disposition. Any further work to close those gates requires a new explicit parent packet. The user's physical-device results and Chrome GPU/WebGL lines remain outstanding.
