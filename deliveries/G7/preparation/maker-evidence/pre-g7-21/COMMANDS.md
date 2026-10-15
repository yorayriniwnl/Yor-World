# PRE-G7-21 commands and receipts

The verified authorizing parent commit is `a6fd3bf6c245aa7207a6373baf3236e2560c710c`. A fresh worktree and branch were created directly from the accepted source base `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf` (source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`). Branch: `codex/pre-g7-21-current-source-build-evidence-20261015`.

The pinned executables were Node `24.19.0` and pnpm `9.15.9`. The capture runner invoked the cached pnpm entry point through the pinned Node executable from the canonical `app/` directory. It prepended only the pinned Node directory to `PATH` so pnpm lifecycle subprocesses resolve the same Node version; it added no application configuration or other environment variables. The runner preserves child stdout and stderr as raw bytes and records UTC timestamps, elapsed milliseconds, executable paths, argv, signal, and exit status.

The evidence-local `.gitattributes` requires LF for Markdown, JSON, and runner scripts, and marks raw `.log` files `-text` so Windows `core.autocrlf=true` cannot rewrite the captured streams. The copied input documents were verified byte-for-byte against their parent-worktree originals before only CRLF line endings were normalized to LF; original and normalized sizes and SHA-256 values are recorded in `input-provenance.json`. The inventory records raw SHA-256/size and Git blob separately and verifies the committed blobs.

Source-state receipts likewise distinguish the raw Git object hash of working bytes from each file's actual committed Git blob. For example, the unchanged historical source manifest has raw working-byte SHA-256 `2af6525d70510f4d3074dd95d48d762365f1b038bbac25db010f6da4f6155f06` and committed blob `a4a117eacc9ccecf5584a67c11be034723c143a8`.

| Purpose | Exact command | Outcome |
| --- | --- | --- |
| Dependency setup only, because the fresh worktree had no `app/node_modules/` | `pnpm install --offline --frozen-lockfile` | PASS, exit 0, 75.913 s. Receipt and raw output: `setup/`. |
| Sole authorized quality gate, from canonical `app/` | `pnpm run build` | PASS, exit 0, 251.967 s. Receipt and raw output: `build/`. |

The build started at `2026-10-15T13:43:42.859Z` and finished at `2026-10-15T13:47:54.826Z`. The setup started at `2026-10-15T13:41:56.762Z` and finished at `2026-10-15T13:43:12.675Z`. The receipts contain the exact local worktree path and resolved executable paths.

Source-state captures were made before installation, before build, immediately after build, and after the build review. Strict evidence inventory generation is `node deliveries/G7/preparation/maker-evidence/pre-g7-21/validate-evidence-inventory.cjs --write`; committed-inventory validation is the same command without `--write`. These checks validate evidence/source identity and artifact hashes; they are not additional quality gates.

No other quality suite, lint, typecheck, browser/device, provider, database, or deployment command was run in PRE-G7-21.
