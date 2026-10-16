# PRE-G7-28 parent ruling

Date: 2026-10-16

Disposition: **FAIL / NOT ACCEPTED**

PRE-G7-28 did not produce renderer-attribution captures. The maker evidence is commit `7b1729d52b076b4643017eceec302f4654714f0a` on `codex/pre-g7-28-maker-20261016`. Both one-shot production build commands exited 0, but the pinned Node runtime gate was not met. No retry, rebuild, or browser capture is authorized under P28. All sixteen capture rows remain **NOT RUN**.

## Independent review

A read-only local Codex substitute audit verified commit scope, remote identity, the evidence inventory, frozen inputs and artifacts, preflight receipts, source restoration, and retained build outputs. All 62 inventory entries match raw and committed sizes, SHA-256 values, Git blob IDs, and line-ending counts. All eight canonical input copies match their Git blobs; the identical observer, harness, and config bindings match across both sources. The eight command receipts and streams match. Both source worktrees are clean at their exact pins, and all 537 retained `.next` files per source were checked. This was not external GPT Plus #2; external audit remains **NOT RUN**.

## Findings

The accepted and donor dependency installs, TypeScript preflights, and Playwright `--list` preflights passed. Each list command enumerated eight rows without launching a browser. The build launcher used Node 24.19.0 and pnpm 9.15.9, but did not put the pinned Node directory first on `PATH`. The donor's Next and worker processes were directly observed running system Node 24.14.0. The accepted build used the same unchanged `PATH`; its child runtime was not sampled directly, so the accepted build is also unqualified against the pinned-runtime gate. Both `next build` commands exited 0, but those exits do not satisfy the gate.

The maker preserved both builds, command receipts, the directly observed donor runtime, and the accepted-runtime limitation. The report distinguishes observation from inference. Both source worktrees were restored to the exact accepted 500d and P25 donor commits. No app or mirror changes were committed. The inventory helper's initial failure and correction attempts are preserved and clearly labeled; these packaging attempts did not rerun a build or test.

## Ruling and next work

No renderer-attribution measurement, optimization, threshold change, parity claim, or device-capability conclusion is accepted from P28. P28 is closed as **FAIL / NOT ACCEPTED**; its evidence remains immutable.

Authorize a new, measurement-only attempt under [PRE-G7-29](../reconciliation-packets/2026-10-16-pre-g7-29-runtime-bound-render-attribution.md). P29 must use fresh temporary worktrees at the same source pins, reuse the frozen P28 observer, harness, config, and overlays byte-for-byte, and resolve Node 24.19.0 first on `PATH` for installs, preflights, builds, and captures. It must verify and record the Node executable resolved by the build script and Next workers before using the output. P29 is a new packet, not a retry or continuation of P28. It authorizes no app, asset, rendering, threshold, quality-tier, DPR, service, deployment, or G7-state change.

Physical-device, screen-reader, mobile-soak, `chrome://gpu`, live-service, domain, deployment, and G7 checks remain **NOT RUN** under their respective protocols. No live deployment has occurred, and G7 remains unaccepted.
