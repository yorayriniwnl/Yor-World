# PRE-G7-21 current-source production build

Maker: **local Codex substitute for Gemini #3**, not the external Gemini account. This is maker evidence only; an independent read-only review and parent adjudication remain separate.

## Result

The one authorized current-source production build **PASSed**. The exact `pnpm run build` command exited 0 after 251.967 seconds under Node 24.19.0 and pnpm 9.15.9. Its captured stdout and stderr, command receipt, start/end timestamps, and executable paths are in `build/`. Stderr is empty. The stdout records a successful optimized build with Next.js 16.3.8 (Turbopack), compilation, TypeScript completion, all seven static pages, and the app route summary. It contains no explicit warning or error line.

The fresh worktree began directly at source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, and canonical app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`. The verified authorizing parent packet commit is `a6fd3bf6c245aa7207a6373baf3236e2560c710c`. Evidence is committed separately on branch `codex/pre-g7-21-current-source-build-evidence-20261015`.

## Source and generated output

Tracked state was clean before installation and remained clean after the build. The source commit, source tree, and app tree in the before/after captures agree. The build did not change `app/next-env.d.ts`; its raw SHA-256 and Git blob remain equal to the source commit. `app/package.json`, `app/pnpm-lock.yaml`, `app/next.config.ts`, `app/tsconfig.json`, and the historical `yorayriniwnl.in/source-delivery-manifest.json` also retain their source-commit hashes and blobs.

The archived input documents were copied from the parent worktree and byte-compared against those originals. Markdown CRLF endings were normalized to LF for review; `input-provenance.json` retains each original and normalized byte count and SHA-256.

Next produced ignored build output under `app/.next/`, including a 21-byte `.next/BUILD_ID`. Dependency installation produced ignored `app/node_modules/`. These generated directories are not committed. Only `deliveries/G7/preparation/maker-evidence/pre-g7-21/` is included in the evidence commit. No source, test, configuration, dependency, lockfile, or historical manifest file was edited; no `next-env.d.ts` restoration was needed.

## Setup and carry-forward context

The isolated worktree had no `app/node_modules`, so the packet-authorized `pnpm install --offline --frozen-lockfile` setup ran once and passed with exit 0 in 75.913 seconds. Its raw streams and receipt are in `setup/`. This setup is not a quality-gate result.

The following results are carry-forward context only and were not rerun here: PRE-G7-17's two consecutive default integration passes at 286/286; PRE-G7-19's exact default unit pass at 327/327; and PRE-G7-20's lint and typecheck passes. The parent decisions are archived under `input/` with their provenance.

## Limits

Only the local production-build gate was run. Unit, integration, lint, typecheck, browser, physical-device, performance, provider, database, deployment, and live-production checks were **NOT RUN** in PRE-G7-21. No secrets or production configuration were supplied. This result does not establish G7 acceptance, production readiness, the user's browser GPU state, provider readiness, domain/sender verification, deployment, or live behavior. Work remains local-only.
