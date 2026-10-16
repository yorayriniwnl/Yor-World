# PRE-G7-30 - capture the child build exit status

Date: 2026-10-16

Status: **AUTHORIZED, LOCAL ONLY**

Maker lane: Runtime / integration. Use the existing local Codex maker substitute if Gemini #3 is unavailable.

Output owner: deliveries/G7/preparation/maker-evidence/pre-g7-30/

## Objective and boundary

Produce the renderer-attribution evidence not obtained by P26 through P29, beginning with a build runner whose receipt proves the actual child process exit code. P29 is closed and immutable at maker commit bd72e9544832351de289d5c5a9cbaefed6b836db; its accepted build must not be relaunched or relabeled. P30 is a fresh attempt from the exact accepted 500d source and exact P25 donor pins below.

This is measurement-only. The only editable files are P30 evidence and temporary runner or observer instrumentation in fresh temporary worktrees. Do not change committed application or mirror files, authored assets, rendering behavior, thresholds, quality tiers, device capabilities, DPR, services, deployment, or G7 state. No optimization or acceptance follows automatically from these measurements.

## Frozen inputs

- Accepted source: commit 500d10fa5901be48d4ff877e608d65ba0e271bb9; app tree ba0b709192367e1d12a796618f97801a8fcd5a70; mirror tree 34f7ac0731984e50cbb06cf02039911ba65f59a9.
- P25 donor only: commit 28fb4187445206bcc62e2ef0ae2678e44ac6604b; app tree f68074b41b8d2eea228d7fa964d3db8358a9fea4; mirror tree be03089ce9abae0f487bd829b4f24ddac9bb3dfd.
- P28 canonical observer, harness, configuration, input binding, and source-specific overlays: maker commit 7b1729d52b076b4643017eceec302f4654714f0a. Resolve canonical bytes by Git object and preserve their recorded blob IDs, sizes, and hashes.
- P29 frozen-input manifest and full failure evidence: maker commit bd72e9544832351de289d5c5a9cbaefed6b836db. Bind the P29 attempt and its childExitCode-null receipt into P30. Do not reuse its build output as a P30 build.
- Runtime pins: Node v24.19.0, SHA-256 3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237; pnpm 9.15.9, SHA-256 98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090.

## Authorized work

1. Create fresh, clean temporary worktrees for the exact accepted and donor source commits. Verify the full app and mirror trees before applying the byte-identical P28 measurement overlays. Do not use the shared root checkout. Do not commit temporary instrumentation or build output.

2. Prepare the new P30 build runner under the P30 evidence directory. It must report a numeric child exit code obtained from the actual child process object, preserve stdout and stderr, and keep process-tree monitoring active until the child exits. The receipt must distinguish the child exit from the runner's own exit. Do not infer child success from a zero outer wrapper exit, route output, or a success-looking log.

3. Before any source build, test the exact frozen runner and receipt writer with two controlled child processes: one exits 0 and one exits 23. Verify both receipts record the corresponding numeric exit code and preserve each child's known output streams byte-for-byte. Record commands, environment, process observations, and hashes. These probes must not run Next, install dependencies, launch browsers, or modify source worktrees. If either probe is missing, null, or mismatched, preserve it and stop before source builds. Correct only P30 runner/evidence code before freezing; preserve every failed probe and correction. After freeze, make no edits.

4. For all installs, preflights, builds, and captures, prepend the pinned Node directory to PATH in the same PowerShell process that launches the command. Prove parent-shell and package-script resolution to the exact Node path/version/hash; record all six resolver checks, PATH prefix, tool versions and hashes, and the exact task flags. Use pnpm 9.15.9. The only build task flags are NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 and NEXT_TELEMETRY_DISABLED=1.

5. Install each frozen lockfile. Run TypeScript no-emit and Playwright --list for both sources under the pinned PATH. Each list must contain exactly eight rows and must not launch a browser. Confirm that no preflight changed the canonical P28 observer, harness, config, or overlays. If any resolver, install, or source preflight fails, preserve it and stop before builds.

6. Freeze and hash the runner, runner probes, observer, harness, config, overlays, source bindings, and all other P30 inputs before building. Build the accepted source once, then the donor source once, each with its own output directory and port. Record the actual child exit code and monitor observed Next/worker executables. Every Node process in each build tree must resolve to the pinned executable and hash. If a build exit is nonzero or indeterminate, or any Node process cannot be verified, do not capture that source. Do not retry or repair a build. The other source may proceed only under the same frozen runner, observer, harness, config, overlays, runtime resolver, and task flags.

7. Capture only a source whose build has verified child exit 0 and complete pinned-runtime qualification. Use exactly the P29 matrix for a maximum of sixteen independent rows: accepted root and P25 donor; Chrome and Edge at 1440x900 HIGH, 390x844 MEDIUM, 320x600 MEDIUM, and 844x390 HIGH. Each row uses a fresh context and page. Omit deviceScaleFactor and mobile-emulation settings; set final viewport before navigation; leave quality preference AUTO; record actual window.devicePixelRatio and genuine browser capabilities. Do not resize after studio loading begins. Use one sequential Playwright invocation per qualifying source, workers=1, retries=0, and the existing 30-second timeout. Never rerun a failed row.

8. Preserve the first-run failure and any partial rows. If the observer requires semantic source changes, or a browser process becomes unstable, stop that source and mark remaining rows NOT RUN. Run no unrelated application suites. Do not claim pixel parity or visual equivalence.

9. For each completed row, record route and HOME readiness; preference and effective tier; inclusive main and shadow submissions; visible triangles; WebGL draw calls; multi-draw invocations; object and batch identity; geometry/group; material/program compatibility; draw order; visibility/layers; shadow-caster state; dynamic/exclusion reasons; DPR/capabilities; screenshots; and complete source/output hashes. Keep logical objects, renderer submissions, WebGL calls, and multi-draw API invocations distinct.

## Required evidence and review

The P30 evidence directory must contain a concise report; P29/P28/source bindings; runner and controlled-child probe receipts and streams; resolver, install, and preflight receipts; frozen hashes; build receipts and streams; output inventories; per-row JSON and screenshots where captured; Playwright results; overlay diffs; and restoration evidence. Every inventory row includes raw byte count, SHA-256, and Git blob ID. Any aggregate digest must include an exact reproducible ordering, serialization, newline rule, encoding, and generator; otherwise report only file-by-file validation.

Keep app and asset commits unchanged. Only the P30 evidence directory may be committed and pushed. Verify temporary source worktrees are restored to their exact pins. A separate read-only reviewer audits source identity, frozen artifacts, runner probes, runtime resolution for parent and workers, preflights, row coverage, metrics, hashes, failures, and restoration. External GPT Plus #2 audit is required; label any local Codex substitute. Parent acceptance remains pending.

Physical-device, screen-reader, mobile-soak, chrome://gpu, live-service, domain, deployment, and G7 checks remain NOT RUN unless performed under their governing protocols. This packet cannot accept itself.