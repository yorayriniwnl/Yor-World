# PRE-G7-20 commands and receipts

Candidate source was checked out directly at `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf` in branch `codex/pre-g7-20-lint-typecheck-evidence-20261015`. The canonical application root for every command below is `C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-20\app`.

| Purpose | Exact command | Result |
| --- | --- | --- |
| Dependency setup only; not a quality gate | `pnpm install --offline --frozen-lockfile` | PASS, exit 0, 145.963 s; Node 24.19.0, pnpm 9.15.9. Receipt and raw output are in `setup/`. |
| Lint gate, run once | `pnpm run lint` | PASS, exit 0, 154.390 s; Node 24.19.0, child Node 24.19.0, pnpm 9.15.9. Receipt and raw stdout/stderr are in `lint/`. |
| Typecheck gate, run once | `pnpm run typecheck` | PASS, exit 0, 109.093 s; Node 24.19.0, child Node 24.19.0, pnpm 9.15.9. Receipt and raw stdout/stderr are in `typecheck/`. |
| Evidence inventory generation and strict validation | `node deliveries/G7/preparation/maker-evidence/pre-g7-20/validate-evidence-inventory.cjs --write`, then the same command without `--write` | PASS; verifies every evidence entry's path, size, raw SHA-256, and Git blob, strict JSON/JSONL, source identity, protected package/lock/manifest, both passing receipts, and evidence-only scope. |

The gates were run sequentially by `run-quality-gates.cjs`. It invokes Node 24.19.0 with the cached pnpm 9.15.9 entry point and passes only `run lint` and `run typecheck`, without arguments or flags. The runner saves each command's output separately and continues to the second authorized gate even if the first fails. No other test or quality gate was invoked in PRE-G7-20.

`source-state-before.json`, `source-state-before-gates.json`, and `source-state-after-gates.json` preserve branch and commit identity plus protected-file hashes. The source stayed at the exact packet base; only evidence paths were added.
