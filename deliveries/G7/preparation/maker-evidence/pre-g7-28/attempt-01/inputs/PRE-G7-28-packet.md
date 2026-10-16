# PRE-G7-28 - isolated renderer attribution capture

Date: 2026-10-16
Status: AUTHORIZED, LOCAL ONLY
Maker lane: Runtime / integration. Use the existing local Codex maker substitute if Gemini #3 is unavailable.
Output owner: deliveries/G7/preparation/maker-evidence/pre-g7-28/

## Objective and boundary

Collect the item-level renderer attribution required by PRE-G7-26 and not produced by PRE-G7-27. Measure the exact accepted 500d source and exact PRE-G7-25 donor in independent, clean temporary source copies. This is a new packet, not a continuation or retry of P26 or P27.

This is measurement-only. Do not change committed app or mirror files, authored assets, rendering behavior, thresholds, quality tiers, device capabilities, DPR, production services, deployment, or G7 state. No optimization or acceptance follows from these measurements. Any renderer or asset change needs a later parent packet.

P27 evidence remains immutable at maker commit 42186a2c4339debe944e2ef368e5792b4cf8f6ea. P27's P26 report digest was incorrect as a canonical blob digest; use the corrected binding below. Its aggregate partial-build digests were not reproducible; include an exact aggregation method and generator if reporting aggregates, otherwise omit aggregate claims.

## Frozen inputs

- Accepted source: commit 500d10fa5901be48d4ff877e608d65ba0e271bb9; app tree ba0b709192367e1d12a796618f97801a8fcd5a70; mirror tree 34f7ac0731984e50cbb06cf02039911ba65f59a9.
- P25 donor only: commit 28fb4187445206bcc62e2ef0ae2678e44ac6604b; app tree f68074b41b8d2eea228d7fa964d3db8358a9fea4; mirror tree be03089ce9abae0f487bd829b4f24ddac9bb3dfd.
- P25 attempt-03 report: blob 4c7d90c896d8ce5da152434d6be5fbbeeeca8a72 at parent 9fcf9f29e498f664f2933648b5ce7388772f22fb; 12,996 canonical bytes; SHA-256 06e62728c1db7c70f1f8342d54ad49e59526641533cb9ab3ce733038f379bd3d.
- P26 report, corrected: blob 4a74da52a0c1ec4843ff5731f63e61ca3f67e3bb at parent 9fcf9f29e498f664f2933648b5ce7388772f22fb; 7,140 canonical bytes; SHA-256 6df37d9e2e5cfaf34337c5ffdeed181a853d7e8273f6ed9be1ad2a9c8a12cfe2.
- P26 observer: blob 44c7b223db407671c9a56914517e67d0e07589f9; 18,794 bytes; SHA-256 dc7970702073e91e78243b81ace8b712fcb117e1e30855dedbcbbf3c18da99d9.
- P27 report: blob 1bf9499120ebeac5f26b3a63919b414811109681; 909 bytes; SHA-256 574cd8f14166768480bbf13556b7835359811c3c6ec1096aef4109079b590f95.
- P27 observer: blob 410664947a011b549fffadfe04d1664037c4f554; 20,665 canonical bytes; SHA-256 048ba594d123e4a751bd917ccf12a6202699f4cd9ed291e7b463621b5af74df9.
- P27 harness: blob 04ddb1a6ade006f448807f4aedd50c28668c65f6; 13,323 bytes; SHA-256 f25da2e197042f7033f6afa038fd46e8195d6dfbc4185970f6eb904ed8892209.
- Frozen product, engineering and validation contract hashes from P26: 9a05f7c0485fd46299e96706d3d7c4195eb30b2ae33710b37d67f2763aceff05, 9a382f0c45e50c59862728f88a8ef7af77c1ed814a5c71a9fe4f59baac1e8b4a, and 01d9df1de83cede37a9efbc5ca3cdfe760403404a8b1929029a05067c7551290.

These sizes and SHA-256 values refer to canonical Git blob bytes, not Windows checkout bytes whose line endings may differ. Verify every input with git cat-file. Record both canonical and checkout-byte hashes where they differ.

## Authorized work

