# PRE-G7-29 maker evidence report

**Disposition:** P29 is incomplete and unaccepted. The accepted-root build has useful successful output and pinned-runtime evidence, but its receipt records a null child exit code. Per parent direction, no donor build and no renderer-attribution capture was run. Parent acceptance is pending; external GPT Plus #2 audit is NOT RUN. Work performed by the local Codex maker substitute, not Gemini #3.

## Source and frozen inputs

- Accepted baseline: source `500d10fa5901be48d4ff877e608d65ba0e271bb9`; original app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`; mirror tree `34f7ac0731984e50cbb06cf02039911ba65f59a9`.
- P25 donor: source `28fb4187445206bcc62e2ef0ae2678e44ac6604b`; original app tree `f68074b41b8d2eea228d7fa964d3db8358a9fea4`; mirror tree `be03089ce9abae0f487bd829b4f24ddac9bb3dfd`.
- P28 frozen evidence input: commit `7b1729d52b076b4643017eceec302f4654714f0a`. The canonical Git-object verifier reports PASS for all 11 artifacts and both source bindings. Final pre-build manifest is `attempt-01/frozen-inputs.json` (70 files; SHA-256 `fe4b40a3462082e310557b60ff8f8e1d40e5d0e4cd09d6d38eab66c69607e95a`). No source, mirror, asset, renderer, threshold, quality-tier, DPR, service, or deployment changes were committed.

## Checks and build

| Gate | Result | Evidence |
|---|---|---|
| P28 canonical artifacts/source bindings | PASS, 11/11 artifacts and 2/2 source bindings | `attempt-01/p28-blob-verification.json` |
| Frozen dependency install, accepted and donor | PASS; lockfiles unchanged | `commands/accepted-root-500-install-01.receipt.json`, `commands/p25-donor-28fb-install-01.receipt.json` |
| TypeScript no-emit, accepted and donor | PASS; pinned resolver pass | accepted `typecheck-02` and donor `typecheck-01` receipts under `attempt-01/commands/` |
| Playwright `--list`, accepted and donor | PASS; exactly 8 rows each, no browser launch | `playwright-list-01` receipts under `attempt-01/commands/` |
| Accepted production build | **INDETERMINATE** child exit; do not count as PASS | `commands/accepted-root-500-build-01.receipt.json` |
| P25 donor production build | NOT RUN, by parent stop disposition | no build receipt |
| Renderer attribution captures | NOT RUN; all 16 matrix rows remain NOT RUN | `attempt-01/capture-matrix.json` |

The accepted-root build ran once, from `C:\p29-source-500\app`, with exactly `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and `NEXT_TELEMETRY_DISABLED=1`. Pinned Node was v24.19.0, executable SHA-256 `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`; pnpm was 9.15.9, CLI SHA-256 `98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090`. Resolver receipt PASS has all six probe exit codes zero. The process monitor recorded 14 Node processes, all with the pinned path and executable hash; it observed the build root and reports `completeNodeRuntimeQualification: true`, no monitor error, and unchanged build-time source trees.

Captured stdout is 1,305 bytes, SHA-256 `12c5d0c777b2543ad670cdfb4491fe367da39efc8335c11bc135275918077987`; stderr is empty (SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). The stdout shows Next compiled successfully, TypeScript completed, static pages generated, and the route table. The persisted build receipt has `childExitCode: null`, while the outer wrapper invocation returned 0. That does not establish the child process exit code, so the build gate is formally INDETERMINATE and cannot authorize capture. This was preserved without retry.

The retained `.next` output inventory contains 537 files totaling 101,912,188 bytes, each with raw size, SHA-256 and Git blob ID: `commands/accepted-root-500-build-output-inventory-attempt-02.json` (SHA-256 `5cfa0736ffd65d333eca55b2a92527f7e00ba09cf3a550ab861a927bac343a08`). Its first inventory attempt failed because the original helper attempted `Measure-Object -Property bytes` on ordered dictionaries; the failure is preserved at `commands/accepted-root-500-build-output-inventory-attempt-01.failure.txt`, and the original helper remains unchanged. The corrected attempt inventories the existing output only; it did not rerun the build.

## Capture and remaining checks

The parent directed stopping after the accepted build's null child exit code. No P25 donor build was started, and no Playwright capture invocation was started. The 16 required accepted/donor × Chrome/Edge × viewport rows are each individually recorded as NOT RUN. No render attribution, inclusive-call results, screenshots, pixel-parity result, or visual-equivalence claim exists. Physical-device sessions, screen-reader checks, mobile soak, `chrome://gpu`, live services, domain verification, deployment and G7 checks are NOT RUN.

## Preserved failed attempts and restoration

Earlier P29 failures remain in the attempt directory: invalid first freeze generation; two P28 blob-verifier failures; first accepted typecheck wrapper failure; first runtime-probe failure; and the failed first build-output inventory generator. Each is preserved under its original attempt-specific name. Later valid freeze, verifier, resolver, install and preflight evidence remains alongside them; no failed result was overwritten.

Both temporary source worktrees were restored to their exact pinned commits after the accepted build. Their tracked trees and Git status are clean; the accepted `.next` output and installed dependencies were retained as ignored generated content. Exact per-source trees, status, overlay paths and retained output locations are recorded in `attempt-01/commands/source-worktree-restoration.json`. The source-overlay patches remain archived under `attempt-01/overlays/`; no application or mirror commit was made.
