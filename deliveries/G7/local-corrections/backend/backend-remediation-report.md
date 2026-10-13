# Backend Remediation Delivery Report — LOCAL-CORRECTIONS-03

**Executor**: `remediation_backend_implementation`  
**Role**: Platform / backend maker (Gemini #1 lane)  
**Status**: Implementation & regression verification complete; pending independent audit (GPT Plus #2) and Parent acceptance (GPT Plus #1).  
**Worktree**: `C:\Users\yoray\Projects\Yor-World-Local-Corrections`  
**Branch**: `fix/local-studio-check`  
**Release**: `v1.0.0-rc6`

---

## 1. Audit Finding → Implemented Fix → Test/Evidence Mapping

| Finding / Scope | Implemented Fix | Verification Suite & Evidence |
| :--- | :--- | :--- |
| **Finding 1: Request Limits & Unbounded Buffering**<br>Unbounded full-body buffering in contact and event ingestion endpoints risked memory exhaustion and resource starvation. | `app/src/server/http/read-body.ts`: Streamed byte reader consuming chunks with strict byte ceilings (8 KiB contact, 4 KiB events). Aborts reading stream and cancels controller promptly upon exceeding byte ceiling. Rejects oversized Content-Length early while strictly verifying actual bytes when Content-Length is missing or misleading. | `app/tests/integration/platform/streamed-body-limits.test.ts` (22/22 PASS)<br>Log: `deliveries/G7/local-corrections/backend/attempt-02-streaming/tests.log` |
| **Finding 2: Contact Idempotency Key Format**<br>Frozen contract requires standard RFC UUID format; non-UUID keys allowed unbounded or inconsistent format variations. | `app/src/server/contact/schema.ts`: Added regex validation enforcing RFC 4122 UUID format (case-insensitive, canonicalized to lowercase).<br>`app/src/features/contact/contact-form.tsx`: Updated form client to generate RFC UUID v4 via `crypto.randomUUID()` with fallback. | `app/tests/integration/platform/contact-idempotency-r2.test.ts` (11/11 PASS)<br>`app/tests/integration/platform/contact.test.ts` (13/13 PASS) |
| **Finding 3: Native JWT Identity Handling & Database Compatibility**<br>Native Supabase exposes JWT claims as JSON in `request.jwt.claims`. Legacy non-JSON `request.jwt.claim.sub` masked missing/invalid JSON claims. Malformed UUIDs were not rejected cleanly. | `app/supabase/migrations/20261009000000_owner_identity_media_integrity.sql`: Forward migration preserving all 3 historical migrations. Re-implements `auth.jwt()` and `auth.uid()` resolving JSON claims from `request.jwt.claims` only; rejects non-UUID `sub` format; preserves `SECURITY INVOKER` and `STABLE` attributes on standard auth helper routines. | `app/tests/integration/platform/schema-v3-identity.test.ts` (22/22 PASS)<br>Log: `deliveries/G7/local-corrections/backend/attempt-03-schema/tests.log` |
| **Finding 4: Media Integrity, Storage Availability & Race Conditions**<br>Media publication and rollback lacked pre-flight object availability and SHA-256 byte validation against storage; operations were unbounded; publication/approval races could lead to partial inconsistent states. | `app/src/server/media/integrity.ts`: `boundedMediaOperation` with AbortSignal, streaming SHA-256 download and byte verification via `verifyStoredMedia`, `MediaStorageUnavailableError` (503).<br>`app/src/server/media/manifest.ts`: `checkMediaApproved` locks media rows `FOR SHARE` and verifies stored object presence & SHA-256 before publication or rollback.<br>`app/src/server/media/validate-upload.ts`: Unique non-reused draft object keys, orphan cleanup on insert failure, transactional approval with `pg_advisory_xact_lock` and pre-approval byte verification.<br>`20261009000000_owner_identity_media_integrity.sql`: Added `storage_bucket` & `integrity_verified_at` columns, and `guard_media_integrity()` trigger protecting retained publication media object identity and preventing deletion. | `app/tests/integration/platform/media-integrity.test.ts` (10/10 PASS)<br>`app/tests/integration/platform/published-media.test.ts` (4/4 PASS)<br>`app/tests/integration/platform/canonical-platform.test.ts` (9/9 PASS)<br>Log: `deliveries/G7/local-corrections/backend/attempt-04-media-integrity/tests.log` |

---

## 2. Test Execution & Evidence Register

### Command Execution Summary

1. **Combined Backend Regression Suite**
   - Command: `pnpm --dir app exec vitest run --config vitest.integration.config.ts tests/integration/platform/media-integrity.test.ts tests/integration/platform/schema-v3-identity.test.ts tests/integration/platform/streamed-body-limits.test.ts tests/integration/platform/contact.test.ts tests/integration/platform/contact-idempotency-r2.test.ts tests/integration/platform/published-media.test.ts tests/integration/platform/canonical-platform.test.ts`
   - Result: **7 test files passed, 91/91 tests PASS** (Exit Code: 0)
   - Log: `deliveries/G7/local-corrections/backend/attempt-04-media-integrity/tests.log`

2. **Full Application Integration Test Suite**
   - Command: `pnpm --dir app test:integration`
   - Result: **30 test files passed, 340/340 tests PASS** (Exit Code: 0)

3. **Full Application Unit Test Suite**
   - Command: `pnpm --dir app test:unit`
   - Result: **25 test files passed, 345/345 tests PASS** (Exit Code: 0)

4. **Static Analysis & Linting**
   - Command: `pnpm --dir app lint` (`eslint . --max-warnings=0`)
   - Result: **PASS** (Exit Code: 0, 0 errors, 0 warnings)
   - Command: `pnpm --dir app typecheck` (`tsc --noEmit`)
   - Result: **PASS** (Exit Code: 0)

5. **Native PostgreSQL / Hosted Supabase Verification**
   - Status: **NOT RUN** (Embedded PGlite verification passed 100%. Live hosted Supabase credentials / network endpoints are reserved for hosted CI/staging environment).

---

## 3. Migration & Schema Details

- **Forward Migration File**: `app/supabase/migrations/20261009000000_owner_identity_media_integrity.sql`
- **Candidate Schema Revision**: `schema_v3`
- **Historical Migration Invariant**: All three prior migrations (`20261001000000_a3_owner_auth_rls.sql`, `20261001000001_a4_publication_media.sql`, `20261005000000_github_refresh_state.sql`) remain completely unmodified.
- **Trigger & Function Specifications**:
  - `auth.jwt()`: Evaluates `nullif(current_setting('request.jwt.claims', true), '')::jsonb`. If invalid JSON or null, returns empty `jsonb`.
  - `auth.uid()`: Extracts `sub` claim from `auth.jwt()`. Verifies UUID syntax via regex `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`. Returns `uuid` if valid, `NULL` otherwise.
  - `public.guard_media_integrity()`: Trigger on `BEFORE UPDATE OR DELETE ON public.media_assets`. Enforces that retained publication media (`approval_status = 'approved'`) cannot be deleted, and that its core storage coordinates (`object_key`, `hash`, `mime`, `bytes`, `storage_bucket`) cannot be altered.

---

## 4. Remaining Provider & Database Limitations

1. **Embedded vs Native Multi-Session Concurrency**:
   - PGlite operates within the single-threaded Node.js V8 process. While statement-level advisory locks (`pg_advisory_xact_lock`) and `FOR UPDATE` / `FOR SHARE` clauses parse and execute without error in PGlite, true multi-connection race serialization must be verified on native PostgreSQL instances during hosted staging.
2. **Supabase Storage HTTP Streaming Mock**:
   - In unit/integration test suites, Supabase Storage calls are exercised via mocked `@supabase/storage-js` client responses returning `ReadableStream<Uint8Array>`. Live production verification requires active Supabase S3/Storage API endpoints.
3. **No Unilateral Promotion**:
   - In adherence with the Governance Pipeline, this maker report constitutes implementation proof and regression evidence. Final sign-off requires independent audit by GPT Plus #2 and Parent acceptance by GPT Plus #1.

---

## 5. Current backend regression checkpoint — attempt 11 (2026-10-11)

This section supersedes the older 91/91 combined-suite count above as the latest recorded backend regression run. Earlier attempts and their logs remain historical evidence and were not overwritten.

- **Actual executor**: `remediation_backend_implementation`, a local Codex worker in the assigned platform/backend lane. No Gemini account executed this work; “Gemini #1 lane” identifies the allocation only.
- **Source identity**: branch `fix/local-studio-check`, commit `a599a159bef3935a278a18e2d42877438d664c78` (`fix: verify backend media and identity contracts`). This backend slice was committed and pushed by Parent.
- **Exact command**: `pnpm --dir app exec vitest run --config vitest.integration.config.ts tests/integration/platform/streamed-body-limits.test.ts tests/integration/platform/contact.test.ts tests/integration/platform/contact-idempotency-r2.test.ts tests/integration/platform/schema-v3-identity.test.ts tests/integration/platform/media-integrity.test.ts tests/integration/platform/media-fail-closed.test.ts tests/integration/platform/published-media.test.ts tests/integration/platform/media-access.test.ts tests/integration/platform/residual-media-still-images.test.ts tests/integration/platform/scp-publication-outbox.test.ts tests/integration/platform/database-authorization.test.ts tests/integration/platform/scp-media-validation.test.ts`
- **Observed result**: exit code 0; 12 test files passed, 210/210 tests passed. The captured run is `deliveries/G7/local-corrections/backend/attempt-11-backend-regression-20261011T165000Z/` (`command.txt`, `exit-code.txt`, `tests.log`).
- **Provider content-type checks in this run**: `media-integrity.test.ts` exercises observed provider `content-type`, rejects `image/jpeg` and missing type even when bytes/hash match, and accepts the exact PNG MIME with a charset parameter alongside the expected bucket, key, byte length and SHA-256. These are installed-SDK-shaped test responses, not hosted provider evidence.
- **Current evidence limits**: this suite uses the repository's embedded database and mocked/test provider responses. Native PostgreSQL/Supabase concurrency and hosted storage operations remain **NOT RUN**. No production writes or service provisioning were performed.
- **Typecheck history**: the latest saved typecheck log available beside attempt 10 is an exit-2 full-app run with seven diagnostics in the runtime-owned `app/src/features/world/ConstantMaterialBatch.ts`; that cross-lane failure is recorded at `deliveries/G7/local-corrections/backend/attempt-10-content-type-20261011T164500Z/typecheck.log`. It does not establish a current backend-only typecheck result, and attempt 11 did not rerun typecheck.
- **Governance**: this checkpoint records test evidence only. Independent audit and Parent acceptance remain pending; schema-v3 remains a candidate release binding.

## 6. Release-tool and final asset-binding checkpoint — 2026-10-11

These checks cover the assigned guards and exact release bindings. They do not constitute a frozen R7 candidate or acceptance.

- **Source identity**: `fix/local-studio-check` at `a599a159bef3935a278a18e2d42877438d664c78`; Node `v24.19.0`, pnpm `9.15.9`, Vitest `5.0.2`.
- **Final raw manifest identities**: `app/public/asset-manifest.json` SHA-256 `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`; `deliveries/production-environment/revisions/local-corrections-r1/manifest.json` SHA-256 `438026ef73e844f777b5a0aff4237251ce82a82294ce51c53201a82692eb9a3a`. The policy pins these raw bytes and requires both manifests to agree on revision, schema, headers and all nine groups.
- **Candidate state**: six groups remain `approved: false` / `status: candidate`; release policy binds their logical IDs, versioned URLs, hashes, byte counts and metadata. The policy accounts for all 27 versioned public GLBs as six current candidates and 21 retained historical files. The cache allowlist and test match all 36 actual public GLBs, including the nine root model files.
- **Release regression**: `node --test scripts/release/tests/assemble-evidence.test.mjs scripts/release/tests/reserve-attempt.test.mjs scripts/release/tests/current-status.test.mjs scripts/release/tests/status-check.test.mjs scripts/release/tests/immutable-output.test.mjs scripts/release/tests/policy-output.test.mjs scripts/release/tests/schema-migration-inventory.test.mjs scripts/release/tests/asset-manifest-validation.test.mjs` — 107/107 passed, exit 0. Log: `deliveries/G7/local-corrections/release-tools/attempt-11-final-asset-bindings-20261011/release-regression.log`.
- **Contract and immutable-cache regression**: from `app/`, `pnpm exec vitest run --config vitest.config.ts tests/unit/contracts.test.ts tests/unit/cache-policy.test.ts` — 2 files, 58/58 passed, exit 0. Log: `deliveries/G7/local-corrections/release-tools/attempt-11-final-asset-bindings-20261011/app-cache-contract.log`.
- **Release helper syntax**: `node --check scripts/release/release-lib.mjs` — exit 0. Log: `deliveries/G7/local-corrections/release-tools/attempt-11-final-asset-bindings-20261011/release-lib-syntax.log`. The scoped tracked diff also passed `git diff --check`; commands, versions and output paths are recorded in that attempt directory.
- **NOT RUN**: final R7 composition, production build, fresh-checkout/bundle generation, browser or live probes, hosted CI, production deployment, native PostgreSQL/Supabase, and real hosted storage/provider verification. No R7 writer was invoked. Embedded database and test-provider evidence must not be described as hosted/live proof.
- **Governance**: release candidate assets and schema remain pending independent review and Parent acceptance. This maker has not self-accepted the backend, asset revision or release candidate.

## 7. Exact public R1 inventory and cache checkpoint — attempt 15 (2026-10-11)

This checkpoint supersedes the public-asset and cache counts in section 6. Section 6 remains intact as historical evidence. The current manifests and all six active versioned URLs were read from the shared worktree after art's attempt-10 move.

- **Executor and source identity**: local Codex worker in the assigned backend/release lane; branch `fix/local-studio-check`, base commit `a599a159bef3935a278a18e2d42877438d664c78`. Tests ran against the shared, uncommitted worktree; this follow-on did not commit or push.
- **Current asset state**: 15 public GLBs total (nine root files and six versioned R1 files). The six versioned paths are exactly the six URLs in the public manifest; policy has 6 candidate assets and 0 retained public candidates. Five R1 entries are changed candidates and `fixture-production` is the carried-forward candidate. The 21 historical alternatives remain in `deliveries/production-environment/revisions/local-corrections-r1/evidence/retained-public-alternates-attempt-10/`, outside the application bundle input set. Art's inventory records all 21 moves byte-identically (14,496,876 bytes), and its raw SHA-256 is `fb7130e887ab732eba76c82751de3af150030b72f14b90c573e416790af11b21`.
- **Manifest identities**: `app/public/asset-manifest.json` remains SHA-256 `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`; `deliveries/production-environment/revisions/local-corrections-r1/manifest.json` remains SHA-256 `438026ef73e844f777b5a0aff4237251ce82a82294ce51c53201a82692eb9a3a`.
- **Changed owned paths**: `app/src/security/policy.ts` now freezes only the 15 actual public GLBs; `app/tests/unit/cache-policy.test.ts` checks the versioned cache paths equal the manifest R1 URLs; `scripts/release/rc6-policy.json` has no retained public candidates; `scripts/release/release-lib.mjs` compares the public R1 inventory with both policy and manifest references; `scripts/release/tests/asset-manifest-validation.test.mjs` covers exact inventory, orphan rejection and exclusion of archived alternatives from bundle inputs. This report was updated with the checkpoint.
- **Release regression command**: `node --test scripts/release/tests/assemble-evidence.test.mjs scripts/release/tests/reserve-attempt.test.mjs scripts/release/tests/current-status.test.mjs scripts/release/tests/status-check.test.mjs scripts/release/tests/immutable-output.test.mjs scripts/release/tests/policy-output.test.mjs scripts/release/tests/schema-migration-inventory.test.mjs scripts/release/tests/asset-manifest-validation.test.mjs` — **109/109 passed**, exit 0.
- **App contract/cache command**: from `app/`, `pnpm exec vitest run --config vitest.config.ts tests/unit/contracts.test.ts tests/unit/cache-policy.test.ts` — **2 files, 59/59 passed**, exit 0. Runtime: Node `v24.19.0`, pnpm `9.15.9`, Vitest `5.0.2`.
- **Other checks**: `node --check scripts/release/release-lib.mjs` passed; scoped `git diff --check` passed; both untracked test files returned no diagnostics from `git diff --no-index --check` against `NUL`.
- **Raw evidence**: preflight and commands are in `deliveries/G7/local-corrections/release-tools/attempt-15-six-public-assets-20261011/`; test logs are `release-regression.log` and `app-contract-cache.log`, with exit codes in adjacent files. Attempt 14's malformed Windows URL collector output and explanation are preserved separately in `attempt-14-six-public-assets-20261011/`; no tests ran in that attempt. A root-level Vitest version probe also returned `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`; the app-scoped probe and the passing test log establish the actual Vitest version.
- **NOT RUN**: no R7 writer, bundle generation, production build, shared Next server, browser/live probe, hosted CI, deployment, native PostgreSQL/Supabase or real storage-provider check ran in this checkpoint. Archived-file exclusion is checked through the release bundle input selector; no release bundle was generated.
- **Governance**: this is maker evidence, not an audit or acceptance. Independent review and Parent acceptance remain pending.

## 8. Current-source backend recheck — attempt 15 (2026-10-12)

This recheck is current-source evidence only; it does not replace historical native attempt logs or prove hosted provider behavior.

- **Source**: `fix/local-studio-check` at `3f0b47c78b3322f1d2be3d048620bd86e4b32f0f`. Assigned backend source paths have no worktree changes.
- **PASS** — `pnpm exec vitest run --config vitest.integration.config.ts` plus the 12 explicitly listed integration files in `attempt-15-current-source-20261012/commands.txt`: 12 files, 210/210 tests, exit 0. Raw output is in `backend-integration.log`.
- **PASS** — all four schema-v3 migration files match the exact policy bytes and SHA-256 values; see `schema-migration-inventory.txt`. The isolated release migration regression also passed.
- **NOT RUN** — native PostgreSQL on loopback port 54329; no listener/process was present. No service was provisioned. Historical attempt-06 native PASS is not current-source proof.
- **NOT RUN** — hosted Supabase/Auth/PostgREST/Storage, external provider verification, production writes, shared build, R7 driver, browser/live probes. No acceptance claim is made.