1. Create isolated, clean temporary worktrees for the exact accepted and donor commits. Verify full app and mirror trees before applying overlays. Do not work in the shared root checkout. Do not commit temporary instrumentation or build output.

2. Prepare a P28-namespaced observer and Playwright harness under the P28 evidence directory. P27 files are inputs only. Correct measurement-only type errors and accounting defects outside app and mirror source control. Any source-specific overlay may only connect the observer to the existing renderer; it must not alter product behavior. Archive exact overlay diffs.

3. Before any production build, finalize one observer and one harness policy used identically for both sources. Omit deviceScaleFactor and mobile-emulation settings; record actual window.devicePixelRatio and browser capabilities. Do not seed, force, or override capabilities or quality tier. Source-specific differences may consist only of minimal observer-connection overlays. Bind observer, harness and overlays by canonical Git blob ID, byte size and SHA-256.

4. Install from each pinned lockfile using Node 24.19.0 and pnpm 9.15.9. Verify Node before install. Set exactly these task flags for both builds: NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 and NEXT_TELEMETRY_DISABLED=1. Record these, runtime versions, browser versions, renderer strings, and other non-secret environment values. Never print secrets.

5. Before final build snapshot, run TypeScript no-emit checking with the overlays on both source copies and list the Playwright test matrix without launching browsers. Up to three preflight iterations may correct measurement-only code. Log every iteration and its file hashes. If both source copies do not pass within three iterations, stop without a production build and report captures NOT RUN. After preflight passes, freeze and hash all overlays, observer and harness. Do not change them after freeze.

6. Build each source once in production mode with separate output directories and ports. No retry or repair after a build starts. If a source build fails, preserve the failure and do not capture that source. The other source may proceed only with the identical frozen observer and harness; make no edits.

7. Collect exactly sixteen independent rows: accepted root and P25 donor, Chrome and Edge at 1440x900 HIGH, 390x844 MEDIUM, 320x600 MEDIUM, and 844x390 HIGH. Use a fresh context and page per row. Set final viewport before navigation. Leave quality preference AUTO so the unchanged policy derives effective tier from viewport and genuine browser capabilities. Record preference and effective tier. A row is complete only when effective tier matches its matrix tier. Preserve a mismatch as the first result; do not retune or retry. Never call page.setViewportSize after studio loading starts. Use one sequential Playwright invocation per source, workers=1, retries=0, existing 30-second timeout. Do not increase timeouts, filter cases, or add retries.

8. For every row, record route and HOME readiness; preference and effective tier; inclusive main and shadow submissions; visible triangles; WebGL draw calls; multi-draw invocations; object and batch identity; geometry/group; material/program compatibility; draw order; visibility/layers; shadow-caster state; dynamic/exclusion reasons; DPR/capabilities; screenshots; and complete source/output hashes. Keep logical objects, renderer submissions, WebGL calls and multi-draw API invocations distinct.

9. Preserve all first-run failures and partial results. Continue only through enumerated independent cases in the same invocation; never rerun a failed row. If the observer cannot be applied without semantic source changes or a browser process becomes unstable, stop that source and report remaining rows NOT RUN.

10. Run no unrelated application suites. Report build failure, 404, timeout, incomplete row or browser crash without repair or retry. No pixel-parity or visual-equivalence claim is authorized.

## Required evidence and review

The P28 directory must contain concise REPORT.md, command and environment receipts, source bindings, preflight iterations and frozen hashes, per-row JSON and screenshots, Playwright results, observer, harness, source overlay diffs, and an inventory with raw byte counts, SHA-256 and Git blob IDs. Include the inventory-generation script. Any aggregate digest must state ordering, serialization, newline rules and encoding and be independently reproducible; otherwise report individual-file validation only.

Keep all app and asset commits unchanged. Only the P28 evidence directory may be committed and pushed. Verify temporary source worktrees are restored cleanly to exact pins.

A separate read-only reviewer must audit source identity, observer/harness consistency, preflight, row coverage, metric accounting, hashes, failures and restoration. External GPT Plus #2 review is required; label a local Codex substitute. Parent acceptance remains pending.

Physical-device, screen-reader, mobile-soak, live-service, domain, deployment and G7 checks remain NOT RUN unless separately performed under their governing protocols. This packet cannot accept itself.
