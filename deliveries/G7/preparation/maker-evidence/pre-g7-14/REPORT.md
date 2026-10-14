# PRE-G7-14 maker report: exact entrance camera endpoints

## Maker identity and source

This work was performed by a local Codex worker substituting for the assigned runtime maker lane. It was not performed by Gemini #3, GPT Plus #2, or another named external account. The maker returns the change and evidence for independent parent audit; this report does not accept the work.

The isolated worktree is `C:/Users/ayush/COddexxxxxxxxxxxxxxxx/_worktrees/pre-g7-14`, branch `codex/pre-g7-14-maker-endpoints-20261014`. The accepted source base is commit `a3459c158af880319269196f85c0c922ee86c5d6`, whose `app/` tree is `23c7dac82746d7db84632e228efe3224736b9266`. Source commit `8056fece5cd0b8113b81313b6d6a22099163bb27` is pushed. Its resulting `app/` tree is `fb4881289d618612b580ef2c576103f1d3e2112c`.

The production helper now returns the authored hallway vector when clamped progress is exactly zero and the selected desktop/mobile HOME vector when progress is exactly one. Clamping and the existing intermediate doorway interpolation remain unchanged. Unit coverage checks desktop and mobile endpoints and out-of-range clamping. The existing strict settled-camera integration assertion is unchanged.

## Verification

All test commands used Node `24.19.0` and pnpm `9.15.9`. The pinned wrapper was `npx.cmd --yes --package=node@24.19.0 --package=pnpm@9.15.9 --call "node --version && pnpm --version && <command>"`, run with `app/` as the working directory unless the temporary snapshot is stated. Raw stdout/stderr and exit codes are archived under `attempt-01/`.

| Result | Command | Outcome and evidence |
| --- | --- | --- |
| PASS | `pnpm exec vitest run --config vitest.config.ts tests/unit/entrance-coordinator.test.ts` | 1 file, 7 tests passed; exit 0. `attempt-01/focused-unit.log`. |
| PASS | `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts` | 1 file, 5 tests passed, including the unchanged exact endpoint assertion; exit 0. `attempt-01/focused-production-camera-integration.log`. |
| FAIL, then PASS on clean retry | `pnpm run test:integration` | First default run: 285/286 passed and the process exited 1; `tests/integration/platform/canonical-fixture.test.ts` timed out at its existing 60-second limit. The production camera test passed. No timeout was changed. `attempt-01/full-integration.log`. The same default command then passed 27 files / 286 tests in the file-verified temporary snapshot; exit 0. `attempt-01/temp-full-integration.log`. |
| PASS | `pnpm run test:unit` | 26 files / 326 tests passed; exit 0. `attempt-01/full-unit.log`. |
| PASS | `pnpm run lint` | Exit 0. `attempt-01/lint.log`. |
| PASS | `pnpm run typecheck` | Exit 0. `attempt-01/typecheck.log`. |
| FAIL due to verification layout, then PASS in temporary snapshot | `pnpm run build` | The worktree build exited 1 because Next/Turbopack rejects its `app/node_modules` junction pointing outside the project root. No source error was reported. The build passed in the exact tracked-file snapshot after an isolated frozen-lockfile install; exit 0. `attempt-01/production-build.log`, `attempt-01/temp-install.log`, `attempt-01/temp-production-build.log`. |

The temporary verification snapshot copied 247 tracked `app/` files from this worktree and initially had zero hash mismatches. After install, build, and integration, all 247 tracked files still matched their copied source and snapshot hashes. Post-run audit result: PASS, exit 0, zero mismatches; `attempt-01/temp-snapshot-audit.json`. The snapshot and `.pnpm-store` are under the OS temporary directory, outside the repository.

The first full integration timeout is retained as a failure, even though the identical default rerun passed. No timeout, GPU, or renderer policy was changed. The build log records `NEXT_PUBLIC_PRE_G7_13_EVIDENCE_SET=False`; the worktree build limitation is the external dependency junction. The successful build was run in the isolated copy with the exact tracked application files and an isolated dependency install.

## Scope and mirror audit

