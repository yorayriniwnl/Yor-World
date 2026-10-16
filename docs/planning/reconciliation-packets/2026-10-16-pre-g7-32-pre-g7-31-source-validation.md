# PRE-G7-32 — PRE-G7-31 source validation

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, carrying out the user's direction to handle the repair and its verification
- **Status:** Authorized validation-only packet
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-32/`
- **Parent source gate:** PRE-G7-31 remains unaccepted.

## Frozen source and boundary

Use the pushed PRE-G7-31 source commit `bd01478617b4166866f3f44196c56fc5add94acd`, canonical `app/` tree `3975e40c59a04b8696efa2ca3605eb37a0617165`, and source-commit domain tree `8c34adf791c678a4e9e8bfe90f92426026994e68`. The evidence starting commit is `13c329421fb8e8c16328714f51f6bad6d8f4397d`; its domain tree includes the PRE-G7-31 README and manifest update. Confirm `app/` is unchanged from the exact source tree and all source/test mirror blobs still match before checks.

This packet authorizes verification of the existing PRE-G7-31 candidate only. Do not edit application source, tests, assets, dependencies, thresholds, timeouts, or quality policy. If a check finds a defect, preserve its first result and stop; a correction needs another bounded packet. Keep outputs only in this packet's evidence directory, with domain README and source-delivery-manifest updates allowed after results are final. No merge, deployment, live-domain operation, or G7 state change is authorized.

## Toolchain and setup

Use Node `24.19.0` and pnpm `9.15.9` through the pinned local Node/Corepack launcher. Record executable paths, versions, command receipts, exit codes, and full stdout/stderr. The clean worktree has no `app/node_modules`; run `pnpm install --offline --frozen-lockfile` from `app/` only if dependencies are still absent. Do not modify the lockfile or install globally. If the pinned toolchain, offline dependencies, exact source, mirror, or clean preflight cannot be confirmed, preserve the failed preflight and stop.

## Authorized checks

Run each existing check once, in this order, and preserve its first result:

1. `pnpm run test:unit`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run test:integration` twice consecutively as two separately captured invocations.
5. `pnpm run build`, with `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` set only in the build process so the existing composition diagnostics are included.
6. One unfiltered composition browser run: `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts`. Set `PRE_G7_13_EVIDENCE_MODE=1`, `PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE=1`, `PRE_G7_13_EVIDENCE_DIR` and `PRE_G7_13_EXPECTED_EVIDENCE_DIR` to the same absolute directory under this packet's evidence root. Keep the checked-in test configuration, browser channels, thresholds, and retries unchanged. Preserve all screenshots, projected-anchor snapshots, browser logs, JSON results, and exact environment receipt.
7. One complete performance-suite run from `app/` with Node 24.19.0 and pnpm 9.15.9: `pnpm run test:performance --trace on`. Use port `3220`, `CI` unset, and an absolute `C3_EVIDENCE_DIR` under this packet's `performance/` path. Do not insert a standalone `--`; verify the output shows `playwright test --config playwright.performance.config.ts --trace on`. Keep one worker, zero retries, the checked-in timeouts and thresholds. Preserve raw output, JSON, last-run data, and every trace archive. If the single suite run fails, stop without retry.

Do not set timeout overrides, filters, retries, environment shims, or alter the configurations. The complete performance run is one validation invocation; it does not replace PRE-G7-30's diagnostic record or resolve its previously unresolved intermittent stall unless its own evidence establishes that.

## Review and exit boundary

Return a report listing every authorized check as `PASS | FAIL | NOT RUN`, with exact command, exit code, evidence path, and reason. Bind the build and browser artifacts to source commit `bd01478617b4166866f3f44196c56fc5add94acd`. Include a strict inventory with artifact byte lengths, raw SHA-256 hashes, and committed Git blob IDs. Update the domain README and source-delivery manifest to point to this validation report and exact source; keep the candidate marked unaccepted and undeployed.

This packet does not authorize a source correction, an external reviewer account, acceptance, merge, deployment, physical-device validation, production/provider checks, or G7 completion. The maker does not accept its own result. Independent source/evidence audit, read-only human visual review beside the main reference, and Parent ruling remain separate gates.
