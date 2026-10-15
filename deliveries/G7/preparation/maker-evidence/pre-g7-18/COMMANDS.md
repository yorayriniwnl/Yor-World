# PRE-G7-18 commands and results

Pinned runtime: Node `v24.19.0`; pnpm `9.15.9`. Executables and frozen-install output are recorded under `setup/`.

| Purpose | Command / invocation | Result |
| --- | --- | --- |
| Frozen dependency install | `pnpm install --offline --frozen-lockfile` from `app/` | PASS, exit 0, 61.9 s; the separate PowerShell receipt wrapper then hit an unsupported `[string]::Round` call. The successful install and wrapper error are both preserved in `setup/`. |
| Unit attempt 01 | `pnpm run test:unit` from `app/`, invoked as pinned `node.exe pnpm.cjs run test:unit` | FAIL, 326/327; raw pnpm output ends with exit 1. Wrapper elapsed 229.126 s. The wrapper's `.ExitCode` property was blank and is not represented as a measured code in its receipt. |
| Initial standalone algorithm profile | `node <absolute-path>/attempt-01/boundary-profiler.cjs` from `app/`, with `NODE_PATH=<absolute-path>/app/node_modules` | PASS, exit 0; 8.837 s total. No Vitest invocation. |
| Separated standalone profile | `node <absolute-path>/attempt-01/boundary-profiler-split.cjs` from `app/`, with `NODE_PATH=<absolute-path>/app/node_modules` | PASS, exit 0; final warm pass 0.797 s total. No Vitest invocation. |
| Current source path audit | `node <absolute-path>/deliveries/G7/preparation/maker-evidence/pre-g7-18/source-path-audit.cjs` from `app/` | PASS, 117 paths; exact string-list equality with PRE-G7-17 saved path list. |
| Strict evidence validation | Pinned `node <absolute-worktree>/deliveries/G7/preparation/maker-evidence/pre-g7-18/validate-evidence-inventory.cjs` from `app/ | PASS, 65 inventory entries including the external historical manifest check; all 11 JSON files parsed strictly; zero path/hash/blob errors. |
| Unit attempt 02 | Not invoked | NOT RUN: profiling did not justify a scoped source correction, and the packet directs stopping when no justified correction exists. |
| Focused unit / lint / typecheck / build | Not invoked | NOT RUN: no source correction. |

The profiler probe failures, the first parity-helper API error, and all retained outputs are documented in the adjacent diagnostic history and setup artifacts. No failed setup attempt is reclassified as a test-suite attempt.