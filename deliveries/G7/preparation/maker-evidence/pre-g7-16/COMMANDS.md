# Commands and environments

Toolchain wrapper for each project verification:
npx.cmd --yes --package=node@24.19.0 --package=pnpm@9.15.9 --call "node --version && pnpm --version && <command>"

Physical project snapshot for PRE-G7-16 attempt 03:
C:UsersayushAppDataLocalTempyor-world-pre-g7-16-diagnostic-leanapp

Attempt 01 full diagnostic:
pnpm run test:integration
The required command ran against the temporary snapshot with timing-only instrumentation in the canonical test and fixture helper. See attempt-01/diagnostic-full-integration.log. It is diagnostic, not an uninstrumented clean run.

Attempt 02 unintended full diagnostic:
pnpm run test:integration -- tests/integration/platform/canonical-fixture.test.ts
The intended filter was not honored; all 27 files ran. See attempt-02/provenance.txt and attempt-02/unintended-full-suite-with-focus-args.log. It is diagnostic and includes instrumentation teardown errors.

Attempt 03 focused canonical fixture:
pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/canonical-fixture.test.ts
Receipt: attempt-03/focused-canonical-fixture.log.

Attempt 03 default full integration:
pnpm run test:integration
No filters, retries, or timeout overrides. Receipt: attempt-03/default-integration.log. This is the third and final full-suite invocation under the packet cap.

Attempt 03 full unit suite:
pnpm run test:unit
Receipt: attempt-03/unit-suite.log.

Focused unit classification:
pnpm exec vitest run --config vitest.config.ts tests/unit/boundaries.test.ts
Receipt: attempt-03/focused-boundaries.log.

Lint:
pnpm run lint
Receipt: attempt-03/lint.log.

Typecheck:
pnpm run typecheck
Receipt: attempt-03/typecheck.log.

All commands above were invoked through the pinned wrapper with Node 24.19.0 / pnpm 9.15.9. The raw logs contain the version output, tool output, and appended exit code.
