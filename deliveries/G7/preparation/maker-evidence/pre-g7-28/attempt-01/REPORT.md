# PRE-G7-28 attempt 01

Status: **FAIL / NONCONFORMING; all 16 runtime capture rows NOT RUN**

This one-shot measurement attempt produced two successful `next build` command exits, but the build gate did not satisfy the pinned Node runtime requirement. The pinned Node 24.19.0 executable launched pnpm 9.15.9; `pnpm run build` then spawned bare `node` through PATH. During the donor build, Next and worker processes resolved to `C:\Program Files\nodejs\node.exe` v24.14.0. The accepted build used the same unchanged PATH, but its child runtime was not sampled directly. The parent ruling classifies both builds as nonconforming; neither may be retried. No browser capture followed.

## Results

| Gate | Accepted 500d | P25 donor 28fb |
|---|---|---|
| Frozen dependency install | PASS, exit 0 | PASS, exit 0 |
| TypeScript no-emit preflight | PASS, iteration 1 | PASS, iteration 1 |
| Playwright `--list` preflight | PASS, 8 rows enumerated; no browser launched | PASS, 8 rows enumerated; no browser launched |
| Production build command | Exit 0; runtime gate FAIL by parent disposition | Exit 0; runtime gate FAIL (v24.14.0 directly observed) |
| Browser capture rows | NOT RUN (8) | NOT RUN (8) |

Both builds received `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and `NEXT_TELEMETRY_DISABLED=1`. Their command receipts bind launcher Node v24.19.0 and pnpm 9.15.9. The donor build directly showed system Node v24.14.0 in Next and worker processes. The accepted child runtime was not directly captured; its PATH was unchanged from the donor invocation. The complete runtime qualification and parent ruling are in [build-runtime-disposition.json](commands/build-runtime-disposition.json). The successful one-shot build outputs remain in the two isolated source worktrees and are inventoried file-by-file: 537 files each (accepted: 101,887,511 bytes; donor: 101,807,447 bytes). They are preserved as local diagnostics and are not committed.

## Source and observer binding

Accepted source: commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, base app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`, base mirror tree `34f7ac0731984e50cbb06cf02039911ba65f59a9`. P25 donor: commit `28fb4187445206bcc62e2ef0ae2678e44ac6604b`, base app tree `f68074b41b8d2eea228d7fa964d3db8358a9fea4`, base mirror tree `be03089ce9abae0f487bd829b4f24ddac9bb3dfd`.

Observer, harness spec/config, source overlay diffs, path-filtered blob IDs, candidate temporary trees, and the preflight freeze point are bound in [frozen-artifact-bindings.json](frozen-artifact-bindings.json). The only tracked temporary source change was the observer import/install call in `WorldRuntime.ts`; all other P28 files in the source worktrees were measurement overlays. The observer and harness were identical across both sources and were not changed after preflight. No app or mirror commit was created.

The custom harness created no browser context. Both Playwright `--list` commands only enumerated eight test rows per source. Therefore all 16 planned rows are **NOT RUN**, item attribution and inclusive call numbers remain unavailable, and no screenshot or visual-parity claim is made. See the [row-by-row matrix](capture-matrix.json) and [Playwright disposition](commands/playwright-results.json).

## Preserved evidence corrections

The first supporting `.next` inventory helper failed because `Measure-Object` could not read the ordered-dictionary `bytes` key; its script and captured error are preserved. A second helper wrote file hashes with an incorrect build-receipt link; those initial JSON files are preserved. The third helper generated the current inventories from unchanged `.next` directories with correct receipt links. These are evidence-packaging attempts only; no build or test was rerun.

## Cleanup and review

The temporary source copies were restored to their exact pinned commits after preserving the ignored `.next` outputs. Both source worktrees have clean tracked/untracked status. The accepted and donor restoration details, trees, and retained output counts are in [source-worktree-restoration.json](source-worktree-restoration.json). The temporary P28 observer, harness, config and runtime connection were removed. P28 evidence is committed separately from source; this is a local Codex maker-substitute result, not Gemini #3. External GPT Plus #2 audit is **NOT RUN**; parent acceptance is **PENDING**. Physical-device, screen-reader, mobile-soak, live-service, deployment, and `chrome://gpu` checks are **NOT RUN**. This result does not accept itself.