Only the two authorized source/test files and their two corresponding mirror files are in the source commit. No integration assertion, camera preset, GLB, asset manifest, contract, timeout policy, or GPU policy was edited. The exact source diff is compressed as `source.patch.gz` (compressed SHA-256 `db54015ca1b78c3ac42ac641469656b34b94eef05fcc3ba57d84c515a5b72947`); it decompresses to 4,976 bytes with SHA-256 `8048844e6266117778ef27831698172711108479a8c5c4519a9fd9fae1e0fb40`.

The post-edit scope audit passed: only the four authorized code/test paths changed, the strict integration assertion and intermediate interpolation are unchanged, and all 17 non-owned asset/contract/camera hashes match the pre-edit audit. The production GLB remains 861,364 bytes with SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`. See `post-edit-scope-audit.json` and `post-edit-scope-audit.log`.

The refreshed delivery manifest pairs 116 source files and 10 tests with zero Git-blob parity failures at source commit `8056fece5cd0b8113b81313b6d6a22099163bb27`; the test count includes the new endpoint test. The domain-specific public base URL override remains `https://yorayriniwnl.in`. Its exact path is `yorayriniwnl.in/src/config/public-base-url.ts`: the current Windows working-copy bytes are 172-byte CRLF with SHA-256 `bcd4c0eb4681b707c2a6ead176ec38592693f4c8008390d25cddfe702140e530`; its committed Git blob is 170-byte LF with SHA-256 `415e2f1291d4adcf6d1bf4927668339c332e0ee85be602d97c6b23d269e4b4ca`; CRLF-normalized bytes have that same `415e2f...` hash. This explains the prior manifest's raw working-copy hash and confirms the content and canonical domain were preserved. Mirror regeneration/audit result: PASS, exit 0; `final-mirror-audit.json`.

The source patch commit and the evidence/manifest commit are separate. The source commit was pushed and its remote branch head was verified. No deployment or provider configuration was attempted.

## Packet boundary

This local packet does not address the reported hydration attributes injected by browser extensions, the user's local WebGL context failure, physical-device checks, provider readiness, or deployment. Those remain NOT RUN and unchanged.

## Provenance correction (2026-10-15)

The independent audit found that the delivery manifest pointed `visualCandidateEvidence` at PRE-G7-13 attempt-50. This was superseded. The manifest now points to `deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/composition/`, matching the accepted PRE-G7-13 manifest recorded at final evidence head `498d6e1329ce651a816cd17935af5fa25bf01ba2`.

The manifest's `parentCommit` value `66132297bdcf3f699f07f3e5d5e299ebe558ac2f` was validated and retained. It is the commit that authorizes PRE-G7-14 and contains `docs/planning/reconciliation-packets/2026-10-14-pre-g7-14-production-camera-endpoint.md` (blob `845ba953bd08d6777d1913211d7b10d9a07aac50`). The accepted schema-v1 PRE-G7-13 manifest uses `parentCommit` for the parent authorization lineage (`0a73f307d078cc531f09bbc4ae7a5dfef2eedd01`, which contains the PRE-G7-13 work order); `sourceBaseCommit` separately identifies the accepted app/source base. Here, `sourceBaseCommit` is `a3459c158af880319269196f85c0c922ee86c5d6`, and the implementation commit's Git parent is that same accepted base. Thus `parentCommit` is correct and distinct from the source base.

This correction changes only the delivery manifest pointer and this owned evidence/report. The endpoint implementation and tests remain at source commit `8056fece5cd0b8113b81313b6d6a22099163bb27`; no source or test paths were changed.

## Audit evidence file correction (2026-10-15)

The temporary snapshot audit JSON had a literal backslash-n suffix after its closing brace. I replaced that suffix with a real LF and verified strict JSON parsing and structural equality with the parsed values before correction. The corrected file is 67,037 bytes, SHA-256 `ed9e4c86dfcaa6238d16083e46eef4711dd0755b4033df7a86c0eb37e4c68496`; the validation record is `attempt-01/temp-snapshot-json-validation.json`. Before this correction, a repository search found only a path citation in this report and no checksum inventory reference; this report now records the corrected hash. No other checksum reference required updating.
