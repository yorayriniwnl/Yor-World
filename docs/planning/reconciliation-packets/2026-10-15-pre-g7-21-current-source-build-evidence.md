# PRE-G7-21 — current-source production build evidence

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for one evidence-only local production build and independent review.
- **Project boundary:** Local-only. No providers, DNS/domain, deployment, or production records.

## Purpose and exact source

PRE-G7-19 and PRE-G7-20 accept scoped unit and source-quality evidence for source commit fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf, source tree 593f72ad5900dcfe8d5de0f0d0b2483dc8149709, and canonical app tree 0804688e4cdd55960e71a19efc8384d4a2f0d071. PRE-G7-17's two default integration passes carry forward on unchanged source.

The project validation specification requires a clean install/build against the exact release candidate. Current-source lint, typecheck, unit, and integration evidence is now available, but a production build has not been archived for this source. This packet binds one build result without changing the accepted app.

Create a fresh isolated worktree directly from source commit fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf, not from an evidence commit. Use Node 24.19.0 and pnpm 9.15.9. Do not create a production environment file or use real secrets. If the build requires unavailable provider configuration, preserve the actual failure.

## Owned path

Own only deliveries/G7/preparation/maker-evidence/pre-g7-21/.

Do not edit app/runtime/test source, configuration, dependencies, lockfiles, accepted packet/ruling/evidence files, or the historical source-delivery manifest. Do not run unit/integration suites, lint, typecheck, E2E, performance, browser/device checks, or provider/database tests in this packet.

## Authorized commands

Install dependencies only as local setup, if required:

- pnpm install --offline --frozen-lockfile

Run this exact quality command once from the canonical app/ root under the pinned runtime:

1. pnpm run build

No extra flags, filters, retries, timeout overrides, environment shims, or source changes are authorized. Stop after the build. If it fails, archive the actual output and exit status, report the gate unresolved, and do not repair source under this packet.

Next may create ignored .next/ build output. Capture tracked state before and after. If the build itself rewrites only app/next-env.d.ts as generated output, record the diff and restore that file exactly to the source commit before committing evidence. Any other tracked change is a scope failure; do not discard unexplained work.

## Required evidence

Return a concise REPORT.md, COMMANDS.md, raw stdout/stderr logs, a machine-readable run receipt, and a strict inventory binding every artifact to its committed Git blob, raw SHA-256, and byte size. Record:

- parent packet commit, base/source commit, source tree and app tree;
- clean worktree and branch identity before and after;
- exact working directory, command, Node/pnpm versions, timestamps, duration and exit code;
- build output summary, warnings/errors, and generated output location;
- confirmation that tracked source/config/dependency files match the source commit;
- PRE-G7-17 integration, PRE-G7-19 unit, and PRE-G7-20 lint/typecheck results as carry-forward context only;
- missing tools or unavailable configuration as NOT RUN or BLOCKED, never fabricated evidence.

Commit and push only the evidence directory on a new descriptive branch. Preserve all earlier branches and results. Verify local and remote commit identities after push.

## Review and acceptance boundary

After the maker pushes, a different read-only reviewer audits the exact commit, source binding, run receipt/logs, strict inventory, and unchanged source state. The reviewer does not edit, rerun, or fix the maker's work; any correction belongs to the maker as a separately committed delta, followed by a delta audit. Parent alone adjudicates this packet.

If local Codex agents substitute for external Gemini #3 maker or GPT Plus #2 reviewer, state that plainly; do not claim those external accounts participated. This packet accepts only a local production-build gate. It does not accept G7, production readiness, physical-device/accessibility behavior, the user's Chrome GPU state, providers, a production domain/sender, deployment, rollback, or any live criterion. Work remains local-only.