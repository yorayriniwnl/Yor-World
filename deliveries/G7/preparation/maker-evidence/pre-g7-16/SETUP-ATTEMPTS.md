# Setup and invocation receipts

All files referenced below are preserved verbatim in their attempt directories. Toolchain checks resolve Node 24.19.0 and pnpm 9.15.9 from the npx cache. Do not treat setup errors as test results.

- attempt-01/diagnostic-focused.log: attempted pnpm exec before a physical dependency install; Vitest was not found because the junction-backed node_modules was not recognized.
- attempt-01/diagnostic-focused-script.log: attempted integration script before the physical install; Vitest was not found and pnpm reported node_modules missing.
- attempt-01/diagnostic-install.log: pinned pnpm install completed successfully, 404 packages reused and 0 downloaded, in 1m43.1s. Exact store path is in the recorded invocation context and log.
- attempt-01/diagnostic-full-integration.log: first instrumented full integration diagnostic.
- attempt-02/provenance.txt and attempt-02/unintended-full-suite-with-focus-args.log: focused file path was forwarded after the pnpm script separator, but Vitest ran the full 27-file suite. This consumes the second full-suite invocation.
- attempt-03/pre-run-idle-and-snapshot-check.txt: confirms fixture state was idle and the final physical test snapshot file hashes matched before the focused and final integration runs.
- attempt-03/final-process-idle-check.txt: confirms no matching test/lint/typecheck Node process and no held recent fixture lock after validation.

The exact commands and results are summarized in REPORT.md; raw stdout/stderr receipts are not rewritten.

Pinned install command: pnpm install --frozen-lockfile --store-dir=C:\Users\ayush\AppData\Local\Temp\yor-world-pre-g7-14-verify-abd785426b44409489210eb73cbf5dda\.pnpm-store
