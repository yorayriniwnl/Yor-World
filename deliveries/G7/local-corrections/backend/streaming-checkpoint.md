# Streaming and UUID correction checkpoint

Executor: local Codex worker remediation_backend_implementation, under LOCAL-CORRECTIONS-03. Maker checkpoint only; independent audit and Parent acceptance remain pending.

Implemented early actual-byte enforcement for contact (8192) and events (4096), including cancellation without waiting on hostile cancel promises. The reader retains a fixed ceiling-sized buffer; it never stores a list of supplied chunks. Valid oversized Content-Length is rejected before consumption; missing, malformed and understated lengths still undergo actual-byte enforcement. Interrupted/aborted or malformed UTF-8 bodies fail with the existing 400 semantics. Contact keys now require UUIDs and canonicalize case; the form generates RFC UUID v4 using secure randomness, with a clear failure when secure generation is unavailable.

`pnpm --dir app exec vitest run --config vitest.integration.config.ts tests/integration/platform/streamed-body-limits.test.ts tests/integration/platform/contact.test.ts tests/integration/platform/contact-idempotency-r2.test.ts tests/integration/platform/canonical-platform.test.ts` executed: **55/55 PASS**, four files. The new suite contributes 24 cases. The existing embedded PGlite duplicate/concurrent-duplicate/conflicting-payload tests were preserved and executed. PGlite is embedded evidence, not native Supabase or independent database sessions.

Raw initial failure: `attempt-01-streaming/tests.log` (54 PASS, one abort-race FAIL). Corrected rerun: `attempt-02-streaming/tests.log` (55 PASS). Neither log was overwritten. Scoped ESLint exited 0. Combined typecheck initially found two owned test RequestInit type errors (corrected) and an unrelated active UI controller cancellation-reason error; Parent was notified. Final integrated typecheck remains required.

Completed production scope: `app/src/server/http/read-body.ts`, `app/src/server/contact/schema.ts`, `app/src/app/api/contact/route.ts`, `app/src/app/api/events/route.ts`, `app/src/features/contact/contact-form.tsx`, `app/tests/integration/platform/streamed-body-limits.test.ts`. The new forward migration and subsequent media work are separate, unfinished scopes.
