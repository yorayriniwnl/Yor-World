# PRE-G7-10 runtime evidence correction R1

This is an append-only correction to the earlier runtime evidence. It preserves the earlier files and records fresh runs against the exact accepted source state. This correction changes no application source or test files.

## Provenance

- Worktree branch: codex/pre-g7-10-runtime-local-codex.
- Evidence checkout HEAD before this correction: 7177be622f33d64cbf7dc8f8a6fac5249aa056a1.
- Source commit under test: c13fde9e408d1ca053f43d7af6f9d9b0382100a8.
- App tree under test: 6b4619222c1f11e34c47a61c238447a30aa37eed.
- Evidence-parent commit required by the correction packet: 7177be622f33d64cbf7dc8f8a6fac5249aa056a1.
- Node: v24.19.0. Project pnpm: 9.15.9.
- OS: Microsoft Windows 11 Home Single Language, version/build 10.0.26300, 64-bit.
- Browser: Playwright Chromium / HeadlessChrome 153.0.8010.12. The supported WebGL renderer identifies ANGLE on Google Vulkan 1.3.0 with SwiftShader Device (Subzero), software rendering. Each scenario used a fresh Playwright browser context with no extensions.

The first isolated-fixture wrapper log records PNPM_VERSION 11.15.1 because that wrapper sampled the global pnpm before changing into the app directory. The test command itself ran with the app as its working directory, where the project packageManager selects pnpm 9.15.9. The later explicit version probe and all subsequent wrappers record 9.15.9. The original raw fixture logs are preserved unchanged.

## Required checks

Each run has a command log with its exact command and provenance, plus separate stdout and stderr files. Exit status is recorded in the command log when the process reached a terminal exit.

| Check | Exact command | Result |
| --- | --- | --- |
| Node version | Pinned node.exe -v | PASS, exit 0; v24.19.0. See node-version.command.log and node-version.stdout.log. |
| pnpm version | pnpm.cmd --version from app | PASS, exit 0; 9.15.9. See pnpm-version.command.log and pnpm-version.stdout.log. |
| OS provenance | powershell.exe -NoProfile -File os-provenance.ps1 | PASS, exit 0; Windows 11 Home Single Language 10.0.26300, 64-bit. See os-version.command.log and os-version.stdout.log. |
| Focused runtime recovery tests | pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts | PASS, exit 0; 13/13 tests. See focused-runtime-unit.*.log. |
| Lint correction rerun | pnpm lint | NOT RUN to completion. It remained live without terminal exit at the five-minute observation cap and was interrupted; see lint.command.log, lint.stdout.log, lint.stderr.log, and lint-interruption.log. The previous maker report records an earlier completed lint invocation as exit 0 (runtime/lint-final.log), but that historical result is not this correction rerun and is not used to turn the interrupted rerun into a PASS. |
| Typecheck | pnpm typecheck | PASS, exit 0. See typecheck.*.log. |
| Full unit suite | pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 --no-file-parallelism --testTimeout=15000 | FAIL, exit 1; 22/23 files and 315/316 tests passed. tests/unit/boundaries.test.ts timed out one test at 15 seconds (reported duration 19.675 seconds). See unit-suite-15s.*.log. |
| Isolated canonical fixture | pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/canonical-fixture.test.ts --testTimeout=120000 | PASS, exit 0; 1/1 test, 34.97 seconds. See canonical-fixture-120s.*.log. |
| Full integration suite | pnpm exec vitest run --config vitest.integration.config.ts --testTimeout=120000 | FAIL, exit 1; 26/27 files and 285/286 tests passed. The canonical fixture test timed out at the configured 120 seconds; Vitest reported 137.165 seconds for that test and 143.41 seconds total. This was the single requested full-suite run after the isolated pass; no further retries were made. See integration-suite-120s.*.log. |
| Production build | pnpm build | PASS, exit 0; Next.js compiled, TypeScript completed, and all 7 static pages generated. See production-build.*.log. |
| Clean-profile development browser replay | Pinned node.exe running correction-r1-development-browser-chain.mjs | PASS, exit 0. Next dev started on 127.0.0.1:3192 and returned HTTP 200. The studio rendered 25 frames; WEBGL_lose_context produced a prevented loss event and accessible fallback, detached the old canvas, and Retry returned to HOME with a connected canvas rendering 16 frames. With --disable-webgl, initial entry displayed the creation-failure fallback and Retry control. See development-browser-chain.*.log and the raw JSON result in development-browser-chain.stdout.log. |
| Production browser recovery | Pinned node.exe running correction-r1-production-browser-chain.mjs | PASS, exit 0. After the production build, next start on 127.0.0.1:3181 returned HTTP 200. The studio rendered 25 frames; a genuine WEBGL_lose_context event showed the accessible fallback and detached the old canvas; Retry returned to HOME with a connected canvas rendering 26 frames. A separate --disable-webgl context showed the initial creation-failure fallback and Retry control. See production-browser-chain.*.log and the raw JSON result in production-browser-chain.stdout.log. |

The dev and production browser command logs, scripts, and raw JSON results all bind the browser observations to source commit c13fde9e408d1ca053f43d7af6f9d9b0382100a8, app tree 6b4619222c1f11e34c47a61c238447a30aa37eed, and evidence parent 7177be622f33d64cbf7dc8f8a6fac5249aa056a1. They record the server command, port, HTTP start result, Chromium version, fresh-profile details, launch flags, and renderer. Supported recovery scenarios reported no page errors. Disabled-WebGL scenarios intentionally log renderer initialization errors while reporting the accessible fallback and retry behavior as passing.

These browser runs use SwiftShader software graphics. Physical-GPU verification and real-device sessions are not represented as completed here.

## Evidence integrity

The two correction browser scripts are named correction-r1-development-browser-chain.mjs and correction-r1-production-browser-chain.mjs in the parent runtime directory. All correction outputs, helper scripts, provenance, and this report are under correction-r1/. SHA256SUMS.txt lists SHA-256 digests for every correction-r1 file except the manifest itself and for both correction browser scripts. Run hash-correction-r1.ps1 -Verify from any working directory in this checkout to verify the manifest.

The generated app/AGENTS.md and app/CLAUDE.md files remain untracked and untouched. This evidence revision stages no paths outside the owned runtime evidence root.

SHA-256 values are calculated from UTF-8 text after normalizing line endings to LF, so the checksum verification remains stable across Windows Git checkout settings.
