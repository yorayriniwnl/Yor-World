# PRE-G7-19 commands and validation

All test commands ran from the isolated worktree's `app/` directory, using Node `24.19.0` and pnpm `9.15.9`, except that the instrumented Vitest worker itself resolved host Node `24.14.0` as explained below. No test timeout, retry, or runner configuration was changed.

| Purpose | Command | Result |
| --- | --- | --- |
| Frozen offline dependency install | `pnpm install --offline --frozen-lockfile` | PASS, exit 0, 47.439 s; receipt and logs in `setup/` |
| One instrumented boundary diagnostic | `pnpm run test:unit -- tests/unit/boundaries.test.ts -t "enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports"` | Invocation exited 0 but was misrouted: Vitest received a literal `--` and ran all 26 files / 327 tests. Supplemental only, not a focused diagnostic or gate. Worker used Node 24.14.0; see `attempt-01/invocation-classification.md`. |
| Restore temporary instrumentation | `node attempt-01/restore-instrumentation.cjs` | PASS; app test and mirror raw bytes restored to the saved base snapshots and Git blobs match. Receipt: `attempt-01/restore-run.json`. |
| Sole exact default unit gate | `pnpm run test:unit` | PASS, exit 0, 327/327 tests and 26/26 files; Node 24.19.0, pnpm 9.15.9; elapsed 15.629 s. Raw logs and receipt in `final-attempt/`. |
| Strict evidence and source validation | `& 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe' deliveries/G7/preparation/maker-evidence/pre-g7-19/validate-evidence-inventory.cjs --write`, then the same command without `--write` | PASS, both final invocations exit 0. The writer generates the inventory; the validator checks strict JSON/JSONL parsing, path presence, raw sizes/SHA-256, Git blob IDs, source identity, mirror parity, source-path hashes, and unchanged manifest. |

The first inventory-preflight run initially returned validation errors because the checker compared the commit and app-tree fields at the wrong object level. I corrected the checker, reran inventory generation, and then reran validation without write mode; both final runs pass. No source file was changed by that checker correction.

The full staged `git diff --cached --check` reports whitespace already present in verbatim evidence: trailing spaces in the instrumentation patch, instrumented source snapshots, copied source snapshots, and copied `START_HERE.md`; extra blank lines at EOF in raw stdout/stderr logs; and the preserved historical `Exit code: ` line. These raw inputs and receipts remain byte-exact. The check passes when limited to the authored `REPORT.md`, `COMMANDS.md`, and validator script; no raw evidence was normalized to silence the full-bundle warning.

The instrumented timing record was: boundary body 773.257 ms; discovery/read 259.740 ms; TypeScript parse 338.303 ms; AST traversal 159.294 ms; import resolution 15.130 ms; module validation 509.838 ms inclusive of nested phases. These phase values overlap and must not be added. The single diagnostic's command forwarding and worker-version issues prevent treating it as a valid focused/pinned run. No replacement diagnostic was run.

No permanent source or test-code change was made. Lint, typecheck, build, and another integration run are **NOT RUN**. The packet's two consecutive PRE-G7-17 default integration passes are carried forward for the unchanged source/app candidate only. Device/accessibility checks are **NOT RUN**; browser GPU state is **NOT PROVIDED**.
