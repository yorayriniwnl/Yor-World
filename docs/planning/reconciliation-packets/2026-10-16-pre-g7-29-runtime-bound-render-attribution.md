# PRE-G7-29 - runtime-bound renderer attribution

Date: 2026-10-16

Status: **AUTHORIZED, LOCAL ONLY**

Maker lane: Runtime / integration. Use the existing local Codex maker substitute if Gemini #3 is unavailable.

Output owner: `deliveries/G7/preparation/maker-evidence/pre-g7-29/`

## Objective and boundary

Collect the renderer-attribution evidence not produced by P26, P27, or P28. Use the exact accepted 500d source and exact P25 donor in fresh isolated worktrees. This is a new packet, not a retry or continuation of an earlier packet.

This is measurement-only. Do not change committed app or mirror files, authored assets, rendering behavior, thresholds, quality tiers, device capabilities, DPR, production services, deployment, or G7 state. No optimization or acceptance follows from these measurements. Any renderer or asset change requires a later parent packet.

P28 remains immutable at maker commit `7b1729d52b076b4643017eceec302f4654714f0a` on `codex/pre-g7-28-maker-20261016`; its parent disposition is FAIL / NOT ACCEPTED. Preserve its runtime mismatch and zero-capture record. P29 is a fresh attempt under this packet.

## Frozen inputs

- Accepted source: commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`; app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`; mirror tree `34f7ac0731984e50cbb06cf02039911ba65f59a9`.
- P25 donor only: commit `28fb4187445206bcc62e2ef0ae2678e44ac6604b`; app tree `f68074b41b8d2eea228d7fa964d3db8358a9fea4`; mirror tree `be03089ce9abae0f487bd829b4f24ddac9bb3dfd`.
- P28 evidence commit: `7b1729d52b076b4643017eceec302f4654714f0a`. Use its committed P28 observer `P28RenderAttribution.ts`, harness `p28-render-attribution.spec.ts`, config `p28-render-attribution.config.ts`, and the accepted/donor `WorldRuntime.ts` connection overlays. Resolve each from the exact commit with `git cat-file`; bind canonical Git blob ID, byte size, and SHA-256 in P29. Do not edit them.
- Use P28's committed `inputs/input-binding.json` and the frozen P26/P27 measurement contract it verifies. Record their P28 commit/path bindings in the P29 input manifest; do not substitute checkout copies from another revision.
- P28 launcher pins: Node `v24.19.0`, SHA-256 `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`; pnpm `9.15.9`, SHA-256 `98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090`.

These are canonical Git object bindings. Verify source and artifact bytes from Git objects; record checkout-byte hashes too if line endings differ.

## Authorized work

1. Create fresh, clean temporary worktrees for the exact accepted and donor commits. Verify the full app and mirror trees before applying the byte-identical P28 measurement overlays. Do not work in the shared root checkout. Do not commit temporary instrumentation or build output.

2. Before install, preflight, build, or browser commands, prepend the directory containing the pinned Node 24.19.0 executable to that process's `PATH`. Set `PATH` within the same PowerShell process that launches pnpm or Playwright so child processes inherit it. Record the complete non-secret `PATH` prefix and prove `Get-Command node`, `where.exe node`, and `node --version` resolve first to the pinned executable and report `v24.19.0`. Hash the resolved executable and record the result of invoking it through the package-script environment. Do not start a production build unless this resolver check passes.

3. Install each frozen lockfile with pinned Node 24.19.0 and pnpm 9.15.9. Set exactly these task flags for each build: `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and `NEXT_TELEMETRY_DISABLED=1`. Record them, tool versions and hashes, source identity, and other non-secret environment values. Never print secrets.

4. Run TypeScript no-emit checking and Playwright `--list` for both sources under the same pinned `PATH`. Confirm the list contains exactly eight rows per source and launches no browser. These preflights may not change the frozen observer, harness, config, or overlays. If the Node resolver check or either source preflight fails, stop before building and report captures **NOT RUN**.

5. Freeze and hash all P29 evidence inputs before building. Build each source once in production mode with its own output directory and port. Record the command, parent Node version, and observed Next and worker executable paths and versions. Every Node process in the build tree must resolve to the pinned executable with the pinned hash. If any process resolves elsewhere, cannot be verified, or the build fails, preserve the result and do not retry or capture that source. The other source may proceed only if the same frozen observer, harness, config, overlays, runtime resolver and task flags apply. No edits after the first build starts.

6. Capture only a source whose build and complete Node-runtime qualification pass. Collect exactly sixteen independent rows total: accepted root and P25 donor; Chrome and Edge at 1440x900 HIGH, 390x844 MEDIUM, 320x600 MEDIUM, and 844x390 HIGH. Use a fresh context and page per row. Omit `deviceScaleFactor` and mobile-emulation settings; record actual `window.devicePixelRatio` and browser capabilities. Set the final viewport before navigation. Leave quality preference AUTO so the unchanged policy derives effective tier from viewport and genuine browser capabilities. Record preference and effective tier. A row is complete only when effective tier matches its matrix tier. Preserve a mismatch as the first result; do not retune or retry. Never call `page.setViewportSize` after studio loading starts. Use one sequential Playwright invocation per source, workers=1, retries=0, and the existing 30-second timeout. Do not increase timeouts, filter cases, or add retries.

7. For every captured row, record route and HOME readiness; preference and effective tier; inclusive main and shadow submissions; visible triangles; WebGL draw calls; multi-draw invocations; object and batch identity; geometry/group; material/program compatibility; draw order; visibility/layers; shadow-caster state; dynamic/exclusion reasons; DPR/capabilities; screenshots; and complete source/output hashes. Keep logical objects, renderer submissions, WebGL calls, and multi-draw API invocations distinct.

8. Preserve first-run failures and partial results. Continue only through enumerated independent cases in the same invocation; never rerun a failed row. If the observer cannot be applied without semantic source changes or a browser process becomes unstable, stop that source and mark remaining rows **NOT RUN**. Run no unrelated application suites. Do not claim pixel parity or visual equivalence.

## Required evidence and review

The P29 directory must contain a concise report; command and environment receipts; exact source and P28 input bindings; resolver checks; preflight receipts; frozen hashes; per-row JSON and screenshots where captured; Playwright results; the evidence inventory and generation script; source overlay diffs; build output inventories; and source-worktree restoration results. Every inventory row must include raw byte count, SHA-256, and Git blob ID. If any aggregate digest is reported, state its ordering, serialization, newline rules, and encoding and provide a reproducible generator; otherwise report file-by-file validation only.

Keep app and asset commits unchanged. Only the P29 evidence directory may be committed and pushed. Verify temporary source worktrees are restored to exact pins.

A separate read-only reviewer must audit source identity, frozen artifact consistency, runtime resolution for parent and workers, preflight, row coverage, metrics, hashes, failures, and restoration. External GPT Plus #2 audit is required; label any local Codex substitute. Parent acceptance remains pending.

Physical-device, screen-reader, mobile-soak, live-service, domain, deployment, `chrome://gpu`, and G7 checks remain **NOT RUN** unless performed under their own protocols. This packet cannot accept itself.
