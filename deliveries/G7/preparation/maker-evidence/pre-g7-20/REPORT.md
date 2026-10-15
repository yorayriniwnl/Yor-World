# PRE-G7-20 maker report

Maker identity: **local Codex substitute for Gemini #3**, not the external Gemini #3 account. This is maker evidence only; independent review and parent acceptance remain separate.

## Results

Both authorized current-source quality checks passed, each run exactly once from the canonical `app/` directory under Node 24.19.0 and pnpm 9.15.9:

- `pnpm run lint`: **PASS**, exit 0, 154.390 seconds.
- `pnpm run typecheck`: **PASS**, exit 0, 109.093 seconds.

Each command's unmodified stdout and stderr, timestamps, executable paths, resolved child Node version, pnpm version, exit status, and elapsed time are recorded in its separate receipt and raw logs under `lint/` and `typecheck/`. Neither command used filters, retries, timeout overrides, or automatic fixes.

## Source binding and scope

The fresh isolated evidence branch is `codex/pre-g7-20-lint-typecheck-evidence-20261015`, created directly from source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`. Its source tree is `593f72ad5900dcfe8d5de0f0d0b2483dc8149709` and app tree is `0804688e4cdd55960e71a19efc8384d4a2f0d071`. The authorizing parent packet commit is `046d1a806f9860d7c5165ae3edfe91b6d2aed288`.

The before-run, before-gates, and after-gates identity receipts confirm the same branch/commit/trees and an empty tracked app diff. The protected `app/package.json`, `app/pnpm-lock.yaml`, and historical `yorayriniwnl.in/source-delivery-manifest.json` match their base Git blobs and recorded raw hashes. No source, test, configuration, dependency, lockfile, or manifest file changed. Only `deliveries/G7/preparation/maker-evidence/pre-g7-20/` contains candidate changes.

PRE-G7-19's accepted exact default unit result (327/327) and PRE-G7-17's two default integration passes (286/286 each) are carry-forward context only. They were not rerun as part of PRE-G7-20 and are not results of these lint/typecheck commands.

## Scope limits

- Unit and integration suites, build, browser checks, and physical-device/accessibility checks: **NOT RUN** in PRE-G7-20.
- User browser GPU state: **NOT PROVIDED**.
- Provider setup, deployment, DNS/domain work, live verification, and production-readiness: **NOT RUN**.

This packet records only the two current-source quality checks. The maker has not audited or accepted its own output.
