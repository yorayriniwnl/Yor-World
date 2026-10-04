# Commands and exits

All source reads/edits and Git identity checks ran in C:\Users\yoray\AppData\Local\Temp\yw-scp-64a4e0ad; test/lint commands ran in its app directory. Dependency installation was performed by parent and reported exit0; this worker did not install dependencies.

| Command | Exit | Evidence |
| --- | --- | --- |
| git rev-parse HEAD HEAD:app | 0 | implementation-identity.json records output |
| node --version; pnpm --version | 0 | v24.19.0;9.15.9 |
| pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/scp-publication-outbox.test.ts tests/integration/platform/database-authorization.test.ts tests/integration/platform/canonical-platform.test.ts tests/integration/platform/contact.test.ts tests/integration/platform/internal-jobs.test.ts --reporter=verbose --reporter=json --outputFile.json=../deliveries/G6/rc3-platform-corrections/workers/security-outbox/evidence/focused-01.json | 0 | evidence/focused-01.log;59 tests |
| Same focused command with focused-02.json output | 0 | evidence/focused-02.log;62 tests |
| pnpm exec eslint src/server/jobs/outbox-worker.ts tests/integration/platform/database-authorization.test.ts tests/integration/platform/scp-publication-outbox.test.ts --max-warnings=0 | 0 | evidence/owned-lint-01.log (empty successful output) |

Read-limit event: attempted app/supabase/migrations/20261002000000_schema_v1.sql was absent. Tests execute the actual named accepted A3/A4 SQL files; schema_v1 is the preserved release binding, not an invented migration file. No files were created at that missing path.

Other source reads included AGENTS.md, START_HERE.md, work orders, correction packet, supplemental report/defects/identity/probes/results, engineering contracts, original integration parent packet, canonical worker/database/contact types/provider/tests and operational SQL. No supplemental evidence was modified.

Follow-up: same focused command with focused-03.json output, exit0 (62tests); same owned ESLint command, owned-lint-02.log, exit0. Parent's original integrated typecheck failed on untyped PGlite results and remains retained by parent.
