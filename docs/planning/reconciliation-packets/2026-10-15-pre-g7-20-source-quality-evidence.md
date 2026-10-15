# PRE-G7-20 — current-source lint and typecheck evidence

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for one evidence-only run of each named local quality command and independent review.
- **Project boundary:** Local-only. No provider, DNS/domain, deployment, or production-readiness work.

## Purpose and exact source

PRE-G7-19 accepts the exact current source for the scoped unit gate: source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, and app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`. Its default unit run passed 327/327; PRE-G7-17's two default integration passes carry forward on this unchanged source.

The current source differs from PRE-G7-15 only in the boundary unit test and Vitest configuration files, including their documented mirror copies. PRE-G7-15's lint/typecheck results predate those test/config changes. PRE-G7-19 did not rerun lint or typecheck. The parent has since run both commands once at the pinned versions and observed exit 0, but those chat-only results are not maker evidence. This packet obtains an independently reproducible, source-bound record without changing accepted source.

Create an isolated evidence branch/worktree directly from source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, not from an evidence commit. The PRE-G7-19 evidence branch and all accepted revisions remain immutable. Use Node `24.19.0` and pnpm `9.15.9`.

## Owned path

Own only `deliveries/G7/preparation/maker-evidence/pre-g7-20/`.

Do not edit app/runtime/test source, Vitest configuration, mirrors, dependencies, lockfiles, timeouts, accepted packet/ruling/evidence files, or the historical source-delivery manifest. Do not rerun the unit or integration suites, production build, or browser/device checks in this packet.

## Authorized commands and run cap

Run each exact command once, from the canonical `app/` root, under the pinned runtime:

1. `pnpm run lint`
2. `pnpm run typecheck`

Do not add filters, flags, retries, timeouts, automatic fixes, or source changes. Stop after both commands. If either fails, archive its actual output and exit status, report the gate unresolved, and do not repair the source under this packet.

## Required evidence

Return a concise `REPORT.md`, `COMMANDS.md`, separate raw stdout/stderr logs for each command, and a strict machine-readable inventory binding every artifact to its committed Git blob, raw SHA-256, and byte size. Record:

- parent packet commit, base/source commit, source tree and app tree;
- clean worktree and branch identity before and after the runs;
- exact working directory, command, Node/pnpm versions, timestamps and exit codes;
- confirmation that no source/config/dependency file changed;
- prior accepted unit/integration results as carry-forward context only, clearly distinct from this packet's two checks;
- missing tools, if any, as `NOT RUN` rather than fabricated evidence.

Commit and push only the evidence directory on a new descriptive evidence branch. Preserve all earlier branches and results. Verify the final local and remote commit identities.

## Review and acceptance boundary

After the maker pushes, a different read-only reviewer audits the exact commit, source binding, logs, strict inventory, versions, and unchanged source state. The reviewer does not edit or rerun/fix the maker's work; any correction belongs to the maker as a separately committed delta, followed by a delta audit. Parent alone adjudicates this packet.

If local Codex agents substitute for the external Gemini #3 maker or GPT Plus #2 reviewer, state that plainly; do not claim those external accounts participated. This packet can establish only the current-source lint/typecheck gate. It does not accept G7, a production build, physical-device/accessibility behavior, a user's Chrome GPU state, providers, a production domain/sender, deployment, rollback, or any live criterion. The instruction remains local-only.
